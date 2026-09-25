import { useEffect, useRef } from 'react'

// Original NovaCare hero visual: an abstract "signal core" — an orbital ring
// system with a live PPG-style waveform sweeping through it, drawn on
// <canvas> (no WebGL/3D library — a 2D canvas gives full art-direction
// control at near-zero weight, appropriate for a healthcare app's landing
// page where the measurement screens must stay fast and light).
//
// It reacts subtly to pointer position (gentle parallax tilt + waveform
// amplitude) but the motion is decorative only — never presented as a real
// sensor reading. Fully inert under prefers-reduced-motion: draws one still
// frame and never starts the animation loop. Pauses via
// IntersectionObserver when scrolled out of view, and always cancels its
// rAF loop on unmount.
export default function SignalCore({ className = '' }) {
  const canvasRef = useRef(null)
  const wrapRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    if (!canvas || !wrap) return
    const ctx = canvas.getContext('2d')
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    let raf = null
    let visible = true
    let pointer = { x: 0.5, y: 0.42, tx: 0.5, ty: 0.42 }
    let t = 0
    let dpr = Math.min(window.devicePixelRatio || 1, 2)
    let w = 0, h = 0

    function resize() {
      const rect = wrap.getBoundingClientRect()
      w = rect.width; h = rect.height
      canvas.width = w * dpr
      canvas.height = h * dpr
      canvas.style.width = w + 'px'
      canvas.style.height = h + 'px'
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    function onPointerMove(e) {
      const rect = wrap.getBoundingClientRect()
      pointer.tx = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
      pointer.ty = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height))
    }
    function onLeave() { pointer.tx = 0.5; pointer.ty = 0.42 }

    function ring(cx, cy, r, rot, opacity, width) {
      ctx.save()
      ctx.translate(cx, cy)
      ctx.rotate(rot)
      ctx.scale(1, 0.38)
      ctx.beginPath()
      ctx.arc(0, 0, r, 0, Math.PI * 2)
      ctx.strokeStyle = `rgba(103,198,232,${opacity})`
      ctx.lineWidth = width
      ctx.stroke()
      ctx.restore()
    }

    function waveform(cx, cy, width, amp, phase, color, lw) {
      ctx.beginPath()
      const points = 64
      for (let i = 0; i <= points; i++) {
        const px = cx - width / 2 + (width * i) / points
        const xn = i / points
        // A calm baseline that lifts into a single pulse near the middle —
        // an art-directed shape, not live sensor output.
        const pulse = Math.exp(-Math.pow((xn - 0.5) * 9, 2)) * amp
        const py = cy + Math.sin(xn * Math.PI * 2 + phase) * amp * 0.06 - pulse
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py)
      }
      ctx.strokeStyle = color
      ctx.lineWidth = lw
      ctx.lineJoin = 'round'
      ctx.lineCap = 'round'
      ctx.stroke()
    }

    function draw() {
      ctx.clearRect(0, 0, w, h)
      const cx = w * 0.5
      const cy = h * 0.46
      const maxR = Math.min(w, h) * 0.34

      // Pointer eases toward target (gentle parallax, never snaps)
      pointer.x += (pointer.tx - pointer.x) * (reduceMotion ? 1 : 0.06)
      pointer.y += (pointer.ty - pointer.y) * (reduceMotion ? 1 : 0.06)
      const dx = (pointer.x - 0.5) * 2
      const dy = (pointer.y - 0.42) * 2

      // Soft radial glow core
      const grad = ctx.createRadialGradient(cx + dx * 14, cy + dy * 10, 0, cx, cy, maxR * 1.4)
      grad.addColorStop(0, 'rgba(77,181,221,0.28)')
      grad.addColorStop(0.55, 'rgba(37,99,235,0.10)')
      grad.addColorStop(1, 'rgba(7,11,18,0)')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, w, h)

      // Orbital rings, tilted slightly by pointer position
      for (let i = 0; i < 3; i++) {
        const r = maxR * (0.62 + i * 0.24)
        const rot = dx * 0.12 + i * 0.18 + (reduceMotion ? 0 : t * 0.00012 * (i + 1))
        ring(cx + dx * 8, cy + dy * 6, r, rot, 0.16 - i * 0.03, 1.1)
      }

      // Waveform sweeping across the core
      const amp = maxR * (0.5 + Math.abs(dy) * 0.15)
      waveform(cx, cy + dy * 4, maxR * 1.9, amp, reduceMotion ? 0 : t * 0.0016, 'rgba(139,219,245,0.9)', 2.2)
      waveform(cx, cy + dy * 4, maxR * 1.9, amp * 0.55, (reduceMotion ? 0 : t * 0.0016) + 1.4, 'rgba(103,198,232,0.35)', 1.2)

      // Core dot
      ctx.beginPath()
      ctx.arc(cx + dx * 8, cy + dy * 6, 4.5, 0, Math.PI * 2)
      ctx.fillStyle = '#eaf7fc'
      ctx.shadowColor = 'rgba(139,219,245,0.9)'
      ctx.shadowBlur = 16
      ctx.fill()
      ctx.shadowBlur = 0

      if (!reduceMotion) { t += 16; if (visible) raf = requestAnimationFrame(draw) }
    }

    resize()
    draw()
    if (!reduceMotion) {
      wrap.addEventListener('pointermove', onPointerMove)
      wrap.addEventListener('pointerleave', onLeave)
    }
    // A resize must always repaint immediately — otherwise a viewport change
    // (rotation, window resize, or a screenshot tool resizing the page) can
    // leave the canvas cleared and blank until the next animation frame,
    // which never comes if the rAF loop happened to be paused at that moment.
    function onResize() {
      resize()
      if (raf) { cancelAnimationFrame(raf); raf = null }
      draw()
    }
    window.addEventListener('resize', onResize)

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      if (visible && !reduceMotion && !raf) raf = requestAnimationFrame(draw)
      if (!visible && raf) { cancelAnimationFrame(raf); raf = null }
    }, { threshold: 0.05 })
    io.observe(wrap)

    return () => {
      if (raf) cancelAnimationFrame(raf)
      io.disconnect()
      window.removeEventListener('resize', onResize)
      wrap.removeEventListener('pointermove', onPointerMove)
      wrap.removeEventListener('pointerleave', onLeave)
    }
  }, [])

  return (
    <div ref={wrapRef} className={`nc-signal-core ${className}`} role="img" aria-label="An abstract flowing signal core, representing guided health measurement">
      <canvas ref={canvasRef} />
    </div>
  )
}
