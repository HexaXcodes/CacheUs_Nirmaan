// src/components/ar/ARAnchor.jsx
// ============================================================================
//  Reusable markerless AR anchor. Renders an indicator + label at a position
//  DERIVED FROM ML-PROVIDED NORMALIZED COORDINATES (0-1), translated into the
//  current camera viewport at render time. Nothing here is pinned to a fixed
//  screen position — move `x`/`y` and the anchor moves with it, exactly as
//  it would if a real perception model were driving it frame-by-frame.
//
//  Two shapes:
//   - "box"    (default) — rectangle + top pill label showing the SHORT
//               ACTION PHRASE for the current step (e.g. "Position mouthpiece"),
//               not just an object name — this is the primary "what to do"
//               cue for real (Level B) rule-verified steps.
//   - "circle" — a pulsing ring around the tracked hand/face, connected by a
//               line to the same short action-word callout, mirroring how a
//               clinician would hand-annotate a photo. Used for
//               anchored-but-unverified (Level C) steps: the ring shows real
//               tracking, the callout shows what to do there — it never
//               implies a verified verdict.
//
//  Two extra guidance layers, independent of shape:
//   - `tracked={false}` — nothing is actually being detected this frame
//     (hand/face/pose out of view, or the perception service hasn't locked
//     on yet). Renders a dashed, pulsing "searching" ring + a "Move into
//     view" hint instead of a confident-looking solid box, so the user is
//     never shown a tracking indicator for something that isn't tracked.
//   - Two-point `landmarks` (a "target" + a "current position", e.g. eye
//     and fingertip) draw a connecting guide line with an arrowhead pointing
//     at the target — an explicit "move it here" cue, not just a box that
//     happens to contain both points.
//
//  <ARAnchor target="inhaler" x={0.55} y={0.42} width={0.2} height={0.15}
//             status="incorrect" instruction="Position mouthpiece" />
// ============================================================================
import { CheckCircle2, AlertTriangle, HelpCircle, Loader2, Target, ScanSearch } from 'lucide-react';

const STATUS_STYLE = {
  detecting: { ring: 'border-white/50', line: 'text-white/60', icon: Loader2, spin: true, badge: 'bg-white/20' },
  guiding: { ring: 'border-accent', line: 'text-accent', icon: Target, spin: false, badge: 'bg-accent/90' },
  verifying: { ring: 'border-white', line: 'text-white/80', icon: Loader2, spin: true, badge: 'bg-white/30' },
  correct: { ring: 'border-emerald-400', line: 'text-emerald-400', icon: CheckCircle2, spin: false, badge: 'bg-emerald-500' },
  incorrect: { ring: 'border-urgent', line: 'text-urgent', icon: AlertTriangle, spin: false, badge: 'bg-urgent' },
  uncertain: { ring: 'border-amber-400', line: 'text-amber-400', icon: HelpCircle, spin: false, badge: 'bg-amber-500' }
};

// Arrowhead + guide line from the current tracked position (`from`) toward
// the target it needs to reach (`to`) — both normalized 0-1 points.
const GuideLine = ({ from, to, colorClass }) => {
  const angle = (Math.atan2((to.y - from.y) * 100, (to.x - from.x) * 100) * 180) / Math.PI;
  return (
    <svg className="absolute inset-0 w-full h-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
      <line
        x1={from.x * 100} y1={from.y * 100} x2={to.x * 100} y2={to.y * 100}
        strokeWidth="0.6" strokeDasharray="2.2 1.6" className={colorClass} stroke="currentColor"
      />
      <g transform={`translate(${to.x * 100} ${to.y * 100}) rotate(${angle})`}>
        <polygon points="0,0 -3.2,-1.4 -3.2,1.4" className={colorClass} fill="currentColor" />
      </g>
    </svg>
  );
};

