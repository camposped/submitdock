'use client'

import * as React from 'react'
import { Combobox } from '@base-ui/react/combobox'
import { Check, ChevronDown, Search } from 'lucide-react'
import { cn } from '@/lib/utils'

// Design-system Select: replaces the native <select> with
// a Base UI combobox with search inside the popup. Works both controlled
// (value + onValueChange) and uncontrolled with name/defaultValue — Base UI
// renders a hidden input, so server-action form submission and native
// `required` keep working. Search is accent- and case-insensitive.

export type SelectOption = { value: string; label: string; disabled?: boolean }
export type SelectOptionGroup = { label: string; options: SelectOption[] }

type SelectProps = {
  options: SelectOption[] | SelectOptionGroup[]
  id?: string
  name?: string
  /** Controlled mode. Use '' for "nothing selected". */
  value?: string
  /** Uncontrolled mode (server-action forms). */
  defaultValue?: string
  onValueChange?: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyMessage?: string
  required?: boolean
  disabled?: boolean
  /** For selects without a visible label (Field/Label cover the rest via htmlFor+id). */
  'aria-label'?: string
  /** Extra trigger classes (width, alignment etc.). */
  className?: string
}

function isGrouped(options: SelectOption[] | SelectOptionGroup[]): options is SelectOptionGroup[] {
  return options.length > 0 && 'options' in options[0]
}

const ITEM_CLASS =
  'flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-sm outline-none select-none data-[highlighted]:bg-muted data-[highlighted]:text-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50'

function SelectItem({ option }: { option: SelectOption }) {
  return (
    <Combobox.Item value={option} disabled={option.disabled} className={ITEM_CLASS}>
      <span className="min-w-0 flex-1 truncate">{option.label}</span>
      <Combobox.ItemIndicator className="shrink-0">
        <Check className="size-4" />
      </Combobox.ItemIndicator>
    </Combobox.Item>
  )
}

export function Select({
  options,
  id,
  name,
  value,
  defaultValue,
  onValueChange,
  placeholder = 'Select',
  searchPlaceholder = 'Search',
  emptyMessage = 'No options found',
  required,
  disabled,
  'aria-label': ariaLabel,
  className,
}: SelectProps) {
  const grouped = isGrouped(options)
  const flat = React.useMemo(
    () => (isGrouped(options) ? options.flatMap((g) => g.options) : options),
    [options]
  )
  const items = React.useMemo(
    () => (isGrouped(options) ? options.map((g) => ({ label: g.label, items: g.options })) : options),
    [options]
  )
  const findOption = (v: string | undefined) => flat.find((o) => o.value === v) ?? null

  const valueProps =
    value !== undefined
      ? { value: findOption(value) }
      : { defaultValue: findOption(defaultValue) }

  return (
    <Combobox.Root
      items={items}
      name={name}
      required={required}
      disabled={disabled}
      autoHighlight
      isItemEqualToValue={(a, b) => a?.value === b?.value}
      onValueChange={(option: SelectOption | null | undefined) => onValueChange?.(option?.value ?? '')}
      {...valueProps}
    >
      <Combobox.Trigger
        id={id}
        aria-label={ariaLabel}
        className={cn(
          // Same metrics as ui/input (h-8, rounded-lg, px-2.5, no shadow):
          // a select beside a text field must read as the same control.
          'flex h-8 w-full min-w-0 cursor-pointer items-center justify-between gap-2 rounded-lg border border-input bg-transparent px-2.5 text-left text-base transition-colors outline-none md:text-sm',
          'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
          'data-[placeholder]:text-muted-foreground',
          'disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 dark:bg-input/30 dark:disabled:bg-input/80',
          className
        )}
      >
        <span className="truncate">
          <Combobox.Value placeholder={placeholder} />
        </span>
        <Combobox.Icon className="shrink-0 text-muted-foreground">
          <ChevronDown className="size-4" />
        </Combobox.Icon>
      </Combobox.Trigger>
      <Combobox.Portal>
        <Combobox.Positioner align="start" sideOffset={6} className="z-50 outline-none">
          <Combobox.Popup
            className={cn(
              'w-[var(--anchor-width)] max-w-[var(--available-width)] origin-[var(--transform-origin)] overflow-hidden rounded-lg border bg-popover text-popover-foreground shadow-md outline-none',
              'transition-[opacity,transform] duration-100 data-[starting-style]:scale-95 data-[starting-style]:opacity-0 data-[ending-style]:scale-95 data-[ending-style]:opacity-0'
            )}
          >
            <div className="flex items-center gap-2 border-b px-2.5">
              <Search className="size-4 shrink-0 text-muted-foreground" />
              <Combobox.Input
                aria-label={searchPlaceholder}
                placeholder={searchPlaceholder}
                className="h-9 w-full bg-transparent text-base outline-none placeholder:text-muted-foreground md:text-sm"
              />
            </div>
            <Combobox.Empty className="px-2.5 py-4 text-center text-sm text-muted-foreground empty:hidden">
              {emptyMessage}
            </Combobox.Empty>
            <Combobox.List className="max-h-[min(18rem,calc(var(--available-height)-3.5rem))] overflow-auto overscroll-contain p-1 empty:p-0">
              {grouped
                ? (group: { label: string; items: SelectOption[] }) => (
                    <Combobox.Group key={group.label} items={group.items} className="pb-1 last:pb-0">
                      <Combobox.GroupLabel className="px-2.5 py-1.5 text-xs font-medium text-muted-foreground select-none">
                        {group.label}
                      </Combobox.GroupLabel>
                      <Combobox.Collection>
                        {(option: SelectOption) => <SelectItem key={option.value} option={option} />}
                      </Combobox.Collection>
                    </Combobox.Group>
                  )
                : (option: SelectOption) => <SelectItem key={option.value} option={option} />}
            </Combobox.List>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  )
}
