import { useCallback, useEffect, useId, useRef, useState, type ElementType, type HTMLAttributes, type Ref } from 'react'
import { displacementMap, MAP_PAD, supportsLiquidGlass } from '@/lib/liquid'
import { cn } from '@/lib/utils'
import { useLook } from '@/store/look'

type Variant = 'card' | 'chrome' | 'thick'

interface GlassProps extends HTMLAttributes<HTMLElement> {
  as?: 'div' | 'section' | 'aside' | 'header' | 'nav' | 'article'
  variant?: Variant
  /** Bend the backdrop at the rim (Chromium only). */
  liquid?: boolean
  ref?: Ref<HTMLElement>
}

const FILTER: Record<Variant, { scale: number; blur: number; bezel: number }> = {
  card: { scale: 46, blur: 6, bezel: 22 },
  chrome: { scale: 40, blur: 6, bezel: 18 },
  thick: { scale: 34, blur: 13, bezel: 20 },
}

interface MapInfo {
  href: string
  w: number
  h: number
}

/** Keeps a displacement map in step with the element's size and corner radius. */
function useLiquidMap(el: HTMLElement | null, enabled: boolean, bezel: number) {
  const [map, setMap] = useState<MapInfo | null>(null)

  useEffect(() => {
    if (!el || !enabled) return
    let alive = true
    let timer = 0
    // Wait for the size to settle so live resizes don't redraw maps every frame.
    const update = () => {
      window.clearTimeout(timer)
      timer = window.setTimeout(() => {
        const w = Math.round(el.offsetWidth / 2) * 2
        const h = Math.round(el.offsetHeight / 2) * 2
        if (!w || !h) return
        const radius = parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0
        displacementMap(w, h, radius, bezel).then((href) => {
          if (alive) setMap((m) => (m && m.href === href ? m : { href, w, h }))
        })
      }, 120)
    }
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => {
      alive = false
      window.clearTimeout(timer)
      ro.disconnect()
    }
  }, [el, enabled, bezel])

  return enabled ? map : null
}

export function Glass({ as = 'div', variant = 'card', liquid = true, className, style, children, ref, ...rest }: GlassProps) {
  const [el, setEl] = useState<HTMLElement | null>(null)
  const refProp = useRef(ref)
  refProp.current = ref
  const setRef = useCallback((node: HTMLElement | null) => {
    setEl(node)
    const r = refProp.current
    if (typeof r === 'function') r(node)
    else if (r) (r as { current: HTMLElement | null }).current = node
  }, [])

  const solid = useLook((s) => s.solid)
  const id = `lg${useId().replace(/[^a-zA-Z0-9]/g, '')}`
  const cfg = FILTER[variant]
  const map = useLiquidMap(el, liquid && supportsLiquidGlass && !solid, cfg.bezel)
  const Tag = as as ElementType

  return (
    <Tag
      ref={setRef}
      className={cn('glass', variant === 'chrome' && 'glass--chrome', variant === 'thick' && 'glass--thick', className)}
      style={map ? { ...style, backdropFilter: `url(#${id})`, WebkitBackdropFilter: `url(#${id})` } : style}
      {...rest}
    >
      {map && (
        <svg aria-hidden focusable="false" className="pointer-events-none absolute size-0">
          <filter
            id={id}
            filterUnits="userSpaceOnUse"
            colorInterpolationFilters="sRGB"
            x={-MAP_PAD}
            y={-MAP_PAD}
            width={map.w + MAP_PAD * 2}
            height={map.h + MAP_PAD * 2}
          >
            <feImage
              href={map.href}
              x={-MAP_PAD}
              y={-MAP_PAD}
              width={map.w + MAP_PAD * 2}
              height={map.h + MAP_PAD * 2}
              preserveAspectRatio="none"
              result="map"
            />
            <feDisplacementMap in="SourceGraphic" in2="map" scale={cfg.scale} xChannelSelector="R" yChannelSelector="G" result="bent" />
            <feGaussianBlur in="bent" stdDeviation={cfg.blur} result="frost" />
            <feColorMatrix in="frost" type="saturate" values="1.7" />
          </filter>
        </svg>
      )}
      {children}
    </Tag>
  )
}
