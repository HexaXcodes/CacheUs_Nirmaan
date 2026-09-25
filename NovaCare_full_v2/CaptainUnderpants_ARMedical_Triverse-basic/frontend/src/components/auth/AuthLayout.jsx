// src/components/auth/AuthLayout.jsx
// Two-column layout for login & register. Left = visual identity, right = form.
// Mobile-first: single column with the visual block becoming a compact header.
import { Activity, Sparkles, Zap } from 'lucide-react';

const AuthLayout = ({ title, subtitle, children, footer }) => {
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Visual side */}
      <aside className="relative bg-primary border-b-2 lg:border-b-0 lg:border-r-2 border-ink overflow-hidden">
        {/* Layered shapes — brutalist accents */}
        <div className="absolute -top-12 -left-12 w-56 h-56 bg-accent border-2 border-ink rounded-3xl rotate-12 shadow-brutal-lg animate-float" />
        <div className="absolute bottom-10 right-10 w-32 h-32 bg-bone border-2 border-ink rounded-2xl -rotate-6 shadow-brutal" />
        <div className="absolute top-1/3 right-20 w-3 h-24 bg-ink rotate-45" />

        <div className="relative z-10 h-full flex flex-col justify-between p-8 sm:p-12 min-h-[280px] lg:min-h-screen">
          <div className="flex items-center gap-2 text-bone -ml-3">
            <div className="w-9 h-9 grid place-items-center bg-bone border-2 border-ink rounded-lg shadow-brutal-sm">
              <Activity size={18} strokeWidth={3} className="text-primary" />
            </div>
            <span className="font-display font-bold text-xl text-ink">NovaCare</span>
          </div>

          <div className="hidden lg:block space-y-6 max-w-md">
            <p className="label-display text-ink/70">A New Kind of First Aid</p>
            <h1 className="font-display font-bold text-5xl text-ink leading-[0.95]">
              See it.<br />
              <span className="bg-bone border-2 border-ink px-2 inline-block -rotate-1">Understand it.</span><br />
              Save lives.
            </h1>
            <p className="text-ink/80 leading-relaxed">
              Augmented-reality guidance, explained step by step by an AI that knows your patient.
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="chip bg-bone"><Sparkles size={12} /> AI-Guided</span>
              <span className="chip bg-bone"><Zap size={12} /> Real-time AR</span>
            </div>
          </div>

          <div className="hidden lg:block font-mono text-xs text-ink/60">
            v1 · ar-medical-assistant
          </div>
        </div>
      </aside>

      {/* Form side */}
      <section className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">
          <div className="mb-6">
            <p className="label-display mb-2">{title.toUpperCase()}</p>
            <h2 className="font-display font-bold text-3xl sm:text-4xl text-ink leading-tight">
              {subtitle}
            </h2>
          </div>
          {children}
          {footer && <div className="mt-6 text-sm text-ink/70">{footer}</div>}
        </div>
      </section>
    </div>
  );
};

export default AuthLayout;
