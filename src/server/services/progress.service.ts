import { cache } from "react";
import type { ObjectId } from "mongodb";
import { NotFoundError, ValidationError } from "@/server/errors";
import type { RequestIdentity } from "@/server/auth/session";
import * as progressRepository from "@/server/repositories/progress.repository";
import * as mediaRepository from "@/server/repositories/media.repository";
import * as roleRepository from "@/server/repositories/role.repository";
import type { ProgressDocument } from "@/server/repositories/progress.repository";
import { resolveVisibleContent } from "@/server/services/content.service";
import { resolveVisibleSteps } from "@/server/services/step.service";
import {
  deriveStageStatus,
  deriveUnlockedStages,
  deriveCurrentStage,
  deriveRouteStatus,
  type StageForUnlock,
} from "@/server/services/progress-derivation";
import type { StageDocument } from "@/server/repositories/stage.repository";
import type { ContentItemDocument } from "@/server/repositories/content.repository";
import type { ProcessDocument } from "@/server/repositories/process.repository";
import type { StepDocument } from "@/server/repositories/step.repository";

function requireRoleId(identity: RequestIdentity): ObjectId {
  if (!identity.functionalRoleId) {
    throw new ValidationError("No tenés un rol funcional asignado.");
  }
  return identity.functionalRoleId;
}

type StageBundle = {
  stage: StageDocument;
  items: ContentItemDocument[]; // todos los visibles (no solo obligatorios) — para render
  processGroups: { process: ProcessDocument; steps: StepDocument[] }[];
};

async function loadStageBundles(tenantId: ObjectId, roleId: ObjectId): Promise<StageBundle[]> {
  const [contentResult, stepsResult] = await Promise.all([
    resolveVisibleContent(tenantId, roleId),
    resolveVisibleSteps(tenantId, roleId),
  ]);

  const groupsByStage = new Map<string, { process: ProcessDocument; steps: StepDocument[] }[]>();
  for (const group of stepsResult.processes) {
    const key = group.process.stageId.toString();
    const bucket = groupsByStage.get(key) ?? [];
    bucket.push(group);
    groupsByStage.set(key, bucket);
  }

  return contentResult.stages.map(({ stage, items }) => ({
    stage,
    items,
    processGroups: groupsByStage.get(stage._id.toString()) ?? [],
  }));
}

function obligatoryItemsOf(bundle: StageBundle): ContentItemDocument[] {
  return bundle.items.filter((item) => item.requirement === "OBLIGATORY");
}

function stepsOf(bundle: StageBundle): StepDocument[] {
  return bundle.processGroups.flatMap((group) => group.steps);
}

function totalCompletableOf(bundle: StageBundle): number {
  return obligatoryItemsOf(bundle).length + stepsOf(bundle).length;
}

function completedCountOf(bundle: StageBundle, progressByTarget: Set<string>): number {
  let count = 0;
  for (const item of obligatoryItemsOf(bundle)) {
    if (progressByTarget.has(`CONTENT_ITEM:${item._id.toString()}`)) count++;
  }
  for (const step of stepsOf(bundle)) {
    if (progressByTarget.has(`STEP:${step._id.toString()}`)) count++;
  }
  return count;
}

function buildProgressByTarget(rows: ProgressDocument[]): Set<string> {
  return new Set(rows.filter((row) => row.targetType !== "STAGE").map((row) => `${row.targetType}:${row.targetId.toString()}`));
}

function buildStickyStageIds(rows: ProgressDocument[]): Set<string> {
  return new Set(rows.filter((row) => row.targetType === "STAGE").map((row) => row.targetId.toString()));
}

/**
 * Si la etapa ya tiene todo lo completable resuelto y todavía no existe
 * su hecho sticky, lo persiste (idempotente vía upsertCompletion). Un
 * total en 0 (etapa solo-informativa, o vaciada por cascada) NUNCA
 * dispara este write — queda vacuously COMPLETE de forma dinámica, sin
 * persistir nada, precisamente para que si el admin le agrega contenido
 * obligatorio real más adelante, ese contenido nuevo sí cuente (no hay
 * "acción de completado" real que justifique volverla sticky todavía).
 */
