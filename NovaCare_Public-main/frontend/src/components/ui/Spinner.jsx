export default function Spinner({ size = 'md' }) {
  const s = size === 'sm' ? 'w-5 h-5' : size === 'lg' ? 'w-12 h-12' : 'w-8 h-8'
  return (
    <div className="flex flex-col items-center gap-2">
      <div className={`${s} border-2 border-hud-cyan border-t-transparent animate-spin shadow-glow`} />
      <span className="hud-label animate-pulse">LOADING</span>
    </div>
  )
}
