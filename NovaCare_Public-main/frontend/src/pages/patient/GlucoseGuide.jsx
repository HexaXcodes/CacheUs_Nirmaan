import {useEffect,useState} from 'react'
import {useNavigate} from 'react-router-dom'
import {useCopy} from '../../i18n/nirmaan'
import {useLang} from '../../context/LanguageContext'
import Measurements,{Reading} from './Measurements'
import StepAnimation from '../../components/guide/StepAnimation'
import {getGlucoseGuideSteps} from '../../components/guide/glucoseSteps'

/** Camera-free animated guide. Instructional only: the app does not verify any step. Saving reuses <Measurements view="capture">. */
export default function GlucoseGuide({patientIdOverride,onExit,screeningId,onSwitchToAR}){
  const t=useCopy(),navigate=useNavigate(),{lang}=useLang()
  const [step,setStep]=useState(0),[saved,setSaved]=useState(null)
  const steps=getGlucoseGuideSteps(lang),cur=steps[step],last=step===steps.length-1
  useEffect(()=>()=>window.speechSynthesis?.cancel(),[])
  const move=d=>{window.speechSynthesis?.cancel();setStep(s=>Math.max(0,Math.min(steps.length-1,s+d)))}
  const speak=()=>{if(!window.speechSynthesis)return;window.speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(cur.text);u.lang={en:'en-IN',hi:'hi-IN',kn:'kn-IN'}[cur.instruction[lang]?lang:'en']||'en-IN';window.speechSynthesis.speak(u)}
  const exit=()=>{window.speechSynthesis?.cancel();onExit?onExit():navigate('/patient/check')}
  return <section className="nc-card nc-stack" aria-label="Glucose guided steps">
    <div><span className="nc-eyebrow">NovaCare</span><h1>{t('Glucose Measurement')}</h1></div>
    {saved?<>
      <span className="nc-eyebrow">{saved.status==='rejected'?'Measurement rejected':'Reading saved'}</span><Reading row={saved}/>
      <div className="nc-actions"><button className="nc-secondary" onClick={()=>setSaved(null)}>{t('Try another reading')}</button><button className="nc-primary" onClick={exit}>{t('Done →')}</button></div>
    </>:<>
      <div className="nc-section-heading"><span className="nc-eyebrow">Step {step+1} / {steps.length}</span>{typeof window.speechSynthesis!=='undefined'&&<button className="nc-read-aloud" onClick={speak}>{t('Read aloud')}</button>}</div>
      <StepAnimation stepId={cur.id}/>
      <h2>{cur.title}</h2><p>{cur.text}</p>
      {!cur.instruction[lang]&&<small>English instructions shown for this language.</small>}
      {last&&<Measurements key="glucose" initialKind="glucose" patientIdOverride={patientIdOverride} view="capture" screeningId={screeningId} onSaved={setSaved}/>}
      {onSwitchToAR&&<button type="button" className="nc-secondary" onClick={()=>{window.speechSynthesis?.cancel();onSwitchToAR()}}>{t('Switch to camera AR')}</button>}
      <div className="nc-actions"><button className="nc-secondary" disabled={step===0} onClick={()=>move(-1)}>{t('Back')}</button>{!last&&<button className="nc-primary" onClick={()=>move(1)}>{t('Next')} →</button>}</div>
      <small className="nc-ar-boundary">Animation is a guide only; the app cannot check your steps. Readings come from your device.</small>
    </>}
  </section>
}
