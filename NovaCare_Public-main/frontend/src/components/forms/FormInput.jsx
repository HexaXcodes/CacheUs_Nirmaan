import { useId } from 'react'
export default function FormInput({ label, error, className = '', ...props }) {
  const generatedId = useId()
  const fieldId = props.id || generatedId
  return (
    <div className={`space-y-1 ${className}`}>
      {label && (
        <label htmlFor={fieldId} className="block font-mono text-xs uppercase tracking-widest text-hud-muted">
          {label}
        </label>
      )}
      <input id={fieldId} aria-invalid={!!error} aria-describedby={error ? fieldId+'-error' : undefined}
        className={`w-full px-4 py-3 bg-hud-panel border-2 text-hud-text font-mono text-sm
          focus:outline-none focus:border-hud-cyan focus:shadow-glow transition-all
          placeholder:text-hud-dim
          ${error ? 'border-tier-red' : 'border-hud-dim'}`}
        {...props}
      />
      {error && <p id={fieldId+'-error'} role="alert" className="font-mono text-xs text-tier-red uppercase tracking-wide">{error}</p>}
    </div>
  )
}
