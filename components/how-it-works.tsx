import { ChevronDown, Globe, Plus } from 'lucide-react'

import {
  ChatGptMark,
  ClaudeCodeMark,
  ClaudeMark,
  CodexMark,
} from '@/components/ai/connector-marks'
import { Card } from '@/components/ui/card'

/**
 * Referential use of the assistants' own marks: they say which agents this
 * works with, the way any "works with" row does. Symbols only, never beside
 * our own mark in a way that would read as a lockup.
 */
const AGENT_MARKS = [
  { key: 'claude-code', Mark: ClaudeCodeMark, label: 'Claude Code' },
  { key: 'codex', Mark: CodexMark, label: 'Codex' },
  { key: 'claude', Mark: ClaudeMark, label: 'Claude' },
  { key: 'chatgpt', Mark: ChatGptMark, label: 'ChatGPT' },
]

/**
 * What SubmitDock needs to be useful, in as few words as it takes.
 *
 * It deliberately does not describe Catalog, Product Kit and Submissions: those
 * are three items in the sidebar with their own headings, and repeating them
 * here made the card longer than the dashboard it sits on. The one thing this
 * has to land is that the app does not submit anything by itself.
 */
export function HowItWorks({ open }: { open: boolean }) {
  return (
    <Card className="p-0">
      <details open={open} className="group">
        <summary className="flex cursor-pointer list-none items-center gap-2 p-4 [&::-webkit-details-marker]:hidden">
          <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
          <span className="text-sm font-semibold">How SubmitDock works</span>
          <span className="text-xs text-muted-foreground">You drive an agent; this is the dashboard</span>
        </summary>

        <div className="flex flex-col gap-4 border-t p-4">
          <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
            <Requirement
              title="A coding agent"
              body="Claude Code, Codex or another, working in this folder."
              visual={
                <span className="flex items-center gap-2">
                  {/* Each mark carries its own aria-label and title. */}
                  {AGENT_MARKS.map(({ key, Mark, label }) => (
                    <span key={key} title={label} className="flex">
                      <Mark className="size-4 shrink-0" />
                    </span>
                  ))}
                </span>
              }
            />
            <span className="flex shrink-0 items-center justify-center text-muted-foreground">
              <Plus className="size-4" />
            </span>
            <Requirement
              title="A browser it drives"
              body="Chrome, through the Claude in Chrome extension."
              visual={<Globe className="size-4 shrink-0 text-muted-foreground" />}
            />
          </div>

          <p className="text-[13px] leading-relaxed text-muted-foreground">
            SubmitDock submits nothing on its own. It is the seat beside those two: you watch the
            run in the sidebar, take over what the agent cannot finish alone (a captcha, a login, a
            fee), and read whether any of it earned a real link.
          </p>

          <ol className="flex flex-col gap-1.5 border-t pt-4 text-xs leading-relaxed text-muted-foreground">
            <li>
              <span className="font-medium text-foreground">1.</span> Ask the agent for a pass. It
              works down Ready to send, ranked by Authority Score.
            </li>
            <li>
              <span className="font-medium text-foreground">2.</span> It writes each result back as
              it goes, so these screens move while you watch.
            </li>
            <li>
              <span className="font-medium text-foreground">3.</span> It verifies the listings
              afterwards. A confirmed dofollow link is the only number that counts.
            </li>
          </ol>
        </div>
      </details>
    </Card>
  )
}

function Requirement({
  title,
  body,
  visual,
}: {
  title: string
  body: string
  /** The marks, or an icon when the thing has no mark worth showing. */
  visual: React.ReactNode
}) {
  return (
    <div className="flex flex-1 flex-col gap-1.5 rounded-lg border p-3">
      <div className="flex items-center gap-2">
        <span className="text-[13px] font-medium">{title}</span>
        <span className="ml-auto flex items-center">{visual}</span>
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">{body}</p>
    </div>
  )
}
