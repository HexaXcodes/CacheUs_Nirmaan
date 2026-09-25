import {Link} from 'react-router-dom'
import {useAuth} from '../../context/AuthContext'
import {useCarePlan} from './ConditionGuide'
import {useCopy} from '../../i18n/nirmaan'
export default function CheckSelection(){const {user}=useAuth(),plan=useCarePlan(user.patient_id),t=useCopy();return <div className="nc-stack"><h1>{t('Doctor-enabled guidance')}</h1>{plan.loading?<p>{t('Loading doctor instructions…')}</p>:plan.error?<p role="alert">{plan.error}</p>:<>{!plan.conditions.length&&<p>{t('Your doctor must record the relevant condition first.')}</p>}<div className="nc-grid">{[['hypertension','bp','Blood pressure'],['diabetes','glucose','Blood glucose']].filter(([c])=>plan.conditions.includes(c)).map(([c,path,title])=><Link key={c} className="nc-card nc-choice" to={'/patient/check/'+path}><h2>{t(title)}</h2><strong>{t('Open AR guide →')}</strong></Link>)}</div></>}<Link to="/patient/history">{t('View history →')}</Link></div>}