async function maybeStickStage(
  tenantId: ObjectId,
  userId: ObjectId,
  bundle: StageBundle,
  progressByTarget: Set<string>,
  stickyStageIds: Set<string>,
): Promise<void> {
  const stageIdStr = bundle.stage._id.toString();
  if (stickyStageIds.has(stageIdStr)) return;

  const total = totalCompletableOf(bundle);
  if (total === 0) return;
  const completed = completedCountOf(bundle, progressByTarget);
  if (completed < total) return;

  await progressRepository.upsertCompletion({
    tenantId,
    userId,
    targetType: "STAGE",
    targetId: bundle.stage._id,
    stageId: bundle.stage._id,
  });
  stickyStageIds.add(stageIdStr);
}

/**
 * Best-effort en el momento de completar el último ítem de una etapa.
 * Si esta escritura no llega a persistirse (crash entre el upsert del
 * item y este), resolveJourney la repara en la próxima carga — ver
 * comentario en ese archivo. No hay transacción multi-doc a propósito.
 */
async function stickIfComplete(tenantId: ObjectId, userId: ObjectId, roleId: ObjectId, stageId: ObjectId): Promise<void> {
  const bundles = await loadStageBundles(tenantId, roleId);
  const bundle = bundles.find((b) => b.stage._id.equals(stageId));
  if (!bundle) return;

  const rows = await progressRepository.findByUser(tenantId, userId);
  await maybeStickStage(tenantId, userId, bundle, buildProgressByTarget(rows), buildStickyStageIds(rows));
}

export async function completeStep(identity: RequestIdentity, stepId: ObjectId): Promise<void> {
  const roleId = requireRoleId(identity);
  const { processes } = await resolveVisibleSteps(identity.tenantId, roleId);

  let found: { process: ProcessDocument; step: StepDocument } | null = null;
  for (const { process, steps } of processes) {
    const step = steps.find((s) => s._id.equals(stepId));
    if (step) {
      found = { process, step };
      break;
    }
  }
  if (!found) throw new NotFoundError();

  await progressRepository.upsertCompletion({
    tenantId: identity.tenantId,
    userId: identity.userId,
    targetType: "STEP",
    targetId: stepId,
    stageId: found.process.stageId,
    processId: found.process._id,
  });

  await stickIfComplete(identity.tenantId, identity.userId, roleId, found.process.stageId);
}

/**
 * Completar TODOS los pasos de UN proceso de un tirón (ej. "Project
 * Status", "360 Operación", "NPS", "Pulso de Operaciones") — reemplaza el
 * flujo de marcar cada paso del proceso por separado (ver
 * OnboardingJourney.tsx). El contenido obligatorio del módulo (lectura)
 * sigue marcándose aparte con markContentAsRead: esto solo toca los pasos
 * del proceso indicado. Reusa upsertCompletion, que ya es idempotente por
 * índice único: los pasos ya completados individualmente antes de este
 * cambio simplemente se saltan.
 */
export async function completeProcess(identity: RequestIdentity, processId: ObjectId): Promise<void> {
  const roleId = requireRoleId(identity);
  const { processes } = await resolveVisibleSteps(identity.tenantId, roleId);

  const found = processes.find(({ process }) => process._id.equals(processId));
  if (!found) throw new NotFoundError();

  const rows = await progressRepository.findByUser(identity.tenantId, identity.userId);
  const progressByTarget = buildProgressByTarget(rows);

  for (const step of found.steps) {
    if (progressByTarget.has(`STEP:${step._id.toString()}`)) continue;
    await progressRepository.upsertCompletion({
      tenantId: identity.tenantId,
      userId: identity.userId,
      targetType: "STEP",
      targetId: step._id,
      stageId: found.process.stageId,
      processId: found.process._id,
    });
  }

  await stickIfComplete(identity.tenantId, identity.userId, roleId, found.process.stageId);
}

