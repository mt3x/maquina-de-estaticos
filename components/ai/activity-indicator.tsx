import * as React from "react"
import { cn } from "@/lib/utils"

/*
 * ActivityIndicator — organic motion for REAL activity only.
 *
 * The breathe animation runs exclusively while the machine is actually
 * working (listening, processing, streaming). It must never run to
 * simulate emotion, presence or "thinking about you" — animating
 * interiority crosses the humanwashing line.
 */

interface ActivityIndicatorProps {
  /** True only while real work is happening. */
  active: boolean
  /** What the machine is actually doing, e.g. "consultando a Meta API". */
  label?: string
  className?: string
}

export function ActivityIndicator({
  active,
  label,
  className,
}: ActivityIndicatorProps) {
  if (!active) return null

  return (
    <span
      data-slot="activity-indicator"
      role="status"
      className={cn(
        "inline-flex items-center gap-2 text-xs text-ink-2",
        className
      )}
    >
      <span
        aria-hidden
        className="size-1.5 rounded-full bg-brand animate-breathe"
      />
      <span className="font-mono">{label ?? "processando"}</span>
    </span>
  )
}
