/**
 * Motor compartido de las migraciones de contenido "por reemplazo" (ver
 * MIGRATIONS.md #9 y #10 de "Migraciones de contenido"). Cada script solo
 * declara su plan; esto lo ejecuta con las mismas garantías:
 *
 * - Por defecto solo muestra el plan; escribe únicamente con --apply.
 * - Cada reemplazo exige encontrar el texto viejo exacto: si no está (alguien
 *   ya lo editó desde el panel), se informa y se salta, nunca se pisa.
 * - Idempotente: una segunda corrida sale toda como "ya aplicado".
 * - Escribe siempre a través de los services reales (auditoría incluida).
 */
import { ObjectId } from "mongodb";
import { getDb } from "../../src/server/db/client";
import * as tenantRepository from "../../src/server/repositories/tenant.repository";
import * as contentRepository from "../../src/server/repositories/content.repository";
import * as processRepository from "../../src/server/repositories/process.repository";
import * as stepRepository from "../../src/server/repositories/step.repository";
import * as contentService from "../../src/server/services/content.service";
import * as processService from "../../src/server/services/process.service";
import * as stepService from "../../src/server/services/step.service";
import * as routeService from "../../src/server/services/route.service";
import type { RequestIdentity } from "../../src/server/auth/session";

export type Kind = "content" | "process" | "step";
export type TextPatch = { kind: Kind; id: string; field: string; label: string; from: string; to: string };
/** `to: null` quita el recurso; un string lo reemplaza. */
export type ResourceEdit = { processId: string; label: string; from: string; to: string | null };
/** Reparte entre estos procesos los mismos valores de `order` que ya tienen, en el orden dado. */
export type Reorder = { label: string; processes: { id: string; label: string }[] };

export type ContentPatchPlan = {
  textPatches?: TextPatch[];
  stepsToArchive?: { id: string; label: string }[];
  resourceEdits?: ResourceEdit[];
  reorders?: Reorder[];
  blockedMessage?: { from: string[]; to: string };
};

async function readField(tenantId: ObjectId, kind: Kind, id: ObjectId, field: string): Promise<string | null> {
  const doc =
    kind === "content"
      ? await contentRepository.findById(tenantId, id)
      : kind === "process"
        ? await processRepository.findById(tenantId, id)
        : await stepRepository.findById(tenantId, id);
  if (!doc) return null;
  const value = (doc as unknown as Record<string, unknown>)[field];
  return typeof value === "string" ? value : null;
}

async function writeField(admin: RequestIdentity, kind: Kind, id: ObjectId, field: string, value: string) {
  const patch = { [field]: value };
  if (kind === "content") await contentService.updateContentItem(admin, id, patch);
  else if (kind === "process") await processService.updateProcess(admin, id, patch);
  else await stepService.updateStep(admin, id, patch);
}

