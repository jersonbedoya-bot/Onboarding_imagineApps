"use client";

import { useEffect, useRef } from "react";
import { useToast } from "@/components/Toast";

const CONFETTI_COLORS = ["#ff5500", "#e94800", "#7b4dff", "#2e7d5b", "#f7f1ff"];

function launchConfetti() {
  for (let i = 0; i < 60; i++) {
    const particle = document.createElement("div");
    particle.style.cssText = `position:fixed;width:8px;height:8px;background:${
      CONFETTI_COLORS[i % CONFETTI_COLORS.length]
    };left:50%;top:40%;border-radius:2px;z-index:300;pointer-events:none;`;
    document.body.appendChild(particle);
    const angle = Math.random() * Math.PI * 2;
    const velocity = 180 + Math.random() * 300;
    particle
      .animate(
        [
          { transform: "translate(0, 0) rotate(0)", opacity: 1 },
          {
            transform: `translate(${Math.cos(angle) * velocity}px, ${Math.sin(angle) * velocity - 160}px) rotate(${
              Math.random() * 720
            }deg)`,
            opacity: 0,
          },
        ],
        { duration: 1000 + Math.random() * 600, easing: "cubic-bezier(.2,.7,.3,1)" },
      )
      .onfinish = () => particle.remove();
  }
}

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
