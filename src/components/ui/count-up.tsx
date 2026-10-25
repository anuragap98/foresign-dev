import { useEffect, useRef } from 'react'
import { gsap, prefersReducedMotion } from '@/lib/gsap'

/** Animates from the previous value (0 on mount) to `value`. */
export function CountUp({ value, format = (n) => String(Math.round(n)), duration = 1.1 }: { value: number; format?: (n: number) => string; duration?: number }) {
  const el = useRef<HTMLSpanElement>(null)
  const current = useRef({ n: 0 })
  const fmt = useRef(format)
  fmt.current = format

  useEffect(() => {
    const node = el.current
    if (!node) return
    if (prefersReducedMotion()) {
      current.current.n = value
      node.textContent = fmt.current(value)
      return
    }
    const tween = gsap.to(current.current, {
      n: value,
      duration,
      ease: 'power3.out',
      onUpdate: () => {
        node.textContent = fmt.current(current.current.n)
      },
    })
    return () => {
      tween.kill()
    }
  }, [value, duration])

  return <span ref={el}>{format(0)}</span>
}
