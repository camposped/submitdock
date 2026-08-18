'use client'

import { useRef, useState, useTransition } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Check,
  Copy,
  ImagePlus,
  Link2,
  Trash2,
  Upload,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  linkProductAsset,
  moveProductScreenshot,
  removeProductAsset,
  uploadProductAsset,
} from '@/lib/actions'
import {
  BRAND_SLOTS,
  type AssetField,
  type BrandSlot,
  type SingleAssetField,
} from '@/lib/asset-fields'
import { assetSrc } from '@/lib/asset-src'
import { cn } from '@/lib/utils'

/** Matches lib/assets.ts. Kept here so the picker and the server agree. */
const ACCEPT = '.svg,.png,.jpg,.jpeg,.webp,.gif,.avif'

function fileName(filePath: string) {
  return filePath.split('/').pop() ?? filePath
}

/**
 * The copy button that makes an asset usable.
 *
 * A directory form asks for a file upload, and macOS open dialogs take a typed
 * path after Cmd+Shift+G. So the useful thing to put on the clipboard is the
 * absolute path, not the picture.
 */
function CopyPath({
  path,
  className,
  iconOnly,
}: {
  path: string
  className?: string
  /** For the gallery, where the filename needs the width more than a label does. */
  iconOnly?: boolean
}) {
  const [copied, setCopied] = useState(false)
  return (
    <Button
      type="button"
      variant={iconOnly ? 'ghost' : 'outline'}
      size="sm"
      title={`Copy path: ${path}`}
      onClick={() => {
        void navigator.clipboard.writeText(path).then(() => {
          setCopied(true)
          setTimeout(() => setCopied(false), 1500)
        })
      }}
      className={cn(iconOnly ? 'size-6 shrink-0 p-0 text-muted-foreground' : 'gap-1.5', className)}
    >
      {copied ? <Check className="size-3 text-good" /> : <Copy className="size-3" />}
      {!iconOnly && (copied ? 'Copied' : 'Copy path')}
      {iconOnly && <span className="sr-only">Copy path</span>}
    </Button>
  )
}

/** Shown when a registered path no longer resolves on disk. */
function BrokenAsset({ name }: { name: string }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-1 p-2 text-center">
      <ImagePlus className="size-4 text-muted-foreground" />
      <span className="text-[10px] leading-tight text-muted-foreground">
        {name} is not on disk
      </span>
    </div>
  )
}

function AssetImage({ path, className }: { path: string; className?: string }) {
  const [broken, setBroken] = useState(false)
  if (broken) return <BrokenAsset name={fileName(path)} />
  return (
    // eslint-disable-next-line @next/next/no-img-element -- served by /api/asset from an absolute path, nothing for the optimizer to resolve
    <img
      src={assetSrc(path)}
      alt=""
      onError={() => setBroken(true)}
      className={className}
      loading="lazy"
    />
  )
}

/** Pick files, or paste a path to a file that is already on this machine. */
function AddControls({
  slug,
  field,
  multiple,
  label,
}: {
  slug: string
  field: AssetField
  multiple?: boolean
  label: string
}) {
  const input = useRef<HTMLInputElement>(null)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [linking, setLinking] = useState(false)
  const [pathDraft, setPathDraft] = useState('')

  function upload(files: FileList | null) {
    if (!files || files.length === 0) return
    const formData = new FormData()
    for (const file of files) formData.append('file', file)
    setError(null)
    startTransition(async () => {
      const result = await uploadProductAsset(slug, field, formData)
      if (result?.error) setError(result.error)
      if (input.current) input.current.value = ''
    })
  }

  function link() {
    setError(null)
    startTransition(async () => {
      const result = await linkProductAsset(slug, field, pathDraft)
      if (result?.error) setError(result.error)
      else {
        setPathDraft('')
        setLinking(false)
      }
    })
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => input.current?.click()}
          className="gap-1.5"
        >
          <Upload className="size-3" />
          {pending ? 'Uploading…' : label}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={pending}
          onClick={() => setLinking((open) => !open)}
          className="gap-1.5 text-muted-foreground"
        >
          <Link2 className="size-3" />
          Use a path
        </Button>
        <input
          ref={input}
          type="file"
          accept={ACCEPT}
          multiple={multiple}
          className="hidden"
          onChange={(event) => upload(event.target.files)}
        />
      </div>

      {linking && (
        <div className="flex items-center gap-2">
          <Input
            autoFocus
            value={pathDraft}
            onChange={(event) => setPathDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                link()
              }
              if (event.key === 'Escape') setLinking(false)
            }}
            placeholder="/Users/you/dev/product/public/brand/logo.svg"
            className="h-8 text-xs"
          />
          <Button type="button" size="sm" disabled={pending} onClick={link}>
            Add
          </Button>
        </div>
      )}

      {linking && (
        <p className="text-xs text-muted-foreground">
          Registers a file where it already is, without copying it. Uploading puts a copy in{' '}
          <span className="font-mono">data/assets/{slug}</span>.
        </p>
      )}

      {error && <p className="text-xs text-bad">{error}</p>}
    </div>
  )
}

