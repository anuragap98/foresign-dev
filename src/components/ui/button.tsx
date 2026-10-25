import { cva, type VariantProps } from 'class-variance-authority'
import { Slot } from 'radix-ui'
import type { ComponentProps, PointerEvent } from 'react'
import { gsap, prefersReducedMotion } from '@/lib/gsap'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'relative inline-flex select-none items-center justify-center gap-2 overflow-hidden whitespace-nowrap font-medium transition-[background-color,filter,transform,color] duration-200 ease-glass active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        gel: 'gel',
        glass: 'glass glass--chrome text-ink hover:bg-fill-hover',
        soft: 'bg-fill text-ink hover:bg-fill-2',
        ghost: 'text-ink-2 hover:bg-fill-hover hover:text-ink',
        link: 'text-accent-ink hover:underline underline-offset-4',
        danger: 'bg-[color-mix(in_srgb,var(--danger)_16%,transparent)] text-danger hover:bg-[color-mix(in_srgb,var(--danger)_24%,transparent)]',
      },
      size: {
        sm: 'h-8 rounded-full px-3 text-[13px] [&_svg]:size-4',
        md: 'h-10 rounded-full px-4 text-[15px] [&_svg]:size-[18px]',
        lg: 'h-12 rounded-full px-5 text-[15px] [&_svg]:size-5',
        icon: 'size-9 rounded-full [&_svg]:size-[18px]',
        none: '',
      },
    },
    defaultVariants: { variant: 'soft', size: 'md' },
  },
)

/** A soft light blooms from the press point. */
function ripple(e: PointerEvent<HTMLElement>) {
  if (prefersReducedMotion()) return
  const el = e.currentTarget
  const rect = el.getBoundingClientRect()
  const size = Math.max(rect.width, rect.height) * 2.2
  const dot = document.createElement('span')
  dot.className = 'ripple'
  Object.assign(dot.style, {
    width: `${size}px`,
    height: `${size}px`,
    left: `${e.clientX - rect.left - size / 2}px`,
    top: `${e.clientY - rect.top - size / 2}px`,
  })
  el.appendChild(dot)
  gsap.fromTo(dot, { scale: 0, opacity: 0.9 }, { scale: 1, opacity: 0, duration: 0.7, ease: 'power2.out', onComplete: () => dot.remove() })
}

export interface ButtonProps extends ComponentProps<'button'>, VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

export function Button({ className, variant, size, asChild, onPointerDown, ...props }: ButtonProps) {
  const Comp = asChild ? Slot.Root : 'button'
  return (
    <Comp
      className={cn(buttonVariants({ variant, size }), className)}
      onPointerDown={(e: PointerEvent<HTMLButtonElement>) => {
        ripple(e)
        onPointerDown?.(e)
      }}
      {...props}
    />
  )
}

export { buttonVariants }
