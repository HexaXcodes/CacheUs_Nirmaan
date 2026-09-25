import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getPatient } from '../../api/patients'
import PortalShell from './PortalShell'
export default function PatientLayout(){
 const {user}=useAuth(); const [patient,setPatient]=useState(null); const [loading,setLoading]=useState(true); const [error,setError]=useState('')
 useEffect(()=>{let live=true; setLoading(true); if(!user?.patient_id){setLoading(false);return} getPatient(user.patient_id).then(r=>{if(live)setPatient(r.data)}).catch(()=>{if(live)setError('Profile could not be loaded.')}).finally(()=>{if(live)setLoading(false)});return()=>{live=false}},[user?.patient_id])
 return <PortalShell>{error&&<p role="alert" className="nc-alert">{error}</p>}<Outlet context={{patient,loading,setPatient}}/></PortalShell>
}
