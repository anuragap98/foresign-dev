import { useRef } from 'react'
import { gsap, prefersReducedMotion, useGSAP } from '@/lib/gsap'

const BUBBLES: [cx: number, cy: number, r: number][] = [
  [180, 230, 34],
  [470, 760, 22],
  [930, 420, 70],
  [1180, 210, 46],
  [1420, 520, 26],
  [1270, 840, 58],
  [660, 160, 18],
  [300, 920, 30],
  [1500, 120, 16],
]

/**
 * Full-screen backdrop the glass refracts. Colours come from CSS variables
 * set per `data-wall`, so switching wallpapers is a pure CSS change.
 */
export function Wallpaper() {
  const root = useRef<SVGSVGElement>(null)

  useGSAP(
    () => {
      if (prefersReducedMotion()) return
      gsap.utils.toArray<SVGGElement>('[data-bubble]').forEach((b, i) => {
        gsap.to(b, {
          y: gsap.utils.random(-40, -16),
          x: gsap.utils.random(-14, 14),
          duration: gsap.utils.random(7, 12),
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
          delay: i * 0.4,
        })
      })
      gsap.to('[data-drift]', { x: 40, duration: 18, repeat: -1, yoyo: true, ease: 'sine.inOut' })
    },
    { scope: root },
  )

  return (
    <div className="wall pointer-events-none fixed inset-0 -z-10" aria-hidden>
      <svg ref={root} className="size-full" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice" focusable="false">
        <defs>
          <linearGradient id="wall-bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" style={{ stopColor: 'var(--wbg1)' }} />
            <stop offset="1" style={{ stopColor: 'var(--wbg2)' }} />
          </linearGradient>
          <linearGradient id="wall-a" x1="0" y1="0" x2="0.8" y2="1">
            <stop offset="0" style={{ stopColor: 'var(--wa1)' }} />
            <stop offset="1" style={{ stopColor: 'var(--wa2)' }} />
          </linearGradient>
          <linearGradient id="wall-b" x1="0" y1="0" x2="1" y2="0.6">
            <stop offset="0" style={{ stopColor: 'var(--wb1)' }} />
            <stop offset="1" style={{ stopColor: 'var(--wb2)' }} />
          </linearGradient>
          <radialGradient id="wall-bubble" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0.62" stopColor="#fff" stopOpacity="0" />
            <stop offset="0.92" stopColor="#fff" stopOpacity="0.16" />
            <stop offset="1" stopColor="#fff" stopOpacity="0.55" />
          </radialGradient>
          <filter id="wall-soft" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="40" />
          </filter>
        </defs>

        <rect width="1600" height="1000" fill="url(#wall-bg)" />

        <g data-band style={{ opacity: 'var(--bands)' }}>
          <path
            d="M1600 0V640C1460 600 1350 470 1190 380C990 268 820 320 690 200C600 116 590 40 610 0Z"
            fill="url(#wall-a)"
          />
          <g data-drift>
            <path
              d="M-60 560C220 450 470 590 720 620C1000 654 1180 520 1660 720V1000H-60Z"
              fill="url(#wall-b)"
              opacity="0.9"
            />
            <path
              d="M-60 620C230 520 470 650 730 680C1010 712 1190 590 1660 780"
              fill="none"
              stroke="#fff"
              strokeOpacity="0.22"
              strokeWidth="3"
            />
            <path
              d="M-60 660C240 570 480 700 740 730C1020 760 1200 650 1660 830"
              fill="none"
              stroke="#fff"
              strokeOpacity="0.12"
              strokeWidth="2"
            />
          </g>
          <circle cx="1240" cy="260" r="200" fill="var(--wb1)" opacity="0.35" filter="url(#wall-soft)" />
        </g>

        <g style={{ opacity: 'var(--bubbles)' }}>
          {BUBBLES.map(([cx, cy, r]) => (
            <g key={`${cx}-${cy}`} data-bubble>
              <circle cx={cx} cy={cy} r={r} fill="url(#wall-bubble)" stroke="#fff" strokeOpacity="0.35" strokeWidth="1.2" />
              <ellipse
                cx={cx - r * 0.35}
                cy={cy - r * 0.42}
                rx={r * 0.32}
                ry={r * 0.14}
                transform={`rotate(-28 ${cx - r * 0.35} ${cy - r * 0.42})`}
                fill="#fff"
                opacity="0.7"
              />
            </g>
          ))}
        </g>
      </svg>
    </div>
  )
}
