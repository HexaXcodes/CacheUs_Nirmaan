// src/pages/UploadReport.jsx — "Medical Records"
import { useEffect, useState } from 'react';
import { CheckCircle2, FileText } from 'lucide-react';
import PageShell from '../components/layout/PageShell';
import Card from '../components/common/Card';
import UploadDropzone from '../components/upload/UploadDropzone';
import ErrorMsg from '../components/common/ErrorMsg';
import Spinner from '../components/common/Spinner';
import { reportService } from '../services/reportService';
import { useAuth } from '../context/AuthContext';

const CATEGORIES = [
  { id: 'prescription', label: 'Prescription' },
  { id: 'lab_report', label: 'Lab Report' },
  { id: 'medical_record', label: 'Medical Record' },
  { id: 'other', label: 'Other' }
];

const UploadReport = () => {
  const { refreshProfile } = useAuth();
  const [category, setCategory] = useState('prescription');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [reports, setReports] = useState([]);
  const [loadingList, setLoadingList] = useState(true);

  const loadReports = async () => {
    setLoadingList(true);
    try {
      const list = await reportService.list();
      setReports(list);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => { loadReports(); }, []);

  const handleFile = async (file) => {
    setError(null); setSuccess(null);
    setUploading(true);
    try {
      const res = await reportService.upload(file, category);
      setSuccess(`Uploaded: ${res.report.originalName}`);
      await loadReports();
      refreshProfile().catch(() => {});
    } catch (err) {
      setError(err.message || 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <PageShell>
      <div className="mb-8">
        <p className="label-display mb-2">Records</p>
        <h1 className="font-display font-bold text-3xl sm:text-5xl leading-[0.95]">
          Your <span className="text-primary">medical records</span>.
        </h1>
        <p className="text-ink/70 mt-2 max-w-2xl">
          Add prescriptions, lab reports, or other supporting documents. NovaCare stores them for
          your reference — it does not run diagnosis or analysis on uploaded records.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <Card>
            <p className="label-display mb-2">Document type</p>
            <div className="flex flex-wrap gap-2 mb-4">
              {CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setCategory(c.id)}
                  className={`px-3 py-1.5 border-2 border-ink rounded-lg font-mono text-xs uppercase tracking-wider transition ${
                    category === c.id ? 'bg-primary text-white' : 'bg-white/70 hover:bg-white'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>

            <UploadDropzone onFile={handleFile} busy={uploading} />
            {uploading && (
              <div className="mt-4">
                <Spinner label="Uploading…" />
              </div>
            )}
            {success && (
              <div className="mt-4 flex items-center gap-2 p-3 bg-emerald-100 border-2 border-emerald-700 rounded-lg">
                <CheckCircle2 size={16} className="text-emerald-700" />
                <p className="font-mono text-xs text-emerald-900">{success}</p>
              </div>
            )}
            <div className="mt-4">
              <ErrorMsg>{error}</ErrorMsg>
            </div>
          </Card>
        </div>

        <div>
          <Card>
            <p className="label-display mb-3">Uploaded</p>
            {loadingList ? (
              <Spinner label="loading…" />
            ) : reports.length ? (
              <ul className="space-y-2">
                {reports.map((r, idx) => (
                  <li
                    key={r.filename || idx}
                    className="flex items-center gap-2 p-2 bg-white/60 border-2 border-ink rounded-lg"
                  >
                    <FileText size={16} className="text-primary flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm truncate">{r.originalName}</p>
                      <p className="font-mono text-[10px] text-ink/50">
                        {CATEGORIES.find((c) => c.id === r.category)?.label || 'Other'} ·{' '}
                        {new Date(r.uploadedAt).toLocaleString()}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="font-mono text-xs text-ink/60">Nothing here yet.</p>
            )}
          </Card>
        </div>
      </div>
    </PageShell>
  );
};

export default UploadReport;
