import { useCallback, useEffect, useLayoutEffect, useRef, useState, type PointerEvent } from 'react'
import type { Status, Task } from '@/data/types'
import { Flip, gsap, prefersReducedMotion } from '@/lib/gsap'

export interface DragState {
  id: string
  over: Status
  beforeId: string | null
  height: number
}

const HOLD_MS = 280 // touch: press and hold before a card lifts
const SLOP = 6

/**
 * Pointer-driven drag and drop for the board.
 *
 * A clone of the card (the "ghost") follows the pointer, tilted and lifted.
 * The column under the pointer gets a placeholder at the insertion point and
 * the other cards make room with GSAP Flip. On release the ghost glides into
 * the placeholder, then the move is committed to the store.
 */
export function useBoardDrag(onDrop: (id: string, status: Status, beforeId: string | null) => void) {
  const [drag, setDrag] = useState<DragState | null>(null)
  const dragRef = useRef<DragState | null>(null)
  const board = useRef<HTMLDivElement>(null)
  const flipState = useRef<Flip.FlipState | null>(null)
  const suppressClick = useRef(false)
  const cleanupRef = useRef<() => void>(() => {})

  /** Snapshot the other cards, then change state so Flip can animate the reflow. */
  const update = useCallback((next: DragState | null, movingId?: string) => {
    const root = board.current
    if (root && !prefersReducedMotion()) {
      const skip = movingId ?? dragRef.current?.id
      const cards = [...root.querySelectorAll<HTMLElement>('[data-card]')].filter((c) => c.dataset.card !== skip)
      flipState.current = Flip.getState(cards)
    }
    dragRef.current = next
    setDrag(next)
  }, [])

  useLayoutEffect(() => {
    const state = flipState.current
    if (!state) return
    flipState.current = null
    Flip.from(state, { duration: 0.32, ease: 'power3.out' })
  }, [drag?.id, drag?.over, drag?.beforeId])

  useEffect(() => () => cleanupRef.current(), [])

  const onCardPointerDown = useCallback(
    (e: PointerEvent<HTMLElement>, task: Task) => {
      if (e.button !== 0 || (e.target as HTMLElement).closest('[data-no-drag]')) return
      const card = e.currentTarget
      const startX = e.clientX
      const startY = e.clientY
      const touch = e.pointerType === 'touch'
      let px = startX
      let py = startY
      let started = false
      let ghost: HTMLElement | null = null
      let offsetX = 0
      let offsetY = 0
      let scroller: HTMLElement | null = null
      let raf = 0
      const holdTimer = touch ? window.setTimeout(() => begin(), HOLD_MS) : 0

      function begin() {
        if (started) return
        started = true
        suppressClick.current = true
        const rect = card.getBoundingClientRect()
        offsetX = px - rect.left
        offsetY = py - rect.top
        scroller = board.current?.querySelector<HTMLElement>('[data-board-scroll]') ?? null

        ghost = card.cloneNode(true) as HTMLElement
        ghost.removeAttribute('data-card')
        ghost.setAttribute('aria-hidden', 'true')
        Object.assign(ghost.style, {
          position: 'fixed',
          left: '0px',
          top: '0px',
          width: `${rect.width}px`,
          margin: '0',
          zIndex: '60',
          pointerEvents: 'none',
        })
        document.body.appendChild(ghost)
        gsap.set(ghost, { x: rect.left, y: rect.top })
        gsap.to(ghost, {
          rotate: 2.5,
          scale: 1.04,
          boxShadow: '0 34px 60px -22px rgba(0,0,0,.65), inset 0 1px 0 rgba(255,255,255,.12)',
          duration: 0.25,
          ease: 'power2.out',
        })
        document.documentElement.classList.add('tk-dragging')
        navigator.vibrate?.(10)

        const siblings = [...(card.parentElement?.querySelectorAll<HTMLElement>('[data-card]') ?? [])]
        const next = siblings[siblings.indexOf(card) + 1]?.dataset.card ?? null
        update({ id: task.id, over: task.status, beforeId: next, height: rect.height }, task.id)
        tick()
      }

      /** Works out the column and slot under the pointer. */
      function locate() {
        const col = document
          .elementsFromPoint(px, py)
          .map((el) => el.closest<HTMLElement>('[data-col]'))
          .find(Boolean)
        const current = dragRef.current
        if (!col || !current) return
        const status = col.dataset.col as Status
        const cards = [...col.querySelectorAll<HTMLElement>('[data-card]')].filter((c) => c.dataset.card !== current.id)
        const beforeId =
          status === 'done'
            ? (cards[0]?.dataset.card ?? null)
            : (cards.find((c) => {
                const r = c.getBoundingClientRect()
                return py < r.top + r.height / 2
              })?.dataset.card ?? null)
        if (status !== current.over || beforeId !== current.beforeId) update({ ...current, over: status, beforeId })
      }

      /** Follows the pointer and nudges the page / board when near an edge. */
      function tick() {
        if (!ghost) return
        gsap.set(ghost, { x: px - offsetX, y: py - offsetY })
        const edge = 72
        if (py < edge) window.scrollBy(0, -Math.ceil((edge - py) / 5))
        else if (py > window.innerHeight - edge) window.scrollBy(0, Math.ceil((py - window.innerHeight + edge) / 5))
        if (scroller && scroller.scrollWidth > scroller.clientWidth) {
          const r = scroller.getBoundingClientRect()
          if (px < r.left + edge) scroller.scrollLeft -= 12
          else if (px > r.right - edge) scroller.scrollLeft += 12
        }
        locate()
        raf = requestAnimationFrame(tick)
      }

      function onMove(ev: globalThis.PointerEvent) {
        px = ev.clientX
        py = ev.clientY
        if (started) {
          // Track every move, not just animation frames, so a fast flick lands where it was released.
          if (ghost) gsap.set(ghost, { x: px - offsetX, y: py - offsetY })
          locate()
          return
        }
        const moved = Math.hypot(px - startX, py - startY) > SLOP
        if (!moved) return
        if (touch) {
          finish(false) // it's a scroll, not a hold
          return
        }
        begin()
        locate()
      }

      function onTouchMove(ev: TouchEvent) {
        if (started) ev.preventDefault()
      }

      function onKey(ev: KeyboardEvent) {
        if (ev.key === 'Escape') finish(false)
      }

      function teardown() {
        window.clearTimeout(holdTimer)
        cancelAnimationFrame(raf)
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onUp)
        window.removeEventListener('pointercancel', onCancel)
        window.removeEventListener('touchmove', onTouchMove)
        window.removeEventListener('keydown', onKey)
        cleanupRef.current = () => {}
      }

      function finish(commit: boolean) {
        teardown()
        if (!started || !ghost) return
        const g = ghost
        const current = dragRef.current
        const target = commit
          ? board.current?.querySelector<HTMLElement>('[data-placeholder]')
          : null
        const land = () => {
          g.remove()
          document.documentElement.classList.remove('tk-dragging')
          window.setTimeout(() => (suppressClick.current = false), 0)
        }

        if (commit && current && target) {
          const r = target.getBoundingClientRect()
          gsap.to(g, {
            x: r.left,
            y: r.top,
            rotate: 0,
            scale: 1,
            boxShadow: '0 1px 2px rgba(0,0,0,.18)',
            duration: prefersReducedMotion() ? 0 : 0.26,
            ease: 'power3.out',
            onComplete: () => {
              update(null, current.id)
              onDrop(current.id, current.over, current.beforeId)
              land()
              requestAnimationFrame(() => {
                const el = board.current?.querySelector<HTMLElement>(`[data-card="${current.id}"]`)
                el?.classList.add('flash')
                window.setTimeout(() => el?.classList.remove('flash'), 800)
              })
            },
          })
        } else {
          // Cancelled: the card reappears where it was and the ghost slides home.
          update(null, current?.id)
          requestAnimationFrame(() => {
            const home = current && board.current?.querySelector<HTMLElement>(`[data-card="${current.id}"]`)
            const r = home?.getBoundingClientRect()
            if (!r) return land()
            gsap.to(g, { x: r.left, y: r.top, rotate: 0, scale: 1, duration: 0.3, ease: 'power3.out', onComplete: land })
          })
        }
      }

      const onUp = () => finish(true)
      const onCancel = () => finish(false)

      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
      window.addEventListener('pointercancel', onCancel)
      window.addEventListener('touchmove', onTouchMove, { passive: false })
      window.addEventListener('keydown', onKey)
      cleanupRef.current = () => finish(false)
    },
    [onDrop, update],
  )

  /** Clicks that end a drag shouldn't open the task. */
  const shouldIgnoreClick = useCallback(() => suppressClick.current, [])

  return { drag, board, onCardPointerDown, shouldIgnoreClick }
}
