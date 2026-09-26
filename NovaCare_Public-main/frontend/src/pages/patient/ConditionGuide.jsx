import {useCopy} from '../../i18n/nirmaan'
import {useEffect,useState} from 'react'
import {Link} from 'react-router-dom'
import {useAuth} from '../../context/AuthContext'
import client from '../../api/client'
import ARMeasurement from './ARMeasurement'
import GlucoseGuide from './GlucoseGuide'
const KEY='nc_glucose_mode'
const readMode=()=>{try{return sessionStorage.getItem(KEY)==='ar'?'ar':'anim'}catch{return 'anim'}}
export function GlucoseChooser(){
 const t=useCopy(),[mode,setMode]=useState('choose')
 const pick=m=>{try{sessionStorage.setItem(KEY,m)}catch{};setMode(m)}
 useEffect(()=>{if(readMode()==='ar')setMode('ar')},[])
 if(mode==='ar')return <><button type="button" className="nc-secondary" onClick={()=>pick('anim')}>{t('Back to animations')}</button><ARMeasurement initialKind="glucose" lockKind/></>
 if(mode==='anim')return <GlucoseGuide onSwitchToAR={()=>pick('ar')}/>
 return <section className="nc-card nc-stack" aria-label="Glucose guide options"><h2>{t('How would you like to be guided?')}</h2><div className="nc-actions"><button type="button" className="nc-primary" onClick={()=>pick('anim')}>{t('Watch step animations')}<br/><small>{t('No camera needed')}</small></button><button type="button" className="nc-secondary" onClick={()=>pick('ar')}>{t('Use camera AR guide')}<br/><small>{t('Asks for camera permission')}</small></button></div></section>
}
export function useCarePlan(patientId){
 const [state,setState]=useState({loading:true,conditions:[],error:''})
 useEffect(()=>{let active=true;setState({loading:true,conditions:[],error:''});client.get('/measurements/screening/care-plan/'+encodeURIComponent(patientId)).then(({data})=>{if(active)setState({...data,loading:false,error:''})}).catch(()=>{if(active)setState({loading:false,conditions:[],error:'Unable to load doctor instructions.'})});return()=>{active=false}},[patientId])
 return state
}
export default function ConditionGuide({kind}){
 const t=useCopy(),{user}=useAuth(),plan=useCarePlan(user.patient_id)
 if(plan.loading)return <p role="status">{t('Loading doctor instructions…')}</p>
 if(plan.error)return <p role="alert">{plan.error}</p>
 if(!plan.conditions.includes(kind==='glucose'?'diabetes':'hypertension'))return <section className="nc-card"><h2>{t('Guidance not enabled')}</h2><p>{t('Your doctor must record the relevant condition first.')}</p><Link to="/patient/history">View your records →</Link></section>
 if(kind==='glucose')return <GlucoseChooser/>
 return <ARMeasurement initialKind={kind} lockKind/>
}

