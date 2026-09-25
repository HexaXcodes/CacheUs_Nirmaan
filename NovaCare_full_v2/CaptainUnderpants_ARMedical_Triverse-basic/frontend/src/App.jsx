// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { WorkflowProvider } from './context/WorkflowContext';
import { LanguageProvider } from './context/LanguageContext';
import ProtectedRoute from './routes/ProtectedRoute';

import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import UploadReport from './pages/UploadReport';
import WorkflowSelect from './pages/WorkflowSelect';
import ARExperience from './pages/ARExperience';
import LandingPage from './pages/LandingPage';

const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <LanguageProvider>
        <WorkflowProvider>
          <Routes>
            {/* Auth */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Public scenario picker — works with or without login */}
            <Route path="/workflow" element={<WorkflowSelect />} />
            <Route path="/ar" element={<ARExperience />} />

            {/* Protected */}
            <Route path="/dashboard" element={
              <ProtectedRoute><Dashboard /></ProtectedRoute>
            } />
            <Route path="/upload" element={
              <ProtectedRoute><UploadReport /></ProtectedRoute>
            } />

            {/* Public landing page */}
            <Route path="/" element={<LandingPage />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </WorkflowProvider>
      </LanguageProvider>
    </AuthProvider>
  </BrowserRouter>
);

export default App;
