// src/pages/Dashboard.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Activity, Heart, AlertCircle, ScanLine, FileText, ArrowRight, Pill } from 'lucide-react';
import PageShell from '../components/layout/PageShell';
import Card from '../components/common/Card';
import StatTile from '../components/dashboard/StatTile';
import MedicalInfoForm from '../components/dashboard/MedicalInfoForm';
import MedicationToday from '../components/dashboard/MedicationToday';
import UpNextCard from '../components/dashboard/UpNextCard';
import RecentActivity from '../components/dashboard/RecentActivity';
import { useAuth } from '../context/AuthContext';
import { medicationService } from '../services/medicationService';
import { PHASES } from '../data/careWorkflowsMeta';

const Dashboard = () => {
  const { user, updateMedicalInfo } = useAuth();
  const med = user?.medicalInfo || {};
  const [medicationCount, setMedicationCount] = useState(null);

  useEffect(() => {
    let cancelled = false;
    medicationService.list({ active: true })
      .then((list) => { if (!cancelled) setMedicationCount(list.length); })
      .catch(() => { if (!cancelled) setMedicationCount(0); });
    return () => { cancelled = true; };
  }, []);

  // "Up next" recommends the first fully-available phase — currently inhaler.
  const upNextPhase = PHASES[0];

  return (
    <PageShell>
      {/* Hero strip */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="label-display mb-2">Dashboard</p>
          <h1 className="font-display font-bold text-3xl sm:text-5xl leading-[0.95]">
            Hello, <span className="text-primary">{user?.name?.split(' ')[0] || 'there'}</span>.
          </h1>
          <p className="text-ink/70 mt-2">
            Your treatment guidance, reminders and health workflows.
          </p>
        </div>
        <Link to="/workflow" className="btn-primary">
          <ScanLine size={18} strokeWidth={2.5} />
          Care Workflows
          <ArrowRight size={16} strokeWidth={2.5} />
        </Link>
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        <StatTile label="Conditions" value={med.conditions?.length || 0} icon={Activity} />
        <StatTile label="Medications" value={medicationCount ?? '—'} icon={Pill} accent="accent" />
        <StatTile label="Allergies" value={med.allergies?.length || 0} icon={AlertCircle} />
        <StatTile label="Records" value={user?.reports?.length || 0} icon={FileText} accent="accent" />
      </div>

      {/* Today + Up Next + Recent Activity */}
      <div className="grid lg:grid-cols-3 gap-5 mb-5">
        <div className="lg:col-span-2">
          <MedicationToday />
        </div>
        <div className="space-y-5">
          <UpNextCard phase={upNextPhase} />
        </div>
      </div>

      {/* Profile + Recent activity + quick links */}
      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <Card>
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="label-display">Medical Profile</p>
                <h2 className="font-display font-bold text-2xl">Your patient context</h2>
              </div>
              <Heart className="text-primary" size={24} strokeWidth={2.5} />
            </div>
            <MedicalInfoForm initial={med} onSave={updateMedicalInfo} />
          </Card>
        </div>

        <div className="space-y-5">
          <RecentActivity />

          <Card>
            <p className="label-display mb-3">Quick Actions</p>
            <div className="space-y-2">
              <Link
                to="/workflow"
                className="flex items-center justify-between p-3 bg-white/60 border-2 border-ink rounded-lg hover:bg-primary hover:text-white transition group"
              >
                <span className="font-display font-semibold">Care Workflows</span>
                <ArrowRight size={16} className="group-hover:translate-x-1 transition" />
              </Link>
              <Link
                to="/upload"
                className="flex items-center justify-between p-3 bg-white/60 border-2 border-ink rounded-lg hover:bg-primary hover:text-white transition group"
              >
                <span className="font-display font-semibold">Medical Records</span>
                <ArrowRight size={16} className="group-hover:translate-x-1 transition" />
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </PageShell>
  );
};

export default Dashboard;