export async function runContentPatches(plan: ContentPatchPlan): Promise<void> {
  const apply = process.argv.includes("--apply");
  console.log(apply ? "*** MODO APLICAR — esto escribe en la base de .env.local ***" : "Solo plan (no escribe nada) — agrega --apply para ejecutar.");

  const tenant = await tenantRepository.findBySlug("imagine-apps");
  if (!tenant) throw new Error("tenant imagine-apps no encontrado");
  const db = await getDb();
  const adminDoc = await db.collection("users").findOne({ tenantId: tenant._id, platformRole: "ADMIN", status: "ACTIVE" });
  if (!adminDoc) throw new Error("no hay un admin activo para atribuir la auditoría");
  const admin: RequestIdentity = { userId: adminDoc._id, tenantId: tenant._id, status: "ACTIVE", platformRole: "ADMIN", functionalRoleId: null };

  const summary = { applied: 0, alreadyDone: 0, skipped: 0 };

  if (plan.textPatches?.length) {
    console.log("\n== Textos ==");
    // Varios reemplazos sobre el mismo campo van en una sola escritura.
    const byTarget = new Map<string, TextPatch[]>();
    for (const patch of plan.textPatches) {
      const key = `${patch.kind}:${patch.id}:${patch.field}`;
      byTarget.set(key, [...(byTarget.get(key) ?? []), patch]);
    }
    for (const patches of byTarget.values()) {
      const { kind, id, field } = patches[0];
      const current = await readField(tenant._id, kind, new ObjectId(id), field);
      if (current === null) {
        patches.forEach((p) => console.log(`  ⚠ ${p.label}: documento no encontrado — se salta`));
        summary.skipped += patches.length;
        continue;
      }
      let next = current;
      for (const p of patches) {
        if (next.includes(p.from)) {
          next = next.replace(p.from, p.to);
          console.log(`  ✎ ${p.label}\n      antes:   ${p.from}\n      después: ${p.to}`);
          summary.applied++;
        } else if (next.includes(p.to)) {
          console.log(`  ✓ ${p.label}: ya aplicado`);
          summary.alreadyDone++;
        } else {
          console.log(`  ⚠ ${p.label}: el texto actual ya no coincide (¿se editó desde el panel?) — se salta`);
          summary.skipped++;
        }
      }
      if (apply && next !== current) await writeField(admin, kind, new ObjectId(id), field, next);
    }
  }

  if (plan.stepsToArchive?.length) {
    console.log("\n== Pasos a archivar ==");
    for (const { id, label } of plan.stepsToArchive) {
      const step = await stepRepository.findById(tenant._id, new ObjectId(id));
      if (!step) {
        console.log(`  ⚠ ${label}: no encontrado — se salta`);
        summary.skipped++;
      } else if (step.status === "ARCHIVED") {
        console.log(`  ✓ ${label}: ya archivado`);
        summary.alreadyDone++;
      } else {
        console.log(`  ✎ ${label}`);
        summary.applied++;
        if (apply) await stepService.archiveStep(admin, step._id);
      }
    }
  }

  if (plan.resourceEdits?.length) {
    console.log("\n== Recursos de procesos ==");
    const byProcess = new Map<string, ResourceEdit[]>();
    for (const edit of plan.resourceEdits) byProcess.set(edit.processId, [...(byProcess.get(edit.processId) ?? []), edit]);
    for (const [processId, edits] of byProcess) {
      const proc = await processRepository.findById(tenant._id, new ObjectId(processId));
      if (!proc) {
        edits.forEach((e) => console.log(`  ⚠ ${e.label}: proceso no encontrado — se salta`));
        summary.skipped += edits.length;
        continue;
      }
      let next = [...proc.resources];
      for (const e of edits) {
        const action = e.to === null ? `quitar "${e.from}"` : `"${e.from}" → "${e.to}"`;
        if (next.includes(e.from)) {
          next = e.to === null ? next.filter((r) => r !== e.from) : next.map((r) => (r === e.from ? e.to! : r));
          console.log(`  ✎ ${e.label}: ${action}`);
          summary.applied++;
        } else if (e.to !== null && next.includes(e.to)) {
          console.log(`  ✓ ${e.label}: ya aplicado`);
          summary.alreadyDone++;
        } else if (e.to === null) {
          console.log(`  ✓ ${e.label}: "${e.from}" ya no está`);
          summary.alreadyDone++;
        } else {
          console.log(`  ⚠ ${e.label}: "${e.from}" no está entre los recursos — se salta`);
          summary.skipped++;
        }
      }
      if (apply && next.join("\u0000") !== proc.resources.join("\u0000")) await processService.updateProcess(admin, proc._id, { resources: next });
    }
  }

  for (const reorder of plan.reorders ?? []) {
    console.log(`\n== Orden: ${reorder.label} ==`);
    const procs = await Promise.all(reorder.processes.map(({ id }) => processRepository.findById(tenant._id, new ObjectId(id))));
    if (procs.some((p) => !p)) {
      console.log("  ⚠ falta algún proceso — se salta el reordenamiento completo");
      summary.skipped++;
      continue;
    }
    const slots = procs.map((p) => p!.order).sort((a, b) => a - b);
    if (procs.every((p, i) => p!.order === slots[i])) {
      console.log("  ✓ ya está en el orden correcto");
      summary.alreadyDone++;
      continue;
    }
    reorder.processes.forEach(({ label }, i) => console.log(`  ${i + 1}. ${label} (order ${procs[i]!.order} → ${slots[i]})`));
    summary.applied++;
    if (apply) {
      for (let i = 0; i < procs.length; i++) {
        if (procs[i]!.order !== slots[i]) await processService.updateProcess(admin, procs[i]!._id, { order: slots[i] });
      }
    }
  }

  if (plan.blockedMessage) {
    const { from, to } = plan.blockedMessage;
    console.log("\n== Aviso para avanzar (Mensajes de guía) ==");
    const route = await routeService.getRouteContent(tenant._id);
    if (route.blockedNextMessage.text === to) {
      console.log("  ✓ ya aplicado");
      summary.alreadyDone++;
    } else if (from.includes(route.blockedNextMessage.text)) {
      console.log(`  ✎ "${route.blockedNextMessage.text}" → "${to}" (no cambia si está activado o no)`);
      summary.applied++;
      if (apply) await routeService.updateRouteContent(admin, { blockedNextMessage: to });
    } else {
      console.log(`  ✓ el texto actual es otro ("${route.blockedNextMessage.text}") — no se toca`);
      summary.alreadyDone++;
    }
  }

  console.log(`\nResumen: ${summary.applied} por aplicar, ${summary.alreadyDone} ya aplicados, ${summary.skipped} saltados.`);
  console.log(apply ? "Listo — aplicado." : "Nada fue escrito. Revisa el plan y vuelve a correr con --apply.");
}
