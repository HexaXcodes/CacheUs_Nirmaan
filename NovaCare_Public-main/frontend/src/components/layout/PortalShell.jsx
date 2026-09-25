import {useCopy} from '../../i18n/nirmaan'
import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useLang } from '../../context/LanguageContext'
export function Brand(){return <Link className="nc-brand" to="/"><span className="nc-mark">✚</span> NovaCare</Link>}
export default function PortalShell({children}) {
 const t=useCopy(); const {role,user,logout}=useAuth(); const {lang,changeLang,LANGS}=useLang(); const [open,setOpen]=useState(false)
 const links=role==='patient' ? [['/patient','Overview','◫'],['/patient/check','Health Check','♡'],['/patient/trends','History & Trends','↗'],['/patient/medications','Medications','▤'],['/patient/profile','Profile','○'],['/patient/settings','Settings','⚙']] : role==='asha' ? [['/asha','Overview','◫'],['/asha/patients','Patients','♧'],['/asha/new-patient','Add patient','+'],['/asha/check','Assisted check','♡']] : [['/doctor','Overview','◫'],['/doctor/queue','Review queue','↗'],['/doctor/patients','Patients','♧'],['/doctor/heatmap','Heatmap','▦']]
 return <div className="nc-shell">{open&&<button className="nc-scrim" aria-label="Close navigation" onClick={()=>setOpen(false)}/>}<aside className={'nc-sidebar '+(open?'is-open':'')}><Brand/><span className="nc-eyebrow">{role==='asha'?'ASHA worker':role} portal</span><nav>{links.map(([to,label,icon])=><NavLink key={to} end to={to} onClick={()=>setOpen(false)}><span aria-hidden="true">{icon}</span>{t(label)}</NavLink>)}</nav><div className="nc-sidebar-note"><strong>Care starts with clarity.</strong><p>One check at a time.</p></div><Link className="nc-signout" to="/" onClick={logout}>Sign out ↗</Link></aside><div className="nc-workspace"><header className="nc-header"><button className="nc-menu" aria-label="Open navigation" aria-expanded={open} onClick={()=>setOpen(!open)}>☰</button><span className="nc-header-title">Your health, thoughtfully connected</span><div className="nc-header-user"><label><span className="sr-only">Language</span><select value={lang} onChange={e=>changeLang(e.target.value)}>{Object.entries(LANGS).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label><span>{user?.name || role}</span><span className="nc-avatar">{(user?.name||role||'N')[0].toUpperCase()}</span></div></header><div className="nc-content">{children}</div><footer className="nc-footer">NovaCare · AI assists. Your doctor decides.</footer></div></div>
}


