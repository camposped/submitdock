'use client'

import { cn } from '@/lib/utils'

// Design-system Switch: a role="switch" button with a
// sliding thumb, primary-colored when on. Controlled (checked/onCheckedChange);
// forms that need the value submit a hidden input alongside.
export function Switch({
  checked,
  onCheckedChange,
  label,
  className,
}: {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  /** Clickable text next to the control. */
  label?: string
  className?: string
}) {
  const control = (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-10 shrink-0 cursor-pointer items-center rounded-full transition-colors',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
        checked ? 'bg-primary' : 'bg-muted-foreground/25',
        !label && className
      )}
    >
      <span
        aria-hidden
        className={cn(
          'absolute left-0.5 size-5 rounded-full bg-white shadow-sm transition-transform',
          checked && 'translate-x-4'
        )}
      />
    </button>
  )

  if (!label) return control
  return (
    <label className={cn('flex w-fit cursor-pointer items-center gap-2.5 text-sm font-medium', className)}>
      {control}
      {label}
    </label>
  )
}
