import { useEffect, useRef, useState } from 'react'

/** Tracks an element's content width, for charts that draw in pixels. */
export function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, width] as const
}

/** Rounds up to a tidy axis maximum: 5, 10, 20, 25, 50… */
export function niceMax(v: number) {
  if (v <= 5) return 5
  const step = [5, 10, 20, 25, 50, 100, 200].find((s) => v / s <= 4) ?? 500
  return Math.ceil(v / step) * step
}

/** Indices for about `count` evenly spaced x-axis labels. */
export const tickIndices = (n: number, count = 6) =>
  n > 1 ? Array.from(new Set(Array.from({ length: count }, (_, i) => Math.round((i / (count - 1)) * (n - 1))))) : [0]
