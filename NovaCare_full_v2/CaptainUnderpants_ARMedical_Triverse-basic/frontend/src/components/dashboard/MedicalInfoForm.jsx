// src/components/dashboard/MedicalInfoForm.jsx
import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import ErrorMsg from '../common/ErrorMsg';

// Helper: convert array <-> comma string for input fields
const arrToStr = (a) => (Array.isArray(a) ? a.join(', ') : '');
const strToArr = (s) => (s || '').split(',').map((x) => x.trim()).filter(Boolean);

const MedicalInfoForm = ({ initial = {}, onSave }) => {
  const [form, setForm] = useState({
    age: '',
    gender: '',
    bloodGroup: '',
    conditions: '',
    allergies: '',
    notes: ''
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [savedAt, setSavedAt] = useState(null);

  useEffect(() => {
    setForm({
      age: initial?.age ?? '',
      gender: initial?.gender ?? '',
      bloodGroup: initial?.bloodGroup ?? '',
      conditions: arrToStr(initial?.conditions),
      allergies: arrToStr(initial?.allergies),
      notes: initial?.notes ?? ''
    });
  }, [initial]);

  const handleChange = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await onSave({
        age: form.age ? Number(form.age) : undefined,
        gender: form.gender || undefined,
        bloodGroup: form.bloodGroup || undefined,
        conditions: strToArr(form.conditions),
        allergies: strToArr(form.allergies),
        notes: form.notes || undefined
      });
      setSavedAt(new Date());
    } catch (err) {
      setError(err.message || 'Could not save profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div>
          <label className="label-display block mb-1.5">Age</label>
          <input className="input-field" type="number" value={form.age} onChange={handleChange('age')} placeholder="e.g. 45" />
        </div>
        <div>
          <label className="label-display block mb-1.5">Gender</label>
          <input className="input-field" value={form.gender} onChange={handleChange('gender')} placeholder="e.g. F" />
        </div>
        <div>
          <label className="label-display block mb-1.5">Blood</label>
          <input className="input-field" value={form.bloodGroup} onChange={handleChange('bloodGroup')} placeholder="e.g. O+" />
        </div>
      </div>

      <div>
        <label className="label-display block mb-1.5">Conditions</label>
        <input
          className="input-field"
          value={form.conditions}
          onChange={handleChange('conditions')}
          placeholder="diabetes, hypertension"
        />
        <p className="font-mono text-[10px] text-ink/50 mt-1">Separate with commas</p>
      </div>

      <p className="font-mono text-[10px] text-ink/50 -mt-1">
        Manage your medications and reminders from the Today section below — this profile is used for AI coaching context only.
      </p>

      <div>
        <label className="label-display block mb-1.5">Allergies</label>
        <input
          className="input-field"
          value={form.allergies}
          onChange={handleChange('allergies')}
          placeholder="penicillin, peanuts"
        />
      </div>

      <div>
        <label className="label-display block mb-1.5">Notes</label>
        <textarea
          className="input-field min-h-[80px]"
          value={form.notes}
          onChange={handleChange('notes')}
          placeholder="Anything else the AI should know"
        />
      </div>

      <ErrorMsg>{error}</ErrorMsg>

      <div className="flex items-center justify-between gap-3">
        {savedAt ? (
          <p className="font-mono text-xs text-ink/60">
            Saved at {savedAt.toLocaleTimeString()}
          </p>
        ) : <span />}
        <button type="submit" disabled={saving} className="btn-primary">
          <Save size={16} strokeWidth={2.5} />
          {saving ? 'Saving…' : 'Save Profile'}
        </button>
      </div>
    </form>
  );
};

export default MedicalInfoForm;
