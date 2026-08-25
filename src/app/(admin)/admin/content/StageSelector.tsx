"use client";

import { useRouter } from "next/navigation";
import { Select } from "@/components/Field";

type StageOption = { id: string; title: string };

export function StageSelector({ stages, selectedStageId }: { stages: StageOption[]; selectedStageId: string }) {
  const router = useRouter();

  return (
    <div className="mb-6 max-w-xs">
      <Select
        id="stage-selector"
        label="Etapa"
        value={selectedStageId}
        onChange={(event) => router.push(`/admin/content?stageId=${event.target.value}`)}
      >
        {stages.map((stage) => (
          <option key={stage.id} value={stage.id}>
            {stage.title}
          </option>
        ))}
      </Select>
    </div>
  );
}
