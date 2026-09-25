// HUD primitive library — brutalist + futuristic terminal
// All components use the cyan/blue palette from CSS vars

const ncPalette = {
  bg: '#F5F9FF', bg2: '#FFFFFF',
  surface: '#FFFFFF', surface2: '#EAF3FF',
  line: '#DCE6F2', line2: '#CBD5E1',
  cyan: '#2563EB', cyanBright: '#153E75',
  blue: '#2563EB', blueBright: '#4C8BFF',
  amber: '#B45309', red: '#B91C1C', green: '#15803D',
  ink: '#14243B', ink2: '#475569', ink3: '#64748B',
};

// ──────────────────────────────────────
// Corner bracket frames
// ──────────────────────────────────────
function CornerBracket({ pos, color = ncPalette.cyan, size = 12, thick = 1.5 }) {
  const positions = {
    tl: { top: -1, left: -1, borderTop: `${thick}px solid ${color}`, borderLeft: `${thick}px solid ${color}` },
    tr: { top: -1, right: -1, borderTop: `${thick}px solid ${color}`, borderRight: `${thick}px solid ${color}` },
    bl: { bottom: -1, left: -1, borderBottom: `${thick}px solid ${color}`, borderLeft: `${thick}px solid ${color}` },
    br: { bottom: -1, right: -1, borderBottom: `${thick}px solid ${color}`, borderRight: `${thick}px solid ${color}` },
  };
  return <div style={{ position: 'absolute', width: size, height: size, pointerEvents: 'none', ...positions[pos] }} />;
}

function HUDFrame({ children, style = {}, accent = ncPalette.cyan, brackets = true, inset = 0 }) {
  return (
    <div style={{ position: 'relative', ...style }}>
      {children}
      {brackets && (
        <React.Fragment>
          <CornerBracket pos="tl" color={accent} />
          <CornerBracket pos="tr" color={accent} />
          <CornerBracket pos="bl" color={accent} />
          <CornerBracket pos="br" color={accent} />
        </React.Fragment>
      )}
    </div>
  );
}

// ──────────────────────────────────────
// Mono label / chip
// ──────────────────────────────────────
function HUDLabel({ children, color = ncPalette.cyan, size = 10, style = {} }) {
  return (
    <span className="mono" style={{
      fontSize: size, fontWeight: 600, color, letterSpacing: 1.4,
      textTransform: 'uppercase', ...style,
    }}>{children}</span>
  );
}

function StatusDot({ color = ncPalette.green, blink = true, size = 7 }) {
  return (
    <span style={{
      display: 'inline-block', width: size, height: size, borderRadius: 0,
      background: color, boxShadow: `0 0 8px ${color}`,
      animation: blink ? 'nc-blink 1.4s infinite' : 'none',
    }} />
  );
}

// ──────────────────────────────────────
// Brutalist button
// ──────────────────────────────────────
function HUDButton({ children, onClick, disabled, variant = 'primary', style = {}, ...rest }) {
  const variants = {
    primary: {
      background: ncPalette.cyan, color: '#000814',
      border: `1.5px solid ${ncPalette.cyanBright}`,
      boxShadow: `4px 4px 0 0 ${ncPalette.blue}, 0 0 24px rgba(34,211,238,0.4)`,
    },
    secondary: {
      background: 'transparent', color: ncPalette.cyan,
      border: `1.5px solid ${ncPalette.line2}`,
    },
    ghost: {
      background: 'transparent', color: ncPalette.ink2,
      border: `1.5px solid ${ncPalette.line}`,
    },
  };
  return (
    <button onClick={onClick} disabled={disabled} {...rest} style={{
      padding: '16px 22px', fontFamily: 'inherit',
      fontWeight: 700, fontSize: 15, letterSpacing: 0.5,
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.4 : 1,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 10,
      borderRadius: 2,
      textTransform: 'uppercase',
      ...variants[variant],
      ...style,
    }}>{children}</button>
  );
}

// ──────────────────────────────────────
// Scan line overlay (subtle animated horizontal line)
// ──────────────────────────────────────
function ScanLine({ color = ncPalette.cyan, opacity = 0.4 }) {
  return (
    <div style={{
      position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none',
    }}>
      <div style={{
        position: 'absolute', left: 0, right: 0, top: 0, height: 1,
        background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
        opacity, boxShadow: `0 0 8px ${color}`,
        animation: 'nc-scanline 4s linear infinite',
      }} />
    </div>
  );
}

