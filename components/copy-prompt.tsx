'use client'

import { useEffect, useState } from 'react'
import { Check, Copy } from 'lucide-react'

import { Button } from '@/components/ui/button'

/**
 * A block of text meant to be taken, not read.
 *
 * The button is the point: this is a prompt someone pastes at an agent, and
 * asking them to select twelve lines by hand is asking them not to bother.
 * The confirmation is the button changing rather than a toast, because the eye
 * is already on the thing that was clicked.
 */
export function CopyPrompt({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), 2000)
    return () => clearTimeout(timer)
  }, [copied])

  return (
    <div className="relative rounded-lg border bg-muted/30">
      <Button
        type="button"
        variant="outline"
        size="sm"
        aria-label={copied ? 'Copied' : 'Copy the prompt'}
        onClick={() => {
          // A denied clipboard permission is not worth an error state: the text
          // is right there and selectable.
          void navigator.clipboard.writeText(text).then(
            () => setCopied(true),
            () => {},
          )
        }}
        className="absolute top-2.5 right-2.5 z-10 gap-1.5 bg-background"
      >
        {copied ? <Check className="size-3.5 text-good" /> : <Copy className="size-3.5" />}
        {copied ? 'Copied' : 'Copy'}
      </Button>

      <pre className="overflow-x-auto p-4 pr-24 font-mono text-xs leading-relaxed whitespace-pre-wrap">
        {text}
      </pre>
    </div>
  )
}
