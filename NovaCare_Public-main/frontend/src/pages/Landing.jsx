import { Link } from 'react-router-dom'
import { Brand } from '../components/layout/PortalShell'
import SignalCore from '../components/visuals/SignalCore'
import Magnetic from '../components/visuals/Magnetic'
import Reveal from '../components/visuals/Reveal'
import HealthInsights from '../components/HealthInsights'

export function RoleSelection() {
  const roles = [
    ['patient', 'Patient', 'Follow a guided check and keep your readings together.', '♡'],
    ['asha', 'ASHA worker', 'Support patients through assisted measurements.', '♧'],
    ['doctor', 'Doctor', 'Review patient readings and their history.', '✚'],
  ]
  return (
    <div className="nc-public">
      <header className="nc-public-nav"><Brand /><Link to="/">Back to home</Link></header>
      <main className="nc-role-page">
        <span className="nc-eyebrow">One platform. Connected care.</span>
        <h1>Welcome to NovaCare</h1>
        <p>Choose how you would like to continue.</p>
        <div className="nc-grid three">
          {roles.map(([r, t, d, i]) => (
            <Link className="nc-card nc-role-card" key={r} to={'/login/' + r}>
              <span className="nc-icon">{i}</span><h2>{t}</h2><p>{d}</p><strong>Continue →</strong>
            </Link>
          ))}
        </div>
        <p className="nc-caption">Your existing role and access permissions apply.</p>
      </main>
    </div>
  )
}

const STEPS = [
  ['01', 'Follow the guidance', 'Simple instructions help you use your reference device.'],
  ['02', 'Record your reading', 'Save BP and glucose with the context that matters.'],
  ['03', 'See the bigger picture', 'Review your readings over time and discuss them with your doctor.'],
]
const AUDIENCES = [
  ['patient', 'For patients', 'Build confidence with guided checks and a personal reading history.'],
  ['asha', 'For ASHA workers', 'Help patients record measurements in a shared, familiar workflow.'],
  ['doctor', 'For doctors', 'Review available patient records and clearly separated trends.'],
]

export default function Landing() {
  return (
    <div className="nc-public nc-public-dark">
      <div className="nc-grid-veil" aria-hidden="true" />
      <header className="nc-public-nav">
        <Brand />
        <nav>
          <a href="#how">How it works</a>
          <a href="#learn">Health pointers</a>
          <a href="#roles">Who it's for</a>
          <Link to="/login">Sign in</Link>
          <Magnetic><Link className="nc-primary" to="/login">Get started ↗</Link></Magnetic>
        </nav>
      </header>

      <main>
        <section className="nc-hero nc-hero-signal">
          <div className="nc-hero-copy">
            <span className="nc-eyebrow">Guided care, connected</span>
            <h1>Your health.<br /><em>A clearer picture.</em></h1>
            <p>Guided checks. Connected records.<br />Care that keeps you informed.</p>
            <div className="nc-actions">
              <Magnetic><Link to="/login" className="nc-primary">Get started →</Link></Magnetic>
              <a href="#learn" className="nc-secondary">Explore health tips ↗</a>
            </div>
            <p className="nc-caption">AI assists. Your doctor decides.</p>
          </div>
          <div className="nc-hero-visual-wrap">
            <SignalCore />
            <div className="nc-hero-topics">
              <a href="#learn" className="nc-hero-topic"><span aria-hidden="true">♡</span><div><strong>Blood pressure</strong><small>Cuff-guided checks</small></div><span aria-hidden="true">↗</span></a>
              <a href="#learn" className="nc-hero-topic"><span aria-hidden="true">◈</span><div><strong>Blood glucose</strong><small>Glucometer guidance</small></div><span aria-hidden="true">↗</span></a>
            </div>
          </div>
        </section>

        <section className="nc-public-section" id="learn"><HealthInsights /></section>

        <Reveal as="section" className="nc-public-section" id="how">
          <span className="nc-eyebrow">Simple from the first step</span>
          <h2>Your check, at your pace.</h2>
          <div className="nc-grid three">
            {STEPS.map(([n, t, d]) => (
              <article key={n} className="nc-card"><span className="nc-icon">{n}</span><h3>{t}</h3><p>{d}</p></article>
            ))}
          </div>
        </Reveal>

        <Reveal as="section" id="roles" className="nc-public-section nc-soft">
          <span className="nc-eyebrow">Connected through care</span>
          <h2>A place for everyone involved.</h2>
          <div className="nc-grid three">
            {AUDIENCES.map(([r, t, d]) => (
              <article className="nc-card" key={r}>
                <h3>{t}</h3><p>{d}</p>
                <Link to={'/login/' + r}>Continue as {r === 'asha' ? 'ASHA worker' : r} →</Link>
              </article>
            ))}
          </div>
        </Reveal>

        <Reveal as="section" className="nc-public-section nc-research">
          <div>
            <span className="nc-eyebrow">An experimental research module</span>
            <h2>Explore the pulse behind the reading.</h2>
            <p>PPG research brings signal quality and heart rate into view. Any cuffless BP output is labelled Experimental BP Estimate.</p>
          </div>
          <p>Commercial cuffs and glucometers provide reference readings. NovaCare supports awareness and recording, not diagnosis.</p>
        </Reveal>
      </main>

      <footer className="nc-public-nav">
        <Brand /><span>NovaCare · Nirmaan project · AI assists. Your doctor decides.</span>
      </footer>
    </div>
  )
}
