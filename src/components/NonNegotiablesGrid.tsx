import { nonNegotiableIcon, type NonNegotiable } from "@/lib/institutional-content";
import { IconCardGrid } from "@/components/IconCardGrid";

export function NonNegotiablesGrid({ items }: { items: NonNegotiable[] }) {
  return (
    <IconCardGrid
      items={items.map((item) => ({ icon: nonNegotiableIcon(item.title), title: item.title, description: item.description }))}
    />
  );
}
