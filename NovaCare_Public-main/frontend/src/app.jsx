import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { AuthProvider } from "./context/AuthContext"
import { LanguageProvider } from "./context/LanguageContext"
import { ToastProvider } from "./context/ToastContext"
import ProtectedRoute from "./components/layout/ProtectedRoute"

import Landing, { RoleSelection } from "./pages/Landing"
import Overview from "./pages/patient/Overview"
import CheckSelection from "./pages/patient/CheckSelection"
import ConditionGuide from "./pages/patient/ConditionGuide"
import ReviewQueue from "./pages/doctor/ReviewQueue"
import CarePortal from "./pages/CarePortal"
import AshaLogin from "./pages/auth/AshaLogin"
import PatientLogin from "./pages/auth/PatientLogin"
import DoctorLogin from "./pages/auth/DoctorLogin"

import NewPatient from "./pages/asha/NewPatient"
import PatientProfile from "./pages/asha/PatientProfile"
import ScreeningWizard from "./pages/asha/screening/ScreeningWizard"

import PatientDashboard from "./pages/patient/Dashboard"
import Measurements from "./pages/patient/Measurements"
import PatientReport from "./pages/patient/Report"
import DietAdvice from "./pages/patient/DietAdvice"
import PatientLayout from "./components/layout/PatientLayout"
import Profile from "./pages/patient/Profile"
import UpcomingCheckups from "./pages/patient/UpcomingCheckups"
import Medications from "./pages/patient/Medications"
import ScreeningHistory from "./pages/patient/ScreeningHistory"
import FamilyHealth from "./pages/patient/FamilyHealth"
import Settings from "./pages/patient/Settings"
import DigitalHealthCardPage from "./pages/patient/DigitalHealthCardPage"

import Heatmap from "./pages/doctor/Heatmap"
import Campaigns from "./pages/doctor/Campaigns"
import RiskCalculator from "./pages/doctor/RiskCalculator"

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <LanguageProvider>
          <ToastProvider>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<RoleSelection />} />
              <Route path="/login/patient" element={<PatientLogin />} />
              <Route path="/login/asha" element={<AshaLogin />} />
              <Route path="/login/doctor" element={<DoctorLogin />} />

              <Route path="/asha" element={<ProtectedRoute allowedRole="asha"><CarePortal mode="overview" /></ProtectedRoute>} />
              <Route path="/asha/new-patient" element={<ProtectedRoute allowedRole="asha"><NewPatient /></ProtectedRoute>} />
              <Route path="/asha/screening" element={<ProtectedRoute allowedRole="asha"><CarePortal mode="check" /></ProtectedRoute>} />
              <Route path="/asha/screening/:patientId" element={<ProtectedRoute allowedRole="asha"><CarePortal mode="check" /></ProtectedRoute>} />
              <Route path="/asha/legacy-screening/:patientId" element={<ProtectedRoute allowedRole="asha"><ScreeningWizard /></ProtectedRoute>} />
              <Route path="/asha/patient/:patientId" element={<ProtectedRoute allowedRole="asha"><PatientProfile /></ProtectedRoute>} />

              <Route path="/asha/patients" element={<ProtectedRoute allowedRole="asha"><CarePortal mode="patients" /></ProtectedRoute>} />
<Route path="/asha/check" element={<ProtectedRoute allowedRole="asha"><CarePortal mode="check" /></ProtectedRoute>} />
<Route path="/asha/check/:patientId" element={<ProtectedRoute allowedRole="asha"><CarePortal mode="check" /></ProtectedRoute>} />
{/* Nested Patient Routes */}
              <Route path="/patient" element={<ProtectedRoute allowedRole="patient"><PatientLayout /></ProtectedRoute>}>
                <Route index element={<Overview />} />
<Route path="check" element={<CheckSelection />} />
<Route path="check/bp" element={<ConditionGuide kind="bp/reference" />} />
<Route path="check/glucose" element={<ConditionGuide kind="glucose" />} />
<Route path="check/ppg" element={<Navigate to="/patient/check" replace />} />
<Route path="trends" element={<Measurements view="history" />} />
                <Route path="legacy-dashboard" element={<PatientDashboard />} />
                <Route path="measurements" element={<Navigate to="/patient/check" replace />} />
                <Route path="profile" element={<Profile />} />
                <Route path="checkups" element={<UpcomingCheckups />} />
                <Route path="medications" element={<Medications />} />
                <Route path="diet" element={<DietAdvice />} />
                <Route path="history" element={<Measurements view="history" />} />
<Route path="screening-history" element={<ScreeningHistory />} />
                <Route path="family" element={<FamilyHealth />} />
                <Route path="settings" element={<Settings />} />
                <Route path="health-card" element={<DigitalHealthCardPage />} />
              </Route>
              <Route path="/patient/report/:sessionId" element={<ProtectedRoute allowedRole="patient"><PatientReport /></ProtectedRoute>} />

              <Route path="/doctor/queue" element={<ProtectedRoute allowedRole="doctor"><ReviewQueue /></ProtectedRoute>} />
<Route path="/doctor/patients/:patientId" element={<ProtectedRoute allowedRole="doctor"><CarePortal mode="patients" /></ProtectedRoute>} />
<Route path="/doctor" element={<ProtectedRoute allowedRole="doctor"><CarePortal mode="overview" /></ProtectedRoute>} />
              <Route path="/doctor/heatmap" element={<ProtectedRoute allowedRole="doctor"><Heatmap /></ProtectedRoute>} />
              <Route path="/doctor/patients" element={<ProtectedRoute allowedRole="doctor"><CarePortal mode="patients" /></ProtectedRoute>} />
              <Route path="/doctor/campaigns" element={<ProtectedRoute allowedRole="doctor"><Campaigns /></ProtectedRoute>} />
              <Route path="/doctor/risk-calc" element={<ProtectedRoute allowedRole="doctor"><RiskCalculator /></ProtectedRoute>} />

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </ToastProvider>
        </LanguageProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}