export async function markContentAsRead(identity: RequestIdentity, contentItemId: ObjectId): Promise<void> {
  const roleId = requireRoleId(identity);
  const { stages } = await resolveVisibleContent(identity.tenantId, roleId);

  let found: { stage: StageDocument; item: ContentItemDocument } | null = null;
  for (const { stage, items } of stages) {
    const item = items.find((i) => i._id.equals(contentItemId));
    if (item) {
      found = { stage, item };
      break;
    }
  }
  if (!found) throw new NotFoundError();
  if (found.item.requirement !== "OBLIGATORY") {
    throw new ValidationError("Este contenido no requiere acuse de lectura.");
  }

  await progressRepository.upsertCompletion({
    tenantId: identity.tenantId,
    userId: identity.userId,
    targetType: "CONTENT_ITEM",
    targetId: contentItemId,
    stageId: found.stage._id,
  });

  await stickIfComplete(identity.tenantId, identity.userId, roleId, found.stage._id);
}

/**
 * Detección pasiva de scroll para contenido NO obligatorio (ver
 * ContentViewTracker en el cliente) — puramente informativa. A
 * diferencia de markContentAsRead, esto NUNCA cuenta para
 * totalCompletable/completedCount (obligatoryItemsOf sigue filtrando
 * solo OBLIGATORY), así que no hace falta stickIfComplete acá: no hay
 * forma de que esto cambie si una etapa se considera completa.
 */
export async function markContentAsViewed(identity: RequestIdentity, contentItemId: ObjectId): Promise<void> {
  const roleId = requireRoleId(identity);
  const { stages } = await resolveVisibleContent(identity.tenantId, roleId);

  let found: { stage: StageDocument; item: ContentItemDocument } | null = null;
  for (const { stage, items } of stages) {
    const item = items.find((i) => i._id.equals(contentItemId));
    if (item) {
      found = { stage, item };
      break;
    }
  }
  if (!found) throw new NotFoundError();
  if (found.item.requirement === "OBLIGATORY") {
    throw new ValidationError("Este contenido obligatorio se marca con el botón de lectura, no automáticamente.");
  }

  await progressRepository.upsertCompletion({
    tenantId: identity.tenantId,
    userId: identity.userId,
    targetType: "CONTENT_ITEM",
    targetId: contentItemId,
    stageId: found.stage._id,
  });
}

/**
 * Vista "dónde estoy" completa del usuario. Antes de derivar el status
 * final, corre la auto-reparación sticky sobre TODAS las etapas: si
 * stickIfComplete (llamado al completar) no llegó a persistir el hecho
 * de una etapa que ya estaba completa, acá se repara — usando los
 * totales de ESTE mismo request, antes de que la respuesta salga. Por
 * eso cierra la ventana de fallo sin necesitar transacciones: mientras
 * el usuario vuelva a cargar el journey (típico después de completar
 * algo) antes de que un admin agregue contenido nuevo a esa etapa, el
 * sticky ya va a estar persistido.
 */
/**
 * cache() por request: el Bloque 2 introdujo un layout (sidebar) y la
 * página de /onboarding pidiendo el mismo journey en el mismo render —
 * sin esto sería 2 lecturas completas (+ el auto-repair sticky) por
 * request. React dedupea por identidad de argumentos; `identity` ya sale
 * cacheada de requireActiveUser(), así que la referencia es estable
 * dentro del mismo request.
 */
export const resolveJourney = cache(async (identity: RequestIdentity) => {
  const roleId = requireRoleId(identity);
  return resolveJourneyFor(identity.tenantId, identity.userId, roleId);
});

/**
 * Igual que resolveJourney, pero para un (tenantId, userId, roleId)
 * explícito en vez de la identidad de quien pide — lo usa el admin para
 * ver el progreso de OTRO usuario (ver /admin/users). El auto-repair
 * sticky de abajo sigue operando sobre el progreso de ESE usuario, nunca
 * el del admin que mira.
 */