// ──────────────────────────────────────
// Grid backdrop for cards
// ──────────────────────────────────────
function GridBackdrop({ size = 16, color = 'rgba(34,211,238,0.08)' }) {
  return (
    <div style={{
      position: 'absolute', inset: 0, pointerEvents: 'none',
      backgroundImage: `linear-gradient(${color} 1px, transparent 1px), linear-gradient(90deg, ${color} 1px, transparent 1px)`,
      backgroundSize: `${size}px ${size}px`,
    }} />
  );
}

// ──────────────────────────────────────
// HUD readout row (label + value, mono)
// ──────────────────────────────────────
function ReadoutRow({ label, value, color = ncPalette.cyan, valueColor = ncPalette.ink }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '6px 0', borderBottom: `1px dashed ${ncPalette.line}`,
    }}>
      <HUDLabel color={ncPalette.ink3} size={9.5}>{label}</HUDLabel>
      <span className="mono" style={{ fontSize: 12, fontWeight: 600, color: valueColor }}>{value}</span>
    </div>
  );
}

// ──────────────────────────────────────
// Brutalist HUD card (sharp edge, layered offset)
// ──────────────────────────────────────
function HUDCard({ children, style = {}, accent = ncPalette.cyan, offset = false, onClick }) {
  return (
    <div onClick={onClick} style={{
      position: 'relative',
      background: ncPalette.surface,
      border: `1.5px solid ${ncPalette.line2}`,
      borderRadius: 2,
      cursor: onClick ? 'pointer' : 'default',
      ...(offset ? { boxShadow: `4px 4px 0 0 ${accent}` } : {}),
      ...style,
    }}>{children}</div>
  );
}

Object.assign(window, {
  ncPalette, CornerBracket, HUDFrame, HUDLabel, StatusDot,
  HUDButton, ScanLine, GridBackdrop, ReadoutRow, HUDCard, HeroPanel,
  StartScreeningButton,
});

