import { describe, expect, it } from "vitest";
import {
  deriveStageStatus,
  deriveUnlockedStages,
  deriveCurrentStage,
  deriveRouteStatus,
  type StageForUnlock,
} from "@/server/services/progress-derivation";

describe("deriveStageStatus", () => {
  it("total=0 es COMPLETE (etapa solo-informativa, o vaciada por cascada)", () => {
    expect(deriveStageStatus({ stickyCompleted: false, totalCompletable: 0, completedCount: 0 })).toBe("COMPLETE");
  });

  it("nada completado con total>0 es NOT_STARTED", () => {
    expect(deriveStageStatus({ stickyCompleted: false, totalCompletable: 3, completedCount: 0 })).toBe("NOT_STARTED");
  });

  it("parcial es IN_PROGRESS", () => {
    expect(deriveStageStatus({ stickyCompleted: false, totalCompletable: 3, completedCount: 1 })).toBe("IN_PROGRESS");
  });

  it("completed === total es COMPLETE", () => {
    expect(deriveStageStatus({ stickyCompleted: false, totalCompletable: 3, completedCount: 3 })).toBe("COMPLETE");
  });

  it("sticky gana sobre un total que creció después (contenido nuevo no reabre)", () => {
    // El usuario completó 2/2 en su momento (sticky=true); el admin agregó
    // contenido nuevo después, así que hoy total=5, completed=1.
    expect(deriveStageStatus({ stickyCompleted: true, totalCompletable: 5, completedCount: 1 })).toBe("COMPLETE");
  });
});

describe("deriveUnlockedStages", () => {
  it("una etapa sin dependencia siempre está desbloqueada", () => {
    const stages: StageForUnlock[] = [{ stageId: "a", status: "NOT_STARTED", isBlocking: true, dependsOnStageId: null }];
    expect(deriveUnlockedStages(stages).get("a")).toBe(true);
  });

  it("una etapa depende de otra COMPLETE -> desbloqueada", () => {
    const stages: StageForUnlock[] = [
      { stageId: "a", status: "COMPLETE", isBlocking: true, dependsOnStageId: null },
      { stageId: "b", status: "NOT_STARTED", isBlocking: false, dependsOnStageId: "a" },
    ];
    expect(deriveUnlockedStages(stages).get("b")).toBe(true);
  });

  it("una etapa depende de otra incompleta y bloqueante -> bloqueada", () => {
    const stages: StageForUnlock[] = [
      { stageId: "a", status: "IN_PROGRESS", isBlocking: true, dependsOnStageId: null },
      { stageId: "b", status: "NOT_STARTED", isBlocking: false, dependsOnStageId: "a" },
    ];
    expect(deriveUnlockedStages(stages).get("b")).toBe(false);
  });

  it("una etapa depende de otra incompleta pero NO bloqueante -> desbloqueada", () => {
    const stages: StageForUnlock[] = [
      { stageId: "a", status: "NOT_STARTED", isBlocking: false, dependsOnStageId: null },
      { stageId: "b", status: "NOT_STARTED", isBlocking: false, dependsOnStageId: "a" },
    ];
    expect(deriveUnlockedStages(stages).get("b")).toBe(true);
  });

  it("caso obligatorio: etapa isBlocking vacía (total=0 -> COMPLETE) no traba a la siguiente", () => {
    const stages: StageForUnlock[] = [
      { stageId: "a", status: "COMPLETE", isBlocking: true, dependsOnStageId: null }, // total=0, vacuously COMPLETE
      { stageId: "b", status: "NOT_STARTED", isBlocking: false, dependsOnStageId: "a" },
    ];
    const unlocked = deriveUnlockedStages(stages);
    expect(unlocked.get("a")).toBe(true);
    expect(unlocked.get("b")).toBe(true);
  });
});

describe("deriveCurrentStage", () => {
  it("devuelve la primera etapa desbloqueada no-COMPLETE, en orden", () => {
    const stages: StageForUnlock[] = [
      { stageId: "a", status: "COMPLETE", isBlocking: true, dependsOnStageId: null },
      { stageId: "b", status: "IN_PROGRESS", isBlocking: false, dependsOnStageId: "a" },
      { stageId: "c", status: "NOT_STARTED", isBlocking: false, dependsOnStageId: "b" },
    ];
    const unlocked = deriveUnlockedStages(stages);
    expect(deriveCurrentStage(stages, unlocked)).toBe("b");
  });

  it("estado terminal: todas COMPLETE -> null (onboarding terminado, no error)", () => {
    const stages: StageForUnlock[] = [
      { stageId: "a", status: "COMPLETE", isBlocking: true, dependsOnStageId: null },
      { stageId: "b", status: "COMPLETE", isBlocking: false, dependsOnStageId: "a" },
    ];
    const unlocked = deriveUnlockedStages(stages);
    expect(deriveCurrentStage(stages, unlocked)).toBeNull();
  });

  it("no salta a una etapa bloqueada aunque venga después en el orden", () => {
    const stages: StageForUnlock[] = [
      { stageId: "a", status: "IN_PROGRESS", isBlocking: true, dependsOnStageId: null },
      { stageId: "b", status: "NOT_STARTED", isBlocking: false, dependsOnStageId: "a" },
    ];
    const unlocked = deriveUnlockedStages(stages);
    expect(deriveCurrentStage(stages, unlocked)).toBe("a");
  });
});

describe("deriveRouteStatus", () => {
  it("sin etapas visibles -> COMPLETE (nada que hacer)", () => {
    expect(deriveRouteStatus([])).toBe("COMPLETE");
  });

  it("todas COMPLETE -> COMPLETE", () => {
    expect(deriveRouteStatus([{ status: "COMPLETE" }, { status: "COMPLETE" }])).toBe("COMPLETE");
  });

  it("alguna en progreso o completa -> IN_PROGRESS", () => {
    expect(deriveRouteStatus([{ status: "COMPLETE" }, { status: "NOT_STARTED" }])).toBe("IN_PROGRESS");
  });

  it("todas NOT_STARTED -> NOT_STARTED", () => {
    expect(deriveRouteStatus([{ status: "NOT_STARTED" }, { status: "NOT_STARTED" }])).toBe("NOT_STARTED");
  });
});
