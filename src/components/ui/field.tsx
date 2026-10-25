import { Check, ChevronDown } from 'lucide-react'
import { Select as SelectPrimitive } from 'radix-ui'
import type { ComponentProps, ReactNode } from 'react'
import { cn } from '@/lib/utils'

export const controlCls =
  'h-11 w-full rounded-[14px] bg-fill px-3.5 text-[15px] text-ink outline-none transition-[background-color,box-shadow] placeholder:text-ink-3 hover:bg-fill-2 focus:bg-fill-2 focus:shadow-[0_0_0_2px_var(--accent)]'

export function Field({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={cn('flex min-w-0 flex-col gap-1.5', className)}>
      <span className="pl-1 text-[13px] font-medium text-ink-2">{label}</span>
      {children}
    </label>
  )
}

export function Input({ className, ...props }: ComponentProps<'input'>) {
  return <input className={cn(controlCls, className)} {...props} />
}

export function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
  return <textarea className={cn(controlCls, 'h-auto min-h-20 resize-none py-2.5', className)} {...props} />
}

interface SelectProps {
  value: string
  onValueChange: (v: string) => void
  options: { value: string; label: ReactNode }[]
  name?: string
  'aria-label'?: string
  className?: string
}

/** Glass select built on Radix: keyboard, typeahead and screen readers included. */
export function Select({ value, onValueChange, options, name, className, ...rest }: SelectProps) {
  return (
    <SelectPrimitive.Root value={value} onValueChange={onValueChange} name={name}>
      <SelectPrimitive.Trigger
        aria-label={rest['aria-label']}
        className={cn(controlCls, 'flex items-center justify-between gap-2 text-left', className)}
      >
        <span className="truncate">
          <SelectPrimitive.Value />
        </span>
        <SelectPrimitive.Icon>
          <ChevronDown className="size-4 text-ink-2" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={6}
          className="glass glass--thick anim-pop z-[60] max-h-[min(320px,var(--radix-select-content-available-height))] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-[18px] p-1 text-ink"
        >
          <SelectPrimitive.Viewport className="scroll-thin">
            {options.map((o) => (
              <SelectPrimitive.Item
                key={o.value}
                value={o.value}
                className="relative flex h-9 cursor-default select-none items-center justify-between gap-3 rounded-[12px] px-3 text-[14px] outline-none data-[highlighted]:bg-fill-2"
              >
                <SelectPrimitive.ItemText>{o.label}</SelectPrimitive.ItemText>
                <SelectPrimitive.ItemIndicator>
                  <Check className="size-4 text-accent-ink" />
                </SelectPrimitive.ItemIndicator>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  )
}
