"use client";

import { useRouter } from "next/navigation";

type StageOption = { id: string; title: string };

// Estructural, sin estilo definido.
export function StageSelector({ stages, selectedStageId }: { stages: StageOption[]; selectedStageId: string }) {
  const router = useRouter();

  return (
    <div>
      <label htmlFor="stage-selector">Etapa</label>
      <select
        id="stage-selector"
        value={selectedStageId}
        onChange={(event) => router.push(`/admin/content?stageId=${event.target.value}`)}
      >
        {stages.map((stage) => (
          <option key={stage.id} value={stage.id}>
            {stage.title}
          </option>
        ))}
      </select>
    </div>
  );
}
