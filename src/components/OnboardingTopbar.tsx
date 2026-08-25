import { ProgressBar } from "@/components/ProgressBar";
import { OnboardingNav } from "@/components/OnboardingNav";
import { UserMenu } from "@/components/UserMenu";

export type OnboardingTopbarProps = {
  progress?: { completed: number; total: number };
};

/** Chrome persistente de /onboarding y /onboarding/leaders: marca, nav y logout. */
export function OnboardingTopbar({ progress }: OnboardingTopbarProps) {
  const percent = progress && progress.total > 0 ? (progress.completed / progress.total) * 100 : 100;

  return (
    <div className="sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur">
      <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-4 px-6 py-3.5">
        <span className="flex-shrink-0 font-display text-base font-bold text-ink">
          imagine<span className="text-brand">.</span>
        </span>
        <OnboardingNav />
        {progress ? (
          <div className="min-w-[8rem] flex-1">
            <ProgressBar value={percent} label={`${progress.completed} / ${progress.total}`} />
          </div>
        ) : (
          <div className="flex-1" />
        )}
        <UserMenu />
      </div>
    </div>
  );
}
