import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi, statusColor, fmtDate, daysLeft } from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';

const DAYS_SOON = 14;

export default function MyWorkspace() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: auditsRes, loading: auditsLoading, error: auditsError } = useApi('/api/audits');
  const { data: notifRes, loading: notifLoading } = useApi('/api/notifications');

  const audits = auditsRes?.data || auditsRes || [];
  const notifications = notifRes?.data || notifRes || [];

  const mine = useMemo(() => {
    if (!user) return [];
    return audits.filter((a) =>
      a.lead === user?.name || a.auditors?.includes(user?.name) || a.lead === user?.email
    );
  }, [audits, user]);

  const now = Date.now();
  const stats = useMemo(() => {
    const overdue = mine.filter((a) => a.status !== 'Closed' && a.due && new Date(a.due) < now);
    const dueSoon = mine.filter((a) => a.status !== 'Closed' && a.due && daysLeft(a.due) <= DAYS_SOON && daysLeft(a.due) >= 0);
    const inProgress = mine.filter((a) => a.status !== 'Closed');
    const unread = notifications.filter((n) => n.unread).length;
    return {
      total: mine.length,
      inProgress: inProgress.length,
      overdue: overdue.length,
      dueSoon: dueSoon.length,
      unread,
    };
  }, [mine, notifications]);

  const sorted = useMemo(() =>
    [...mine].sort((a, b) => (a.due && b.due ? new Date(a.due) - new Date(b.due) : 0)),
  [mine]);

  const dueBadge = (a) => {
    if (!a.due) return null;
    const d = daysLeft(a.due);
    if (d < 0) return <span className="badge badge-danger">Overdue {Math.abs(d)}d</span>;
    if (d <= DAYS_SOON) return <span className="badge badge-warning">Due in {d}d</span>;
    return <span className="text-gray-400 text-[11px]">{fmtDate(a.due)}</span>;
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="page-title">My Workspace</h1>
        <p className="page-sub">Your assigned audits, upcoming deadlines and recent updates</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard label="Assigned Audits" value={stats.total} icon="📋" color="bg-info-bg text-info" />
        <StatCard label="Active" value={stats.inProgress} icon="◔" color="bg-seal-bg text-seal-dark" />
        <StatCard label="Due Soon (14d)" value={stats.dueSoon} icon="⏰" color="bg-warning-bg text-warning" />
        <StatCard label="Overdue" value={stats.overdue} icon="⚠" color="bg-danger-bg text-danger" />
        <StatCard label="Unread Notifications" value={stats.unread} icon="🔔" color="bg-success-bg text-success" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-4">
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <h4 className="text-sm font-semibold">My Audits</h4>
            <button onClick={() => navigate('/auditor-workspace')} className="text-xs text-seal-dark hover:underline">Open Auditor Workspace &rarr;</button>
          </div>
          {auditsLoading ? (
            <div className="p-16 text-center text-sm text-gray-400">Loading audits...</div>
          ) : auditsError ? (
            <div className="p-16 text-center text-sm text-danger">Failed to load audits</div>
          ) : sorted.length === 0 ? (
            <div className="p-16 text-center text-gray-400">
              <div className="text-2xl mb-2">📋</div>
              <p className="text-sm">No audits assigned to you yet</p>
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-paper/50 text-gray-500">
                  <th className="text-left px-4 py-3 font-medium">Audit</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="text-left px-4 py-3 font-medium">Due</th>
                  <th className="text-left px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((a) => (
                  <tr key={a._id || a.id} onClick={() => navigate(`/audits/${a._id || a.id}`)}
                    className="border-b border-border/50 hover:bg-paper cursor-pointer">
                    <td className="px-4 py-3">
                      <div className="font-medium">{a.title}</div>
                      <div className="text-[10px] text-gray-400">{a.type}</div>
                    </td>
                    <td className="px-4 py-3"><span className={`badge ${statusColor(a.status)}`}>{a.status}</span></td>
                    <td className="px-4 py-3 text-gray-500">{fmtDate(a.due)}</td>
                    <td className="px-4 py-3">{dueBadge(a)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <h4 className="text-sm font-semibold">Recent Notifications</h4>
            <button onClick={() => navigate('/notifications')} className="text-xs text-seal-dark hover:underline">View all</button>
          </div>
          {notifLoading ? (
            <div className="p-12 text-center text-sm text-gray-400">Loading notifications...</div>
          ) : notifications.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              <div className="text-2xl mb-2">🔔</div>
              <p className="text-sm">No notifications</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.slice(0, 6).map((n) => (
                <div key={n._id || n.id} className="px-4 py-3 flex items-start gap-2.5">
                  <div className={`w-2 h-2 mt-1.5 rounded-full shrink-0 ${n.unread ? 'bg-accent' : 'bg-gray-300'}`} />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-ink-900">{n.title}</p>
                    <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-2">{n.body}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, color }) {
  return (
    <div className="bg-surface border border-border rounded-lg p-4 flex items-center gap-3">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm ${color}`}>{icon}</div>
      <div>
        <div className="text-xl font-display font-semibold text-ink-900">{value ?? '—'}</div>
        <div className="text-[10px] text-gray-500">{label}</div>
      </div>
    </div>
  );
}
