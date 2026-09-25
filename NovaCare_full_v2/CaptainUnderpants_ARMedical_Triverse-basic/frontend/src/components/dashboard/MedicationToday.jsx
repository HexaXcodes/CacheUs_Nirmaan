// src/components/dashboard/MedicationToday.jsx
// Today's medication reminders. Dose/instructions always come from the
// patient's own structured medication records (POST /api/medications) —
// nothing here is generated or suggested by NovaCare.
import { useEffect, useState, useCallback } from 'react';
import { Pill, Check, X as SkipIcon, ChevronRight } from 'lucide-react';
import Card from '../common/Card';
import Spinner from '../common/Spinner';
import ErrorMsg from '../common/ErrorMsg';
import { medicationService } from '../../services/medicationService';

const STATUS_STYLE = {
  pending: 'bg-white/60 border-ink/20',
  taken: 'bg-emerald-100 border-emerald-600',
  skipped: 'bg-ink/5 border-ink/20 opacity-60',
  missed: 'bg-urgent/10 border-urgent'
};

const STATUS_LABEL = {
  pending: 'DUE',
  taken: 'TAKEN',
  skipped: 'SKIPPED',
  missed: 'MISSED'
};

const MedicationToday = () => {
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busyKey, setBusyKey] = useState(null);
  const [expanded, setExpanded] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await medicationService.today();
      setSchedule(res.schedule || []);
    } catch (err) {
      // Not fatal to the dashboard — show empty state rather than blocking.
      setError(err.message || null);
      setSchedule([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const act = async (item, status) => {
    const key = `${item.medicationId}:${item.scheduledTime}`;
    setBusyKey(key);
    try {
      await medicationService.log(item.medicationId, { scheduledTime: item.scheduledTime, status });
      await load();
    } catch (err) {
      setError(err.message || 'Could not update medication.');
    } finally {
      setBusyKey(null);
    }
  };

  const visible = expanded ? schedule : schedule.slice(0, 3);

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="label-display">Today</p>
          <h2 className="font-display font-bold text-2xl">Medication reminders</h2>
        </div>
        <Pill className="text-primary" size={22} strokeWidth={2.5} />
      </div>

      {loading ? (
        <Spinner label="loading…" />
      ) : error && schedule.length === 0 ? (
        <p className="font-mono text-xs text-ink/50">No reminders available right now.</p>
      ) : schedule.length === 0 ? (
        <p className="font-mono text-xs text-ink/60">
          No medications scheduled for today. Add one from your prescription to get reminders.
        </p>
      ) : (
        <div className="space-y-2.5">
          {visible.map((item) => {
            const key = `${item.medicationId}:${item.scheduledTime}`;
            const busy = busyKey === key;
            return (
              <div
                key={key}
                className={`flex items-center justify-between gap-3 p-3 border-2 rounded-xl transition ${STATUS_STYLE[item.status]}`}
              >
                <div className="min-w-0">
                  <p className="font-display font-bold text-sm leading-tight uppercase truncate">{item.name}</p>
                  <p className="font-mono text-xs text-ink/60 mt-0.5">
                    {item.dosage} · {item.scheduledTime}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {item.status === 'pending' ? (
                    <>
                      <button
                        disabled={busy}
                        onClick={() => act(item, 'taken')}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 text-white rounded-lg text-[10px] font-mono uppercase tracking-wider hover:bg-emerald-700 disabled:opacity-50"
                      >
                        <Check size={12} strokeWidth={3} /> Taken
                      </button>
                      <button
                        disabled={busy}
                        onClick={() => act(item, 'skipped')}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-ink/10 text-ink rounded-lg text-[10px] font-mono uppercase tracking-wider hover:bg-ink/20 disabled:opacity-50"
                      >
                        <SkipIcon size={12} strokeWidth={3} /> Skip
                      </button>
                    </>
                  ) : (
                    <span className="font-mono text-[10px] uppercase tracking-wider text-ink/50">
                      {STATUS_LABEL[item.status]}
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          {schedule.length > 3 && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="w-full flex items-center justify-center gap-1 py-2 font-mono text-xs uppercase tracking-wider text-primary"
            >
              {expanded ? 'Show less' : 'View Schedule'}
              <ChevronRight size={12} className={expanded ? '-rotate-90 transition' : 'rotate-90 transition'} />
            </button>
          )}
        </div>
      )}

      <ErrorMsg className="mt-3">{schedule.length > 0 ? error : null}</ErrorMsg>
    </Card>
  );
};

export default MedicationToday;
