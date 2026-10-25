import { Switch as SwitchPrimitive } from 'radix-ui'
import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

/** iOS-style switch on Radix: the thumb springs across, the track takes the accent. */
export function Switch({ className, ...props }: ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        'relative inline-flex h-[31px] w-[51px] shrink-0 cursor-pointer items-center rounded-full bg-fill-2 p-[2px] outline-none transition-colors duration-300 ease-glass',
        'focus-visible:shadow-[0_0_0_2px_var(--accent-ink)] data-[state=checked]:bg-[var(--switch-on,var(--accent))]',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb className="block size-[27px] rounded-full bg-white shadow-[0_3px_8px_rgba(0,0,0,.25),0_1px_1px_rgba(0,0,0,.16)] transition-transform duration-300 ease-spring data-[state=checked]:translate-x-[20px]" />
    </SwitchPrimitive.Root>
  )
}
