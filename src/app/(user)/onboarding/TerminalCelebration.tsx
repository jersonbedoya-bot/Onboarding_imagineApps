"use client";

import { useEffect, useRef } from "react";
import { useToast } from "@/components/Toast";
import { launchConfetti } from "@/lib/confetti";

/** Dispara una sola vez cuando el usuario llega al estado terminal del onboarding. */
export function TerminalCelebration() {
  const { showToast } = useToast();
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    launchConfetti();
    showToast("¡Completaste todo tu recorrido de onboarding!");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
