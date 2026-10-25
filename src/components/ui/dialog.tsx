import { X } from 'lucide-react'
import { Dialog as DialogPrimitive } from 'radix-ui'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Button } from './button'

interface ShellProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children: ReactNode
  className?: string
}

function Overlay() {
  return <DialogPrimitive.Overlay className="anim-fade fixed inset-0 z-40 bg-scrim backdrop-blur-[3px]" />
}

function CloseButton() {
  return (
    <DialogPrimitive.Close asChild>
      <Button variant="soft" size="icon" aria-label="Close">
        <X />
      </Button>
    </DialogPrimitive.Close>
  )
}

interface ModalProps extends ShellProps {
  /** Primary action in the header, e.g. a submit button bound to a form id. */
  action?: ReactNode
}

/** Centred sheet: ✕ · title · primary action, like an iOS form sheet. */
export function Modal({ open, onOpenChange, title, description, action, children, className }: ModalProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <Overlay />
        <DialogPrimitive.Content
          className={cn(
            'glass glass--thick anim-modal fixed top-1/2 left-1/2 z-50 w-[min(560px,calc(100vw-24px))] -translate-x-1/2 -translate-y-1/2 rounded-card p-5 text-ink outline-none',
            className,
          )}
        >
          <div className="mb-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <CloseButton />
            <div className="text-center">
              <DialogPrimitive.Title className="text-[17px] font-semibold">{title}</DialogPrimitive.Title>
              {description ? (
                <DialogPrimitive.Description className="text-[13px] text-ink-2">{description}</DialogPrimitive.Description>
              ) : (
                <DialogPrimitive.Description className="sr-only">{title}</DialogPrimitive.Description>
              )}
            </div>
            <div className="flex justify-end">{action}</div>
          </div>
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

interface DrawerProps extends ShellProps {
  /** Small row above the title, e.g. chips. */
  eyebrow?: ReactNode
  /** Pinned under the scrolling body. */
  footer?: ReactNode
}

/** Right-hand sheet for details and reference lists. */
export function Drawer({ open, onOpenChange, title, description, eyebrow, footer, children, className }: DrawerProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <Overlay />
        <DialogPrimitive.Content
          {...(!description && { 'aria-describedby': undefined })}
          className={cn(
            'glass glass--thick anim-drawer fixed top-3 right-3 bottom-3 z-50 flex w-[min(440px,calc(100vw-24px))] flex-col overflow-hidden rounded-card text-ink outline-none',
            className,
          )}
        >
          <div className="flex items-start justify-between gap-3 p-5 pb-3">
            <div className="min-w-0">
              {eyebrow && <div className="mb-2 flex flex-wrap items-center gap-1.5">{eyebrow}</div>}
              <DialogPrimitive.Title className="display text-[24px] leading-tight font-bold">{title}</DialogPrimitive.Title>
              {description && <DialogPrimitive.Description className="text-[13px] text-ink-2">{description}</DialogPrimitive.Description>}
            </div>
            <CloseButton />
          </div>
          <div className="scroll-thin flex-1 overflow-y-auto px-5 pb-5">{children}</div>
          {footer && <div className="flex flex-wrap items-center gap-2 border-t border-sep px-5 py-4">{footer}</div>}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

/** Small centred confirm dialog. */
export function Confirm({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
}: Omit<ShellProps, 'children'> & { confirmLabel: string; onConfirm: () => void }) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <Overlay />
        <DialogPrimitive.Content className="glass glass--thick anim-modal fixed top-1/2 left-1/2 z-50 w-[min(380px,calc(100vw-24px))] -translate-x-1/2 -translate-y-1/2 rounded-card p-6 text-center text-ink outline-none">
          <DialogPrimitive.Title className="text-[17px] font-semibold">{title}</DialogPrimitive.Title>
          <DialogPrimitive.Description className="mt-2 text-[14px] text-ink-2">{description}</DialogPrimitive.Description>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <DialogPrimitive.Close asChild>
              <Button variant="soft">Cancel</Button>
            </DialogPrimitive.Close>
            <Button
              variant="danger"
              onClick={() => {
                onConfirm()
                onOpenChange(false)
              }}
            >
              {confirmLabel}
            </Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
