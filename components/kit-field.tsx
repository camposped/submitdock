'use client'

import { Check, Copy } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

/**
 * One answer in the product kit: editable, with a copy button.
 *
 * This is the whole point of the Product screen. Open the directory in one
 * window, keep this beside it, and fill the form by clicking Copy down the
 * column. The counter next to the label exists because directories cap these
 * fields and finding out after pasting is too late.
 *
 * Not `components/copy-field.tsx`: that one is the read-only value row from
 * the boilerplate, for webhook URLs and the like.
 */
export function KitField({
  name,
  label,
  defaultValue,
  hint,
  limit,
  multiline,
  rows = 3,
}: {
  name: string
  label: string
  defaultValue: string
  hint?: string
  limit?: number
  multiline?: boolean
  rows?: number
}) {
  const [value, setValue] = useState(defaultValue)
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      setCopied(false)
    }
  }

  const over = limit !== undefined && value.length > limit
  const shared = cn('bg-card', over && 'border-bad/50')

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <Label htmlFor={name}>{label}</Label>
        {limit !== undefined && (
          <span
            className={cn('text-xs tabular-nums', over ? 'text-bad' : 'text-muted-foreground')}
            title={over ? `Over the ${limit} character target most directories allow` : undefined}
          >
            {value.length}/{limit}
          </span>
        )}
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={copy}
          disabled={!value}
          className="ml-auto h-6 gap-1 px-2 text-xs text-muted-foreground"
        >
          {copied ? <Check className="size-3 text-good" /> : <Copy className="size-3" />}
          {copied ? 'Copied' : 'Copy'}
        </Button>
      </div>

      {multiline ? (
        <Textarea
          id={name}
          name={name}
          rows={rows}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          className={shared}
        />
      ) : (
        <Input
          id={name}
          name={name}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          className={shared}
        />
      )}
    </div>
  )
}