const ARAnchor = ({
  target,
  x = 0.5,
  y = 0.5,
  width = 0.24,
  height = 0.18,
  landmarks = [],
  status = 'guiding',
  label,
  instruction,
  tracked = true,
  shape = 'box'
}) => {
  const style = STATUS_STYLE[status] || STATUS_STYLE.guiding;
  const Icon = style.icon;
  // Instruction (a short imperative phrase, e.g. "Position mouthpiece") is
  // ALWAYS preferred over a bare object/body-part name — this is the fix for
  // "no proper overlay guiding the user what to do": every anchor now shows
  // an action, not just a tracking label.
  const displayLabel = instruction || label || target;

  const boxStyle = {
    left: `${(x - width / 2) * 100}%`,
    top: `${(y - height / 2) * 100}%`,
    width: `${width * 100}%`,
    height: `${height * 100}%`
  };

  // Two-point case (target + current tracked position, e.g. eye + fingertip,
  // or nose + fingertip): draw an explicit "move it here" guide line on top
  // of whichever shape below, regardless of box/circle.
  const guideLine =
    tracked && landmarks?.length === 2 ? (
      <GuideLine from={landmarks[1]} to={landmarks[0]} colorClass={style.line} />
    ) : null;

  // Nothing is actually being detected this frame — a confident-looking box
  // would be misleading. Show a distinctly different "searching" indicator.
  if (!tracked) {
    return (
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute rounded-2xl border-[3px] border-dashed border-white/50 animate-pulse"
          style={boxStyle}
        />
        <div
          className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1.5 text-white"
          style={{ left: `${x * 100}%`, top: `${y * 100}%` }}
        >
          <ScanSearch size={28} className="animate-pulse" strokeWidth={2} />
          <span className="px-2.5 py-1 rounded-lg bg-black/50 backdrop-blur font-mono text-[10px] uppercase tracking-wider whitespace-nowrap">
            Move into view
          </span>
        </div>
      </div>
    );
  }

  if (shape === 'circle') {
    // Callout sits diagonally up-right of the ring, connected by a short
    // line — pull it back inside the viewport near the edges.
    const anchorPt = { x: x + (width / 2) * 0.72, y: y - (height / 2) * 0.72 };
    const labelPt = { x: Math.min(0.88, anchorPt.x + 0.1), y: Math.max(0.1, anchorPt.y - 0.09) };

    return (
      <div className="absolute inset-0 pointer-events-none">
        {guideLine}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <line
            x1={anchorPt.x * 100}
            y1={anchorPt.y * 100}
            x2={labelPt.x * 100}
            y2={labelPt.y * 100}
            strokeWidth="0.5"
            className={style.line}
            stroke="currentColor"
          />
        </svg>

        <div
          className={`absolute rounded-full border-[3px] transition-all duration-200 ${style.ring} ${
            status === 'guiding' || status === 'detecting' ? 'animate-pulse' : ''
          }`}
          style={boxStyle}
        />

        <div
          className={`absolute -translate-y-full flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg ${style.badge} backdrop-blur text-white font-display font-bold text-sm shadow-lg`}
          style={{ left: `${labelPt.x * 100}%`, top: `${labelPt.y * 100}%`, transform: 'translate(-10%, -100%)' }}
        >
          <Icon size={14} className={style.spin ? 'animate-spin' : ''} strokeWidth={2.5} />
          {displayLabel}
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 pointer-events-none">
      {guideLine}
      {/* Bounding region */}
      <div
        className={`absolute rounded-2xl border-[3px] transition-all duration-200 ${style.ring} ${
          status === 'guiding' || status === 'detecting' ? 'animate-pulse' : ''
        }`}
        style={boxStyle}
      >
        <div className={`absolute -top-9 left-0 flex items-center gap-1.5 px-2.5 py-1 rounded-lg ${style.badge} backdrop-blur text-white text-xs font-display font-bold shadow-lg whitespace-nowrap`}>
          <Icon size={12} className={style.spin ? 'animate-spin' : ''} strokeWidth={2.5} />
          {displayLabel}
        </div>
      </div>

      {/* Landmark dots (single-point or >2-point cases — the 2-point
          target/current case is already drawn as a guide line above) */}
      {landmarks.length !== 2 &&
        landmarks.map((lm, i) => (
          <div
            key={lm.name || i}
            className="absolute w-3 h-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary border-2 border-white shadow-lg"
            style={{ left: `${lm.x * 100}%`, top: `${lm.y * 100}%` }}
          />
        ))}
    </div>
  );
};

export default ARAnchor;