/**
 * One brand slot.
 *
 * The preview tile is painted in the surface the slot is FOR, not in the app's
 * current theme: white artwork on a white tile looks like an empty box, and
 * that mistake is exactly what four slots exist to prevent. So the wrong file
 * in a slot is visible at a glance rather than at submission time.
 */
function BrandSlotCard({ slug, slot, value }: { slug: string; slot: BrandSlot; value: string }) {
  const [pending, startTransition] = useTransition()

  return (
    <div className="flex flex-col gap-2 rounded-lg border p-3">
      <div>
        <p className="text-[13px] font-medium">{slot.label}</p>
        <p className="text-xs text-muted-foreground">{slot.hint}</p>
      </div>

      <div
        className={cn(
          'flex items-center justify-center overflow-hidden rounded-md border',
          slot.shape === 'square' ? 'aspect-square w-24 self-start' : 'h-24 w-full',
          slot.surface === 'light' ? 'bg-white' : 'bg-neutral-950',
        )}
      >
        {value ? (
          <AssetImage path={value} className="size-full object-contain p-2" />
        ) : (
          <ImagePlus
            className={cn(
              'size-5',
              slot.surface === 'light' ? 'text-neutral-400' : 'text-neutral-600',
            )}
          />
        )}
      </div>

      {value && (
        <p className="truncate text-xs text-muted-foreground" title={value}>
          {fileName(value)}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-1.5">
        {value && (
          <>
            <CopyPath path={value} />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  await removeProductAsset(slug, slot.field, value)
                })
              }
              className="gap-1.5 text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="size-3" />
              Remove
            </Button>
          </>
        )}
      </div>

      <AddControls slug={slug} field={slot.field} label={value ? 'Replace' : 'Upload'} />
    </div>
  )
}

export type BrandValues = Record<SingleAssetField, string>

export function BrandFields({ slug, values }: { slug: string; values: BrandValues }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {BRAND_SLOTS.map((slot) => (
        <BrandSlotCard key={slot.field} slug={slug} slot={slot} value={values[slot.field]} />
      ))}
    </div>
  )
}

export function ScreenshotGallery({ slug, screenshots }: { slug: string; screenshots: string[] }) {
  const [pending, startTransition] = useTransition()

  return (
    <div className="flex flex-col gap-3">
      {screenshots.length > 0 ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {screenshots.map((shot, index) => (
            <li key={shot} className="group/shot flex flex-col gap-1.5">
              <div className="relative aspect-16/10 overflow-hidden rounded-lg border bg-muted">
                <AssetImage path={shot} className="size-full object-cover" />

                {/* Order is what a directory sees first, so it is worth setting. */}
                <div className="absolute inset-x-0 bottom-0 flex items-center gap-1 bg-foreground/70 p-1 opacity-0 transition-opacity group-hover/shot:opacity-100">
                  <button
                    type="button"
                    aria-label="Move earlier"
                    disabled={pending || index === 0}
                    onClick={() =>
                      startTransition(async () => {
                        await moveProductScreenshot(slug, shot, -1)
                      })
                    }
                    className="flex size-6 cursor-pointer items-center justify-center rounded text-background hover:bg-background/20 disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <ChevronLeft className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Move later"
                    disabled={pending || index === screenshots.length - 1}
                    onClick={() =>
                      startTransition(async () => {
                        await moveProductScreenshot(slug, shot, 1)
                      })
                    }
                    className="flex size-6 cursor-pointer items-center justify-center rounded text-background hover:bg-background/20 disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <ChevronRight className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Remove screenshot"
                    disabled={pending}
                    onClick={() =>
                      startTransition(async () => {
                        await removeProductAsset(slug, 'screenshots', shot)
                      })
                    }
                    className="ml-auto flex size-6 cursor-pointer items-center justify-center rounded text-background hover:bg-background/20"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>

                <span className="absolute top-1 left-1 rounded bg-foreground/70 px-1.5 text-[10px] font-medium tabular-nums text-background">
                  {index + 1}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground" title={shot}>
                  {fileName(shot)}
                </span>
                <CopyPath iconOnly path={shot} />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[13px] text-muted-foreground">
          No screenshots yet. Directories usually take two or three, and the first one is the
          thumbnail.
        </p>
      )}

      <AddControls slug={slug} field="screenshots" multiple label="Upload screenshots" />
    </div>
  )
}
