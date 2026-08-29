"use client";

import { usePathname, useRouter } from "next/navigation";
import { Select } from "@/components/Field";

type StageOption = { id: string; title: string };

export function StageSelector({ stages, selectedStageId }: { stages: StageOption[]; selectedStageId: string }) {
  const router = useRouter();
  // Reutilizado en /admin/content y /admin/processes: navega a la ruta
  // actual, no a una fija — si no, cambiar de etapa en Procesos te sacaba
  // de esa pantalla (bug encontrado en dev: quedaba pegado en la primera
  // etapa por defecto, sin forma de elegir otra sin salir de la página).
  const pathname = usePathname();

  return (
    <div className="mb-6 max-w-xs">
      <Select
        id="stage-selector"
        label="Etapa"
        value={selectedStageId}
        onChange={(event) => router.push(`${pathname}?stageId=${event.target.value}`)}
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