export async function resolveJourneyFor(tenantId: ObjectId, userId: ObjectId, roleId: ObjectId) {
  const bundles = await loadStageBundles(tenantId, roleId);
  const rows = await progressRepository.findByUser(tenantId, userId);
  const progressByTarget = buildProgressByTarget(rows);
  const stickyStageIds = buildStickyStageIds(rows);
  const role = await roleRepository.findById(tenantId, roleId);

  for (const bundle of bundles) {
    await maybeStickStage(tenantId, userId, bundle, progressByTarget, stickyStageIds);
  }

  const computed = bundles.map((bundle) => {
    const total = totalCompletableOf(bundle);
    const completed = completedCountOf(bundle, progressByTarget);
    const sticky = stickyStageIds.has(bundle.stage._id.toString());
    const status = deriveStageStatus({ stickyCompleted: sticky, totalCompletable: total, completedCount: completed });
    return { bundle, total, completed, status };
  });

  const mediaIds = computed.flatMap(({ bundle }) => bundle.items.map((item) => item.mediaId).filter((id): id is ObjectId => id !== null));
  const mediaDocs = await mediaRepository.findByIds(tenantId, mediaIds);
  const mediaUrlById = new Map(mediaDocs.map((media) => [media._id.toString(), media.url]));

  const forUnlock: StageForUnlock[] = computed.map(({ bundle, status }) => ({
    stageId: bundle.stage._id.toString(),
    status,
    isBlocking: bundle.stage.isBlocking,
    dependsOnStageId: bundle.stage.dependsOnStageId ? bundle.stage.dependsOnStageId.toString() : null,
  }));
  const unlocked = deriveUnlockedStages(forUnlock);
  const currentStageId = deriveCurrentStage(forUnlock, unlocked);
  const routeStatus = deriveRouteStatus(forUnlock.map((s) => ({ status: s.status })));

  return {
    routeStatus,
    currentStageId, // null = onboarding terminado (todas las etapas COMPLETE), no un error
    // Dato real (no inventado) para orientación de Fase 04 — ver
    // OnboardingJourney.tsx. Nunca debería ser null en la práctica (todo
    // usuario con journey resuelto ya pasó requireRoleId), pero se maneja
    // por las dudas en vez de asumirlo.
    role: role ? { id: role._id.toString(), key: role.key, label: role.label } : null,
    stages: computed.map(({ bundle, total, completed, status }) => ({
      id: bundle.stage._id.toString(),
      key: bundle.stage.key,
      title: bundle.stage.title,
      order: bundle.stage.order,
      isBlocking: bundle.stage.isBlocking,
      status,
      unlocked: unlocked.get(bundle.stage._id.toString()) ?? true,
      totalCompletable: total,
      completedCount: completed,
      // Matiz de presentación: total===0 es COMPLETE pero NO es "0/0" ni
      // una etapa vacía — es contenido de solo lectura/consulta (ej.
      // Bienvenida). La UI no debe mostrar una barra de progreso ni un
      // check de "completada por el usuario" acá, solo el contenido.
      readOnly: total === 0,
      items: bundle.items.map((item) => ({
        id: item._id.toString(),
        title: item.title,
        type: item.type,
        body: item.body,
        videoUrl: item.videoUrl,
        videoProvider: item.videoProvider,
        imageUrl: item.mediaId ? (mediaUrlById.get(item.mediaId.toString()) ?? null) : null,
        requirement: item.requirement,
        completed: item.requirement === "OBLIGATORY" ? progressByTarget.has(`CONTENT_ITEM:${item._id.toString()}`) : null,
        // Espejo de `completed` para el caso NO obligatorio: detección
        // pasiva de scroll (ver markContentAsViewed), nunca vía botón.
        viewed: item.requirement === "OBLIGATORY" ? null : progressByTarget.has(`CONTENT_ITEM:${item._id.toString()}`),
      })),
      processes: bundle.processGroups.map(({ process, steps }) => ({
        id: process._id.toString(),
        title: process.title,
        objective: process.objective,
        context: process.context,
        expectedResult: process.expectedResult,
        resources: process.resources,
        steps: steps.map((step) => ({
          id: step._id.toString(),
          title: step.title,
          description: step.description,
          instruction: step.instruction,
          videoUrl: step.videoUrl,
          videoProvider: step.videoProvider,
          completed: progressByTarget.has(`STEP:${step._id.toString()}`),
        })),
      })),
    })),
  };
}
