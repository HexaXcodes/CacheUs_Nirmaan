// src/components/ar/GuidancePanel.jsx
// ============================================================================
//  The instruction/status/control panel for the markerless AR experience.
//  Generic across all six workflow phases — it only reads from the standard
//  { id, title, instruction: {en,hi,kn} } step shape and the shared state
//  machine states from hooks/useProcedureSession.js.
// ============================================================================
import { ChevronRight, X, Sparkles, RotateCcw, CheckCircle2, AlertTriangle, HelpCircle, Loader2, ScanEye } from 'lucide-react';
import { STATES } from '../../hooks/useProcedureSession';
import { perceptionBadge } from '../../data/careWorkflowsMeta';
import LanguageSwitcher from '../common/LanguageSwitcher';

const STATUS_COPY = {
  [STATES.DETECTING]: { icon: Loader2, spin: true, tone: 'text-white/80', key: 'detecting' },
  [STATES.TARGET_DETECTED]: { icon: CheckCircle2, spin: false, tone: 'text-emerald-300', key: 'detected' },
  [STATES.GUIDING]: { icon: Sparkles, spin: false, tone: 'text-accent', key: 'guiding' },
  [STATES.VERIFYING]: { icon: Loader2, spin: true, tone: 'text-white/80', key: 'verifying' },
  [STATES.CORRECT]: { icon: CheckCircle2, spin: false, tone: 'text-emerald-300', key: 'correct' },
  [STATES.INCORRECT]: { icon: AlertTriangle, spin: false, tone: 'text-red-300', key: 'incorrect' },
  [STATES.UNCERTAIN]: { icon: HelpCircle, spin: false, tone: 'text-amber-300', key: 'uncertain' }
};

