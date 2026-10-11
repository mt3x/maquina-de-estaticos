"use client"

import * as React from "react"
import { ChevronRight } from "lucide-react"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"

/*
 * ProcessLog — show the work.
 *
 * Real steps, real tool calls, real durations, collapsible, in mono
 * (the machine's confessed voice). Showing genuine process builds trust;
 * staging fake process ("thinking…" theater) destroys it. Only feed this
 * component steps that actually happened.
 */

export type ProcessStepStatus = "done" | "running" | "error"

export interface ProcessStepData {
  /** What actually happened, e.g. "Consultou Meta Ads API (últimos 7 dias)". */
  label: string
  /** Optional raw detail: query, run id, row count. */
  detail?: string
  status?: ProcessStepStatus
  /** Real duration in ms — never invented. */
  durationMs?: number
}

const statusMark: Record<ProcessStepStatus, string> = {
  done: "✓",
  running: "…",
  error: "✕",
}

function formatDuration(ms: number) {
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`
}

function ProcessStep({
  label,
  detail,
  status = "done",
  durationMs,
}: ProcessStepData) {
  return (
    <li
      data-slot="process-step"
      className="flex items-baseline gap-2 font-mono text-xs leading-6"
    >
      <span
        aria-hidden
        className={cn(
          "shrink-0",
          status === "done" && "text-win",
          status === "running" && "text-ink-2 animate-breathe",
          status === "error" && "text-kill"
        )}
      >
        {statusMark[status]}
      </span>
      <span className="text-ink-1">{label}</span>
      {detail && <span className="text-ink-2 truncate">{detail}</span>}
      {durationMs !== undefined && (
        <span className="ml-auto shrink-0 text-ink-2">
          {formatDuration(durationMs)}
        </span>
      )}
    </li>
  )
}

interface ProcessLogProps extends React.ComponentProps<typeof Collapsible> {
  /** Trigger label. Defaults to "Mostrar trabalho". */
  label?: string
  steps: ProcessStepData[]
  className?: string
}

function ProcessLog({
  label = "Mostrar trabalho",
  steps,
  className,
  ...props
}: ProcessLogProps) {
  return (
    <Collapsible
      data-slot="process-log"
      className={cn("rounded-lg border border-rule bg-bg-1", className)}
      {...props}
    >
      <CollapsibleTrigger className="group/process flex w-full items-center gap-2 px-3 py-2 font-mono text-xs text-ink-2 hover:text-ink-1 transition-colors [transition-timing-function:var(--ease-organic)]">
        <ChevronRight className="size-3 transition-transform [transition-timing-function:var(--ease-organic)] group-data-[panel-open]/process:rotate-90" />
        {label}
        <span className="ml-auto text-ink-2">
          {steps.length} {steps.length === 1 ? "etapa" : "etapas"}
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <ol className="border-t border-rule px-3 py-2 space-y-0.5">
          {steps.map((step, i) => (
            <ProcessStep key={i} {...step} />
          ))}
        </ol>
      </CollapsibleContent>
    </Collapsible>
  )
}

export { ProcessLog, ProcessStep }
