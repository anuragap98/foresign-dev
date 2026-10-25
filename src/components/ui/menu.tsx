import { Check } from 'lucide-react'
import { DropdownMenu, Popover as PopoverPrimitive } from 'radix-ui'
import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

const surface = 'glass glass--thick anim-pop z-50 rounded-panel p-1.5 text-ink outline-none'

export const Menu = DropdownMenu.Root
export const MenuTrigger = DropdownMenu.Trigger

export function MenuContent({ className, sideOffset = 10, ...props }: ComponentProps<typeof DropdownMenu.Content>) {
  return (
    <DropdownMenu.Portal>
      <DropdownMenu.Content sideOffset={sideOffset} className={cn(surface, 'min-w-[220px]', className)} {...props} />
    </DropdownMenu.Portal>
  )
}

const itemCls =
  'relative flex h-10 cursor-default select-none items-center gap-3 rounded-[14px] px-3 text-[14px] outline-none transition-colors data-[highlighted]:bg-fill-2 data-[disabled]:opacity-50 [&_svg]:size-[18px] [&_svg]:text-ink-2'

export function MenuItem({ className, ...props }: ComponentProps<typeof DropdownMenu.Item>) {
  return <DropdownMenu.Item className={cn(itemCls, className)} {...props} />
}

export function MenuRadioItem({ className, children, ...props }: ComponentProps<typeof DropdownMenu.RadioItem>) {
  return (
    <DropdownMenu.RadioItem className={cn(itemCls, 'justify-between', className)} {...props}>
      {children}
      <DropdownMenu.ItemIndicator>
        <Check className="!text-accent-ink" />
      </DropdownMenu.ItemIndicator>
    </DropdownMenu.RadioItem>
  )
}

export const MenuRadioGroup = DropdownMenu.RadioGroup

export function MenuSeparator({ className }: { className?: string }) {
  return <DropdownMenu.Separator className={cn('mx-2 my-1.5 h-px bg-sep', className)} />
}

export const Popover = PopoverPrimitive.Root
export const PopoverTrigger = PopoverPrimitive.Trigger

export function PopoverContent({ className, sideOffset = 10, ...props }: ComponentProps<typeof PopoverPrimitive.Content>) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content sideOffset={sideOffset} className={cn(surface, 'p-0', className)} {...props} />
    </PopoverPrimitive.Portal>
  )
}
