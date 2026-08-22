/**
 * Derivación de progreso — pura, sin I/O. No guarda ni lee nada; toma
 * conteos/hechos ya resueltos y devuelve estados. Unit-testeable sin
 * Mongo (ver __tests__/progress-derivation.test.ts).
 */

export type StageStatus = "COMPLETE" | "IN_PROGRESS" | "NOT_STARTED";

export function deriveStageStatus(input: {
  stickyCompleted: boolean;
  totalCompletable: number;
  completedCount: number;
}): StageStatus {
  // El hecho sticky gana siempre, aunque el total visible haya crecido
  // después (contenido nuevo agregado por un admin no reabre la etapa).
  if (input.stickyCompleted) return "COMPLETE";
  if (input.totalCompletable === 0) return "COMPLETE"; // vacuously true
  if (input.completedCount >= input.totalCompletable) return "COMPLETE";
  if (input.completedCount > 0) return "IN_PROGRESS";
  return "NOT_STARTED";
}

export type StageForUnlock = {
  stageId: string;
  status: StageStatus;
  isBlocking: boolean;
  dependsOnStageId: string | null;
};

/**
 * Una etapa está desbloqueada si no depende de ninguna otra, o si la
 * etapa de la que depende ya está COMPLETE, o si esa etapa de la que
 * depende no es isBlocking (isBlocking=false es un opt-in explícito del
 * admin para "no bloquees la siguiente aunque esta no se complete").
 */
export function deriveUnlockedStages(stages: StageForUnlock[]): Map<string, boolean> {
  const byId = new Map(stages.map((stage) => [stage.stageId, stage]));
  const unlocked = new Map<string, boolean>();

  for (const stage of stages) {
    if (!stage.dependsOnStageId) {
      unlocked.set(stage.stageId, true);
      continue;
    }
    const dependency = byId.get(stage.dependsOnStageId);
    if (!dependency) {
      // Dependencia no visible/no encontrada en el set actual: no bloquea.
      unlocked.set(stage.stageId, true);
      continue;
    }
    unlocked.set(stage.stageId, dependency.status === "COMPLETE" || !dependency.isBlocking);
  }

  return unlocked;
}

/**
 * Primera etapa desbloqueada que todavía no está COMPLETE, en orden.
 * null significa "no queda nada pendiente" = onboarding terminado — la
 * UI debe tratarlo como estado terminal exitoso, no como vacío/error.
 */
export function deriveCurrentStage(
  orderedStages: StageForUnlock[],
  unlocked: Map<string, boolean>,
): string | null {
  for (const stage of orderedStages) {
    if (stage.status !== "COMPLETE" && unlocked.get(stage.stageId)) {
      return stage.stageId;
    }
  }
  return null;
}

export function deriveRouteStatus(stages: { status: StageStatus }[]): StageStatus {
  if (stages.length === 0) return "COMPLETE";
  if (stages.every((stage) => stage.status === "COMPLETE")) return "COMPLETE";
  if (stages.some((stage) => stage.status === "COMPLETE" || stage.status === "IN_PROGRESS")) return "IN_PROGRESS";
  return "NOT_STARTED";
}