const GuidancePanel = ({
  workflowId,
  device,
  workflowName,
  medicalBoundary,
  step,
  stepIndex,
  totalSteps,
  state,
  subjectLabel,
  debugReading,
  manualStepAvailable = false,
  lang,
  setLang,
  languages,
  t,
  explanation,
  explaining,
  onExplain,
  onSimulate,
  onRetry,
  onConfirmManual,
  onExit,
  onDone,
  mockMode = true
}) => {
  const instruction = step?.instruction?.[lang] || step?.instruction?.en || '';
  const status = STATUS_COPY[state];
  const progress = totalSteps ? ((stepIndex + 1) / totalSteps) * 100 : 0;
  const badge = perceptionBadge(workflowId, device);

  return (
    <>
      {/* Top bar */}
      <div className="fixed top-4 inset-x-4 z-[10000] flex items-start justify-between gap-2">
        <div className="px-3 py-2 bg-bone/90 backdrop-blur border-2 border-ink rounded-lg shadow-brutal-sm">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink/60">NovaCare</p>
          <p className="font-display font-bold text-sm leading-tight">{workflowName}</p>
          {totalSteps > 0 && (
            <p className="font-mono text-[10px] text-ink/60 mt-0.5">
              {t('step')} {stepIndex + 1} {t('of')} {totalSteps}
            </p>
          )}
          <span
            className={`mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-mono text-[8px] uppercase tracking-wider ${
              badge.level === 'real'
                ? 'bg-emerald-200 text-emerald-900'
                : badge.level === 'experimental'
                  ? 'bg-amber-200 text-amber-900'
                  // 'manual-fallback' (inhaler, currently) and 'mock' both
                  // render neutral — no color should suggest live ML is
                  // doing anything when it isn't.
                  : 'bg-ink/10 text-ink/60'
            }`}
          >
            <ScanEye size={9} strokeWidth={2.5} />
            {badge.label}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <LanguageSwitcher lang={lang} setLang={setLang} languages={languages} compact />
          <button
            onClick={onExit}
            className="w-10 h-10 grid place-items-center bg-bone/90 backdrop-blur border-2 border-ink rounded-lg shadow-brutal-sm hover:bg-bone"
            title={t('exit')}
          >
            <X size={16} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* Bottom instruction panel — kept deliberately compact so it doesn't
          cover the camera; the AR anchor overlay is the primary "what to do
          where" guide now, this is a fallback/detail strip. */}
      <div className="fixed inset-x-0 bottom-0 z-[10000] p-2 sm:p-3 pointer-events-none">
        <div className="card-glass animate-slide-up pointer-events-auto overflow-hidden max-w-md mx-auto">
          {/* Progress */}
          <div className="px-3 pt-2">
            <div className="h-1 bg-ink/10 rounded-full overflow-hidden">
              <div className="h-full bg-primary transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
          </div>

          {/* Status line */}
          {status && (
            <div className="px-3 pt-1.5 flex items-center gap-2">
              <status.icon size={13} className={`${status.tone} ${status.spin ? 'animate-spin' : ''}`} strokeWidth={2.5} />
              <span className="font-mono text-[10px] uppercase tracking-wider text-ink/70">
                {t(status.key, { object: subjectLabel })}
              </span>
            </div>
          )}

          {/* Step content */}
          <div className="px-3 pt-1.5 pb-2">
            {state === STATES.COMPLETE ? (
              <div className="text-center py-1.5">
                <CheckCircle2 className="mx-auto text-emerald-500 mb-1.5" size={28} strokeWidth={2.5} />
                <h3 className="font-display font-bold text-lg">{t('complete')}</h3>
              </div>
            ) : step ? (
              <>
                <h3 className="font-display font-bold text-base sm:text-lg text-ink leading-tight">{step.title}</h3>
                <p className="mt-0.5 text-xs text-ink/80 leading-relaxed">{instruction}</p>

                {state === STATES.UNCERTAIN && (
                  <p className="mt-1 text-xs text-amber-700 font-mono">{t('uncertainHint')}</p>
                )}

                {/* What the model currently thinks it's seeing — shown for incorrect/uncertain
                    too, not just while actively verifying, so "needs adjustment" comes with
                    "here's what it read" instead of leaving you to guess why. The perception
                    service keeps re-evaluating in the background even after a verdict settles
                    (until Retry resets it), so this keeps updating live. */}
                {!mockMode && (state === STATES.INCORRECT || state === STATES.UNCERTAIN) && debugReading?.stepLabel && (
                  <p className="mt-1 text-xs font-mono text-ink/50">
                    Currently reading: {debugReading.stepLabel.replace(/_/g, ' ')} ({Math.round((debugReading.confidence || 0) * 100)}%)
                  </p>
                )}

                <button
                  onClick={() => onExplain(lang)}
                  className="mt-2 inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-primary"
                >
                  <Sparkles size={12} strokeWidth={2.5} />
                  {t('explain')}
                </button>

                {explaining && <p className="mt-2 font-mono text-xs text-ink/60">…</p>}
                {explanation?.explanation && !explaining && (
                  <div className="mt-2 p-2.5 bg-accent/20 border-2 border-ink rounded-xl">
                    <p className="text-sm text-ink leading-relaxed">{explanation.explanation}</p>
                    {explanation.commonMistakes?.length > 0 && (
                      <ul className="mt-2 space-y-1">
                        {explanation.commonMistakes.map((m, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs text-ink/70">
                            <AlertTriangle size={12} className="shrink-0 mt-0.5" />
                            <span>{m}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </>
            ) : null}
          </div>

          {/* Controls */}
          {state !== STATES.COMPLETE && (
            <div className="px-3 pb-2 space-y-1.5">
              {(state === STATES.INCORRECT || state === STATES.UNCERTAIN) && (
                <button onClick={onRetry} className="btn-primary w-full py-2.5">
                  <RotateCcw size={16} strokeWidth={2.5} /> {t('retry')}
                </button>
              )}

              {!mockMode && manualStepAvailable && state === STATES.GUIDING && (
                <div>
                  <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-ink/40 mb-1.5">
                    Not camera-verifiable — confirm manually
                  </p>
                  <button onClick={onConfirmManual} className="btn-primary w-full py-2.5">
                    <CheckCircle2 size={16} strokeWidth={2.5} /> I've done this
                  </button>
                </div>
              )}

              {!mockMode && !manualStepAvailable && state === STATES.GUIDING && (
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-wider text-ink/50 flex items-center gap-2">
                    <Loader2 size={12} className="animate-spin" strokeWidth={2.5} />
                    Hold the position — auto-verifying…
                  </p>
                  {/* Raw model reading, when the perception source exposes one (currently
                      inhaler's frame classifier) — makes a never-settling window visible as
                      "it's guessing X" rather than an opaque spinner. Never shown for the
                      rule-engine workflows (BP/eye-drops/nasal-spray), which don't set this. */}
                  {debugReading?.stepLabel && (
                    <p className="mt-1 font-mono text-[9px] text-ink/40">
                      reading: {debugReading.stepLabel.replace(/_/g, ' ')} ({Math.round((debugReading.confidence || 0) * 100)}%)
                    </p>
                  )}
                </div>
              )}

              {mockMode && state === STATES.GUIDING && (
                <div>
                  <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-ink/40 mb-1.5">{t('devModeLabel')}</p>
                  <div className="grid grid-cols-3 gap-2">
                    <button onClick={() => onSimulate('correct')} className="btn-ghost py-2 text-xs px-2">
                      <CheckCircle2 size={14} /> {t('simulateCorrect')}
                    </button>
                    <button onClick={() => onSimulate('incorrect')} className="btn-ghost py-2 text-xs px-2">
                      <AlertTriangle size={14} /> {t('simulateIncorrect')}
                    </button>
                    <button onClick={() => onSimulate('uncertain')} className="btn-ghost py-2 text-xs px-2">
                      <HelpCircle size={14} /> {t('simulateUncertain')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Safety boundary — always visible */}
          <div className="px-3 pb-2 pt-1 border-t-2 border-ink/10">
            <p className="font-mono text-[8px] text-ink/50 leading-relaxed line-clamp-2">
              {medicalBoundary || t('disclaimerGeneral')}
            </p>
          </div>

          {state === STATES.COMPLETE && (
            <div className="px-3 pb-3">
              <button onClick={onDone} className="btn-primary w-full py-2">
                Done <ChevronRight size={16} strokeWidth={2.5} />
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default GuidancePanel;
