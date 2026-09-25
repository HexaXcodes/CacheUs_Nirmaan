import { useEffect, useRef } from 'react'

// Wraps any single interactive child (a <Link>, <button>, <a>) with a subtle
// "magnetic" pointer-follow effect: the element eases a few pixels toward
// the cursor while hovered, and springs back on leave. Pure transform-based
// (no layout thrashing), capped to a small travel distance so it stays
// tasteful rather than gimmicky, and fully disabled under
// prefers-reduced-motion and on touch devices (no hover to react to there).
export default function Magnetic({ children, strength = 14, className = '' }) {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const isTouch = window.matchMedia('(hover: none)').matches
    if (reduceMotion || isTouch) return

    function onMove(e) {
      const r = el.getBoundingClientRect()
      const x = ((e.clientX - r.left) / r.width - 0.5) * strength
      const y = ((e.clientY - r.top) / r.height - 0.5) * strength
      el.style.transform = `translate(${x}px, ${y}px)`
    }
    function onLeave() { el.style.transform = '' }

    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerleave', onLeave)
    return () => {
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerleave', onLeave)
    }
  }, [strength])

  return <span ref={ref} className={`nc-magnetic ${className}`}>{children}</span>
}
