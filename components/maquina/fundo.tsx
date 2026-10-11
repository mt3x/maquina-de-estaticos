"use client";
import { MotionConfig } from "motion/react";

/** Fundo fixo com as duas manchas de cor do tema; fica atrás de tudo e não rola. */
export function FundoManchas() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10"
      style={{ background: "radial-gradient(circle at 8% 10%, var(--mancha-1), transparent 42%), radial-gradient(circle at 92% 90%, var(--mancha-2), transparent 45%)" }} />
  );
}

/** Animações da motion respeitam "reduzir movimento" do sistema. */
export function ProvedorMovimento({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
