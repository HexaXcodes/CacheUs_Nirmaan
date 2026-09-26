// Looping 2D instructional scenes (pure SVG + CSS). Instructional only: nothing here
// detects or verifies that the user performed a step.
const ALT={
  prepare_glucometer:'Animation: hands being washed with soap bubbles, then the glucometer turning on.',
  insert_strip:'Animation: a test strip sliding into the glucometer until it clicks.',
  prepare_lancet:'Animation: a fresh lancet being loaded into the lancing device and depth set.',
  obtain_sample:'Animation: the lancing device touching the side of a fingertip and a small blood drop forming.',
  apply_sample:'Animation: the edge of the test strip touching the blood drop.',
  wait_reading:'Animation: the glucometer screen counting down while you hold still.',
  complete_measurement:'Animation: the used strip removed and the lancet dropped into a sharps container.',
  log_result:'Animation: a glucometer screen showing a reading, and a note being written.',
}
const CSS=`
.nc-anim{width:100%;max-width:340px;margin:0 auto;display:block;color:var(--nc-ink,currentColor)}
.nc-anim .bg{fill:rgba(127,127,127,.12)}
.nc-anim .ln{stroke:currentColor;fill:none;stroke-width:3;stroke-linecap:round;stroke-linejoin:round}
.nc-anim .fl{fill:currentColor;opacity:.25}
.nc-anim .hl{fill:#22d3ee}.nc-anim .red{fill:#ef4444}
.nc-anim .a{animation-duration:3s;animation-iteration-count:infinite;animation-timing-function:ease-in-out}
.nc-anim .slide{animation-name:ncSlide}.nc-anim .tap{animation-name:ncTap}.nc-anim .pulse{animation-name:ncPulse}
.nc-anim .drop{animation-name:ncDrop}.nc-anim .wash{animation-name:ncWash}.nc-anim .fall{animation-name:ncFall}
@keyframes ncSlide{0%,15%{transform:translateX(-50px)}55%,100%{transform:translateX(0)}}
@keyframes ncTap{0%,30%{transform:translateY(-26px)}45%,60%{transform:translateY(0)}100%{transform:translateY(-26px)}}
@keyframes ncPulse{0%,100%{opacity:.25}50%{opacity:1}}
@keyframes ncDrop{0%,30%{transform:scale(0)}60%,100%{transform:scale(1)}}
@keyframes ncWash{0%,100%{transform:translateX(-12px)}50%{transform:translateX(12px)}}
@keyframes ncFall{0%{transform:translateY(-40px);opacity:0}30%{opacity:1}70%,100%{transform:translateY(0);opacity:1}}
@media (prefers-reduced-motion:reduce){.nc-anim .a{animation:none!important}}
`
const meter=(x,y)=><g transform={`translate(${x} ${y})`}><rect className="ln" width="90" height="120" rx="14"/><rect className="ln" x="12" y="14" width="66" height="36" rx="4"/></g>
const SCENES={
  prepare_glucometer:<g><g className="a wash"><rect className="fl" x="50" y="110" width="80" height="50" rx="20"/><rect className="ln" x="50" y="110" width="80" height="50" rx="20"/></g>
    {[70,100,120].map((x,i)=><circle key={x} className="ln a pulse" style={{animationDelay:i*.5+'s'}} cx={x} cy={90-i*10} r={6+i*2}/>)}
    {meter(190,60)}<circle className="hl a pulse" cx="235" cy="94" r="5"/></g>,
  insert_strip:<g>{meter(125,80)}<g className="a slide"><rect className="hl" x="150" y="30" width="14" height="60" rx="3"/></g></g>,
  prepare_lancet:<g><rect className="ln" x="70" y="100" width="150" height="40" rx="20"/><g className="a slide"><rect className="hl" x="30" y="112" width="36" height="16" rx="3"/></g><circle className="ln" cx="250" cy="120" r="16"/><path className="ln a pulse" d="M250 106v14"/></g>,
  obtain_sample:<g><rect className="fl" x="60" y="140" width="120" height="34" rx="17"/><rect className="ln" x="60" y="140" width="120" height="34" rx="17"/><g className="a tap"><rect className="ln" x="110" y="40" width="40" height="70" rx="10"/></g><circle className="red a drop" style={{transformOrigin:'150px 138px'}} cx="150" cy="138" r="7"/></g>,
  apply_sample:<g><circle className="red" cx="150" cy="150" r="8"/><g className="a tap"><rect className="hl" x="143" y="30" width="14" height="80" rx="3"/></g></g>,
  wait_reading:<g>{meter(125,60)}<text className="a pulse" x="170" y="106" textAnchor="middle" fontSize="28" fontWeight="700" fill="currentColor">5…</text></g>,
  complete_measurement:<g><rect className="ln" x="180" y="120" width="80" height="70" rx="8"/><path className="ln" d="M170 120h100"/><g className="a fall"><rect className="hl" x="216" y="30" width="8" height="70" rx="3"/></g><text x="220" y="212" textAnchor="middle" fontSize="12" fill="currentColor">Sharps</text></g>,
  log_result:<g>{meter(50,60)}<rect className="ln" x="190" y="90" width="80" height="90" rx="6"/><path className="ln a pulse" d="M202 115h56M202 135h56M202 155h30"/></g>,
}
export const STEP_ALT=ALT
export default function StepAnimation({stepId}){
  const scene=SCENES[stepId]
  if(!scene)return null
  return <svg className="nc-anim" viewBox="0 0 320 230" role="img" aria-label={ALT[stepId]} data-step={stepId}><style>{CSS}</style><rect className="bg" width="320" height="230" rx="16"/>{scene}</svg>
}
