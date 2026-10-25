import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { Flip } from 'gsap/Flip'

gsap.registerPlugin(useGSAP, Flip)

// Handy in devtools: gsap.globalTimeline.timeScale(0.2) to study a motion.
if (import.meta.env.DEV) Object.assign(window, { gsap })

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

export { Flip, gsap, useGSAP }
