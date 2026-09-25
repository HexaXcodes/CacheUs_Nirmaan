// src/components/dashboard/RecentActivity.jsx
import { useEffect, useState } from 'react';
import { CheckCircle2, Pill, Activity } from 'lucide-react';
import Card from '../common/Card';
import Spinner from '../common/Spinner';
import { sessionService } from '../../services/sessionService';
import { medicationService } from '../../services/medicationService';

const timeAgo = (iso) => {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

const RecentActivity = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [sessions, logs] = await Promise.all([
          sessionService.list().catch(() => []),
          medicationService.history({ }).catch(() => [])
        ]);

        const sessionItems = (sessions || [])
          .filter((s) => s.status === 'completed' || s.status === 'abandoned')
          .map((s) => ({
            id: `s:${s._id}`,
            icon: Activity,
            label: `${s.workflowId.replace(/_/g, ' ')} ${s.status === 'completed' ? 'session completed' : 'session ended'}`,
            at: s.completedAt || s.updatedAt
          }));

        const logItems = (logs || []).slice(0, 20).map((l) => ({
          id: `l:${l._id}`,
          icon: Pill,
          label: `${l.medication?.name || 'Medication'} ${l.status}`,
          at: l.createdAt
        }));

        const merged = [...sessionItems, ...logItems]
          .sort((a, b) => new Date(b.at) - new Date(a.at))
          .slice(0, 6);

        if (!cancelled) setItems(merged);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <Card>
      <p className="label-display mb-3">Recent Activity</p>
      {loading ? (
        <Spinner label="loading…" />
      ) : items.length ? (
        <ul className="space-y-2.5">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-2.5 text-sm">
              <item.icon size={14} className="text-primary shrink-0" strokeWidth={2.5} />
              <span className="capitalize truncate flex-1">{item.label}</span>
              <span className="font-mono text-[10px] text-ink/40 shrink-0">{timeAgo(item.at)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="font-mono text-xs text-ink/60">No activity yet. Start a guided session to see it here.</p>
      )}
    </Card>
  );
};

export default RecentActivity;