// ──────────────────────────────────────
// StartScreeningButton — hero CTA (used in patient portal)
// ──────────────────────────────────────
function StartScreeningButton({ children, onClick }) {
  return (
    <button className="nc-cta" onClick={onClick} style={{
      width: '100%', position: 'relative',
      background: ncPalette.cyan, color: '#001520',
      border: `1.5px solid ${ncPalette.cyanBright}`,
      borderRadius: 2, padding: '22px 22px',
      fontFamily: 'inherit', fontWeight: 700, fontSize: 16,
      letterSpacing: 1.2, textTransform: 'uppercase',
      overflow: 'visible',
      marginTop: 18, marginRight: 12, marginBottom: 12
    }}>
      <span className="nc-cta-ring" />

      <span style={{ position: 'absolute', top: -1, left: -1, width: 10, height: 10, borderTop: '2px solid #001520', borderLeft: '2px solid #001520', pointerEvents: 'none' }} />
      <span style={{ position: 'absolute', top: -1, right: -1, width: 10, height: 10, borderTop: '2px solid #001520', borderRight: '2px solid #001520', pointerEvents: 'none' }} />
      <span style={{ position: 'absolute', bottom: -1, left: -1, width: 10, height: 10, borderBottom: '2px solid #001520', borderLeft: '2px solid #001520', pointerEvents: 'none' }} />
      <span style={{ position: 'absolute', bottom: -1, right: -1, width: 10, height: 10, borderBottom: '2px solid #001520', borderRight: '2px solid #001520', pointerEvents: 'none' }} />

      <span style={{ position: 'relative', zIndex: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        <span style={{
          width: 8, height: 8, background: '#001520',
          animation: 'nc-blink 1.2s infinite'
        }} />
        <span>{children}</span>
        <span className="nc-cta-arrow" style={{ display: 'inline-flex' }}>
          <IconArrowRight size={20} color="#001520" strokeWidth={2.4} />
        </span>
      </span>

      <span className="mono" style={{
        position: 'relative', zIndex: 3,
        display: 'block', marginTop: 6,
        fontSize: 9.5, fontWeight: 700, color: 'rgba(0,21,32,0.65)',
        letterSpacing: 2, textTransform: 'uppercase'
      }}>▶ INITIATE.SCAN · 02:00</span>
    </button>);

}

// ──────────────────────────────────────
// HeroPanel — diagnostic terminal (ECG + telemetry)
// Used in: patient portal (post-login real-time vitals)
// ──────────────────────────────────────
function HeroPanel() {
  const wavePath = "M0,80 L36,80 L42,80 L48,60 L54,80 L60,80 L66,28 L72,132 L78,60 L84,80 L120,80 L156,80 L162,80 L168,62 L174,80 L180,80 L186,30 L192,130 L198,60 L204,80 L240,80 L276,80 L282,80 L288,60 L294,80 L300,80 L306,28 L312,132 L318,60 L324,80 L366,80";

  return (
    <div style={{
      position: 'relative',
      background: ncPalette.bg2,
      border: `1.5px solid ${ncPalette.cyan}`,
      padding: 0, overflow: 'hidden',
      boxShadow: `4px 4px 0 0 ${ncPalette.blue}, 0 0 32px rgba(34,211,238,0.2)`,
    }}>
      <CornerBracket pos="tl" color={ncPalette.cyan} size={14} thick={2} />
      <CornerBracket pos="tr" color={ncPalette.cyan} size={14} thick={2} />
      <CornerBracket pos="bl" color={ncPalette.cyan} size={14} thick={2} />
      <CornerBracket pos="br" color={ncPalette.cyan} size={14} thick={2} />

      <GridBackdrop size={14} color="rgba(34,211,238,0.07)" />
      <ScanLine color={ncPalette.cyan} opacity={0.6} />

      <div style={{ position: 'relative', height: 200, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', height: 1, background: `${ncPalette.cyan}28` }} />
        <div style={{ position: 'absolute', top: 0, bottom: 0, left: '50%', width: 1, background: `${ncPalette.cyan}18` }} />

        <svg viewBox="0 0 366 160" width="100%" height="100%" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0 }}>
          <defs>
            <linearGradient id="hud-ecg" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stopColor={ncPalette.cyan} stopOpacity="0" />
              <stop offset="20%" stopColor={ncPalette.cyan} stopOpacity="1" />
              <stop offset="80%" stopColor={ncPalette.cyan} stopOpacity="1" />
              <stop offset="100%" stopColor={ncPalette.cyan} stopOpacity="0" />
            </linearGradient>
            <linearGradient id="hud-ecg-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={ncPalette.cyan} stopOpacity="0.25" />
              <stop offset="100%" stopColor={ncPalette.cyan} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={wavePath + " L366,160 L0,160 Z"} fill="url(#hud-ecg-fill)" />
          <path d={wavePath} fill="none" stroke="url(#hud-ecg)" strokeWidth="2"
            style={{ filter: `drop-shadow(0 0 6px ${ncPalette.cyan})` }} />
          <circle r="3.5" fill={ncPalette.cyanBright}
            style={{ filter: `drop-shadow(0 0 8px ${ncPalette.cyanBright})` }}>
            <animateMotion dur="3.2s" repeatCount="indefinite" path={wavePath} />
          </circle>
        </svg>

        <div style={{
          position: 'absolute', right: 14, top: 14,
          padding: '6px 10px', background: 'rgba(5,8,20,0.85)',
          border: `1px solid ${ncPalette.cyan}`, display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <span className="mono" style={{ fontSize: 10, fontWeight: 700, color: ncPalette.cyan }}>HR</span>
          <span className="mono" style={{ fontSize: 14, fontWeight: 700, color: ncPalette.ink, letterSpacing: -0.5 }}>74</span>
          <span className="mono" style={{ fontSize: 9, color: ncPalette.ink2 }}>bpm</span>
        </div>
      </div>

      <div style={{
        position: 'relative',
        borderTop: `1px dashed ${ncPalette.line2}`,
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
      }}>
        {[
          { label: 'BP', val: '122/78', unit: 'mmHg', tag: 'OK', color: ncPalette.green },
          { label: 'GLU', val: '142', unit: 'mg/dL', tag: 'HI', color: ncPalette.amber },
          { label: 'O\u2082', val: '98', unit: '%', tag: 'OK', color: ncPalette.green },
        ].map((m, i) => (
          <div key={m.label} style={{
            padding: '10px 12px',
            borderRight: i < 2 ? `1px dashed ${ncPalette.line2}` : 'none',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <HUDLabel color={ncPalette.ink2} size={9}>{m.label}</HUDLabel>
              <span className="mono" style={{ fontSize: 8.5, fontWeight: 700, color: m.color, letterSpacing: 1 }}>{m.tag}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 3, marginTop: 3 }}>
              <span className="mono" style={{ fontSize: 16, fontWeight: 700, color: ncPalette.ink, letterSpacing: -0.5 }}>{m.val}</span>
              <span className="mono" style={{ fontSize: 9.5, color: ncPalette.ink2 }}>{m.unit}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
