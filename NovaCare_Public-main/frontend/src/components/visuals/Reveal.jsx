import { useEffect, useRef, useState } from 'react'

// Fades/lifts a section into place the first time it scrolls into view.
// Transform/opacity only (no layout thrashing), observer disconnects after
// the first reveal, and content renders fully visible immediately under
// prefers-reduced-motion instead of waiting on a scroll trigger.
//
// Content must never depend entirely on the observer firing: some capture/
// automation contexts (and, in principle, older browsers) can resize or
// snapshot the page without ever satisfying the intersection threshold,
// which would otherwise leave real content stuck at opacity:0 forever. A
// short fallback timer guarantees it becomes visible regardless.
export default function Reveal({ as: Tag = 'div', className = '', children, ...props }) {
  const ref = useRef(null)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduceMotion) { setShown(true); return }
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setShown(true); io.disconnect() }
    }, { threshold: 0.15 })
    io.observe(el)
    const fallback = setTimeout(() => setShown(true), 1800)
    return () => { io.disconnect(); clearTimeout(fallback) }
  }, [])

  return (
    <Tag ref={ref} className={`nc-reveal ${shown ? 'is-shown' : ''} ${className}`} {...props}>
      {children}
    </Tag>
  )
}
