// NovaCare // Authenticate — Login screen
// Mobile-first HUD authentication

const { useState, useEffect, useRef } = React;

// Logo with pulsing rings
function PulseLogo({ size = 56 }) {
  return (
    <div style={{ position: 'relative', width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {/* Pulse rings */}
      <div style={{
        position: 'absolute', inset: 0, border: `1.5px solid ${ncPalette.cyan}`,
        animation: 'nc-logo-ring 2.6s ease-out infinite'
      }} />
      <div style={{
        position: 'absolute', inset: 0, border: `1.5px solid ${ncPalette.cyan}`,
        animation: 'nc-logo-ring 2.6s ease-out 1.3s infinite'
      }} />
      {/* Crosshair core */}
      <div style={{
        position: 'relative', width: size, height: size, background: ncPalette.cyan,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'nc-logo-breathe 2.6s ease-in-out infinite', flexDirection: "row", textAlign: "left"
      }}>
        <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 24 24" fill="none" stroke="#000814" strokeWidth="2.4" strokeLinecap="square">
          <path d="M12 3v6M12 15v6M3 12h6M15 12h6" />
          <rect x="9" y="9" width="6" height="6" fill="#000814" />
        </svg>
      </div>
    </div>);

}

// Field with scanning animation when focused
function HUDField({ label, type = 'text', placeholder, value, onChange, prefix, suffix, autoFocus, mono }) {
  const [focused, setFocused] = useState(false);
  return (
    <label style={{ display: 'block' }}>
      <div className="mono" style={{
        fontSize: 10, fontWeight: 700, color: focused ? ncPalette.cyan : ncPalette.ink2,
        letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 8,
        transition: 'color .2s'
      }}>
        {label}
      </div>
      <div className="nc-field" style={{
        position: 'relative',
        background: ncPalette.bg2,
        border: `1.5px solid ${ncPalette.line2}`,
        borderRadius: 2,
        padding: '14px 14px',
        display: 'flex', alignItems: 'center', gap: 10,
        overflow: 'hidden'
      }}>
        {/* Corner brackets when focused */}
        {focused &&
        <React.Fragment>
            <CornerBracket pos="tl" color={ncPalette.cyan} size={10} />
            <CornerBracket pos="tr" color={ncPalette.cyan} size={10} />
            <CornerBracket pos="bl" color={ncPalette.cyan} size={10} />
            <CornerBracket pos="br" color={ncPalette.cyan} size={10} />
          </React.Fragment>
        }

        {/* Scanning line when focused */}
        {focused &&
        <div style={{
          position: 'absolute', left: 0, right: 0, top: 0, height: '40%',
          background: `linear-gradient(180deg, transparent 0%, ${ncPalette.cyan}22 50%, ${ncPalette.cyan}00 100%)`,
          borderBottom: `1px solid ${ncPalette.cyan}88`,
          boxShadow: `0 0 12px ${ncPalette.cyan}`,
          pointerEvents: 'none',
          animation: 'nc-field-scan 1.8s ease-in-out infinite'
        }} />
        }

        {prefix &&
        <span className="mono" style={{
          fontSize: 14, fontWeight: 600, color: ncPalette.cyan, letterSpacing: 0.3, flexShrink: 0,
          paddingRight: 10, borderRight: `1px solid ${ncPalette.line2}`, marginRight: 4
        }}>{prefix}</span>
        }
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          autoFocus={autoFocus}
          style={{
            fontFamily: mono ? "'JetBrains Mono', ui-monospace, monospace" : "inherit",
            letterSpacing: mono ? 1 : 0.2
          }} />
        
        {suffix &&
        <span style={{ flexShrink: 0, color: ncPalette.ink2, display: 'flex', alignItems: 'center' }}>{suffix}</span>
        }
      </div>
    </label>);

}

// Segmented tabs
function Tabs({ value, onChange }) {
  const tabs = [
  { id: 'patient', label: 'Patient', icon: <IconUser size={16} /> },
  { id: 'asha', label: 'ASHA', icon: <IconBag size={16} /> },
  { id: 'doctor', label: 'Doctor', icon: <IconStethoscope size={16} /> }];


  return (
    <div style={{
      position: 'relative',
      background: ncPalette.bg2,
      border: `1.5px solid ${ncPalette.line2}`,
      borderRadius: 2,
      padding: 4,
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: 2
    }}>
      {/* Sliding indicator */}
      <div style={{
        position: 'absolute',
        top: 4, bottom: 4,
        left: `calc(${tabs.findIndex((t) => t.id === value)} * (100% - 8px) / 3 + 4px)`,
        width: 'calc((100% - 8px) / 3)',
        background: ncPalette.cyan,
        boxShadow: `0 0 16px rgba(34,211,238,0.5), inset 0 0 0 1px ${ncPalette.cyanBright}`,
        transition: 'left .3s cubic-bezier(.2,.8,.2,1)',
        zIndex: 0
      }} />
      {tabs.map((t) =>
      <button key={t.id} className="nc-tabseg" onClick={() => onChange(t.id)} style={{
        position: 'relative', zIndex: 1,
        padding: '12px 4px',
        background: 'transparent', border: 'none', cursor: 'pointer',
        color: value === t.id ? '#001520' : ncPalette.ink2,
        fontFamily: 'inherit', fontWeight: 700, fontSize: 13,
        letterSpacing: 0.5,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        borderRadius: 0
      }}>
          {t.icon}
          <span>{t.label}</span>
        </button>
      )}
    </div>);

}

// Submit button — layered brutalist (simpler than landing)
function SubmitButton({ children, onClick, disabled }) {
  return (
    <button className="nc-submit" onClick={onClick} disabled={disabled} style={{
      width: '100%', position: 'relative',
      background: ncPalette.cyan, color: '#001520',
      border: `1.5px solid ${ncPalette.cyanBright}`,
      borderRadius: 2, padding: '18px 22px',
      fontFamily: 'inherit', fontWeight: 700, fontSize: 15,
      letterSpacing: 1.2, textTransform: 'uppercase',
      cursor: 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
      marginRight: 12, marginBottom: 12
    }}>
      <span style={{ width: 6, height: 6, background: '#001520', animation: 'nc-blink 1.2s infinite' }} />
      <span>{children}</span>
      <IconArrowRight size={18} color="#001520" strokeWidth={2.4} />
    </button>);

}

// ───────────────────────────────────────────────
// Form panels
// ───────────────────────────────────────────────

function PatientForm({ onSubmit }) {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState('phone'); // phone | otp
  const valid = step === 'phone' ? phone.replace(/\D/g, '').length === 10 : otp.length === 6;

  return (
    <div style={{ display: 'grid', gap: 18, animation: 'nc-fade-in .35s ease' }}>
      {step === 'phone' ?
      <HUDField
        label="Mobile number"
        type="tel"
        prefix="+91"
        placeholder="98765 43210"
        value={phone}
        onChange={(v) => setPhone(v.replace(/[^\d ]/g, ''))}
        autoFocus
        mono /> :


      <React.Fragment>
          <div style={{ padding: '10px 12px', background: ncPalette.bg2, border: `1px solid ${ncPalette.line2}` }}>
            <HUDLabel color={ncPalette.ink2} size={9}>OTP SENT TO</HUDLabel>
            <div className="mono" style={{ fontSize: 13, fontWeight: 600, color: ncPalette.ink, marginTop: 3 }}>
              +91 {phone || '98765 43210'}
            </div>
          </div>
          <HUDField
          label="6-digit code"
          type="tel"
          placeholder="• • • • • •"
          value={otp}
          onChange={(v) => setOtp(v.replace(/\D/g, '').slice(0, 6))}
          autoFocus
          mono />
        
        </React.Fragment>
      }

      <SubmitButton onClick={() => {
        if (step === 'phone') setStep('otp');else
        onSubmit && onSubmit({ role: 'patient', phone, otp });
      }} disabled={!valid}>
        {step === 'phone' ? 'Send OTP' : 'Verify & Continue'}
      </SubmitButton>

      {step === 'otp' &&
      <button onClick={() => {setStep('phone');setOtp('');}} style={{
        background: 'transparent', border: 'none', color: ncPalette.cyan,
        fontFamily: 'inherit', fontSize: 12, fontWeight: 600,
        textTransform: 'uppercase', letterSpacing: 1, cursor: 'pointer', padding: 0,
        marginTop: -10
      }}>← Change number</button>
      }
    </div>);

}

function AshaForm({ onSubmit }) {
  const [id, setId] = useState('');
  const [pin, setPin] = useState('');
  const valid = id.length >= 5 && pin.length === 6;

  return (
    <div style={{ display: 'grid', gap: 18, animation: 'nc-fade-in .35s ease' }}>
      <HUDField
        label="ASHA ID"
        placeholder="MH-NSK-04823"
        value={id}
        onChange={(v) => setId(v.toUpperCase().replace(/[^A-Z0-9-]/g, ''))}
        autoFocus
        mono />
      
      <HUDField
        label="Village PIN"
        type="tel"
        placeholder="6-digit village code"
        value={pin}
        onChange={(v) => setPin(v.replace(/\D/g, '').slice(0, 6))}
        mono />
      
      <SubmitButton onClick={() => onSubmit && onSubmit({ role: 'asha', id, pin })} disabled={!valid}>
        Enter Portal
      </SubmitButton>
    </div>);

}

function DoctorForm({ onSubmit }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const valid = /\S+@\S+\.\S+/.test(email) && password.length >= 6;

  return (
    <div style={{ display: 'grid', gap: 18, animation: 'nc-fade-in .35s ease' }}>
      <HUDField
        label="Email"
        type="email"
        placeholder="doctor@hospital.in"
        value={email}
        onChange={setEmail}
        autoFocus />
      
      <HUDField
        label="Password"
        type={show ? 'text' : 'password'}
        placeholder="••••••••"
        value={password}
        onChange={setPassword}
        suffix={
        <button onClick={(e) => {e.preventDefault();setShow((s) => !s);}} style={{
          background: 'transparent', border: 'none', color: ncPalette.cyan,
          fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700,
          letterSpacing: 1, cursor: 'pointer', padding: '4px 6px',
          textTransform: 'uppercase'
        }}>{show ? 'Hide' : 'Show'}</button>
        } />
      
      <SubmitButton onClick={() => onSubmit && onSubmit({ role: 'doctor', email, password })} disabled={!valid}>
        Sign In
      </SubmitButton>
    </div>);

}

// ───────────────────────────────────────────────
// App
// ───────────────────────────────────────────────
function App() {
  // Read initial role from URL ?role=patient|asha|doctor
  const getInitialRole = () => {
    const m = window.location.search.match(/role=(patient|asha|doctor)/);
    return m ? m[1] : 'patient';
  };
  const [role, setRole] = useState(getInitialRole);
  const [authed, setAuthed] = useState(null);

  const handleSubmit = (creds) => {
    setAuthed(creds);
    // After confirmation animation, route back to landing with the role's portal open
    setTimeout(() => {
      window.location.href = 'index.html#role=' + creds.role;
    }, 1400);
  };

  return (
    <IOSDevice width={402} height={874} dark>
      <div className="nc-screen" style={{
        position: 'relative',
        width: '100%', height: '100%',
        background: ncPalette.bg,
        overflow: 'hidden',
        display: 'flex', flexDirection: 'column'
      }}>
        {/* Back button — top left */}
        <button
          className="nc-icon-btn"
          onClick={() => {window.location.href = 'index.html';}}
          aria-label="Back to landing"
          style={{
            position: 'absolute', top: 52, left: 16, zIndex: 5,
            width: 40, height: 40, borderRadius: 2,
            background: ncPalette.bg, border: `1.5px solid ${ncPalette.line2}`,
            color: ncPalette.cyan, cursor: 'pointer', padding: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
          <IconBack size={22} />
        </button>

        {/* Secure pill — top right */}
        <div style={{
          position: 'absolute', top: 56, right: 16, zIndex: 5,
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '5px 9px', border: `1px solid ${ncPalette.line2}`,
          background: ncPalette.bg
        }}>
          <StatusDot color={ncPalette.green} />
          <HUDLabel color={ncPalette.green} size={9}>SECURE</HUDLabel>
        </div>

        {/* Scrollable content */}
        <div style={{
          flex: 1, overflowY: 'auto',
          padding: '124px 22px 28px',
          display: 'flex', flexDirection: 'column'
        }}>
          {/* Logo cluster */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', animation: 'nc-fade .5s ease' }}>
            <PulseLogo size={52} />
            <div style={{ fontSize: 26, fontWeight: 700, color: ncPalette.ink, letterSpacing: -0.6, marginTop: 18 }}>
              NovaCare
            </div>
            <div style={{ fontSize: 14, color: ncPalette.ink2, marginTop: 4 }}>
              Sign in to continue.
            </div>
          </div>

          {/* Role badge — locked to URL param */}
          <div style={{ marginTop: 30, animation: 'nc-fade .55s ease' }}>
            <HUDLabel color={ncPalette.ink2} size={9.5} style={{ marginBottom: 8, display: 'block' }}>
              SIGNING IN AS
            </HUDLabel>
            {(() => {
              const meta = {
                patient: { label: 'Patient Portal',     icon: <IconUser size={20} />,        accent: ncPalette.cyan },
                asha:    { label: 'ASHA Worker Portal', icon: <IconBag size={20} />,         accent: ncPalette.amber },
                doctor:  { label: 'Doctor Portal',      icon: <IconStethoscope size={20} />, accent: ncPalette.blueBright },
              }[role];
              return (
                <div style={{
                  position: 'relative',
                  background: ncPalette.bg2,
                  border: `1.5px solid ${meta.accent}`,
                  padding: '12px 14px',
                  display: 'flex', alignItems: 'center', gap: 12,
                  boxShadow: `4px 4px 0 0 ${meta.accent}`,
                }}>
                  <CornerBracket pos="tl" color={meta.accent} />
                  <CornerBracket pos="br" color={meta.accent} />
                  <div style={{
                    width: 40, height: 40, background: ncPalette.bg,
                    border: `1.5px solid ${meta.accent}`,
                    color: meta.accent,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    boxShadow: `0 0 12px ${meta.accent}66`,
                  }}>{meta.icon}</div>
                  <div style={{ flex: 1, fontSize: 16, fontWeight: 700, color: ncPalette.ink, letterSpacing: -0.2 }}>
                    {meta.label}
                  </div>
                  <StatusDot color={meta.accent} />
                </div>
              );
            })()}
          </div>

          {/* Form region */}
          <div style={{ marginTop: 24, animation: 'nc-fade .6s ease' }}>
            {role === 'patient' && <PatientForm key="p" onSubmit={handleSubmit} />}
            {role === 'asha' && <AshaForm key="a" onSubmit={handleSubmit} />}
            {role === 'doctor' && <DoctorForm key="d" onSubmit={handleSubmit} />}
          </div>

          {/* Wrong portal? Go back */}
          {!authed && (
            <div style={{ marginTop: 8, display: 'flex', justifyContent: 'center' }}>
              <button
                className="nc-link"
                onClick={() => { window.location.href = 'index.html'; }}
                style={{
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  color: ncPalette.ink2, fontFamily: 'inherit',
                  fontSize: 12, fontWeight: 600, letterSpacing: 0.3,
                  padding: '8px 4px', display: 'inline-flex', alignItems: 'center', gap: 6,
                }}>
                <span style={{ color: ncPalette.cyan }}>←</span>
                Wrong portal? <span style={{ color: ncPalette.cyan }}>Go back</span>
              </button>
            </div>
          )}

          {/* Success toast */}
          {authed &&
          <div style={{
            marginTop: 6, padding: '12px 14px',
            background: 'rgba(16,240,160,0.08)',
            border: `1.5px solid ${ncPalette.green}`,
            display: 'flex', alignItems: 'center', gap: 10,
            animation: 'nc-fade .25s ease'
          }}>
              <div style={{
              width: 28, height: 28, background: ncPalette.green, color: '#001520',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
                <IconCheck size={14} strokeWidth={3} />
              </div>
              <div style={{ flex: 1 }}>
                <HUDLabel color={ncPalette.green} size={9}>AUTHENTICATED</HUDLabel>
                <div style={{ fontSize: 12.5, color: ncPalette.ink, marginTop: 2 }}>
                  Routing to {authed.role === 'patient' ? 'Patient' : authed.role === 'asha' ? 'ASHA Worker' : 'Doctor'} portal…
                </div>
              </div>
            </div>
          }

          {/* Spacer pushes footer down */}
          <div style={{ flex: 1, minHeight: 20 }} />

          {/* Footer help */}
          <div style={{ paddingTop: 18, borderTop: `1px dashed ${ncPalette.line2}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <button style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: ncPalette.ink2, fontFamily: 'inherit', fontSize: 12, fontWeight: 600,
              padding: 0, display: 'flex', alignItems: 'center', gap: 6
            }}>
              <IconHelp size={14} /> Need help?
            </button>
            <HUDLabel color={ncPalette.ink3} size={8.5}>v2.4 · ENCRYPTED</HUDLabel>
          </div>
        </div>
      </div>
    </IOSDevice>);

}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);