import { useState } from 'react';
import { useApi, fmtDate, statusColor } from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';

export default function Notifications() {
  const { authHeaders } = useAuth();
  const { data: response, loading, error, refetch } = useApi('/api/notifications');
  const notifications = response?.data || response || [];
  const unreadCount = notifications.filter(n => n.unread).length;

  const markRead = async (id) => {
    await fetch(`/api/notifications/${id}/read`, { method: 'PATCH', headers: authHeaders });
    refetch();
  };

  const markAllRead = async () => {
    await fetch('/api/notifications/mark-all-read', { method: 'POST', headers: authHeaders });
    refetch();
  };

  const typeLabel = (type) => {
    const map = { cert_expiry: 'Certificate', finding_overdue: 'Finding', doc_shared: 'Document', audit_due: 'Audit', audit_assigned: 'Audit' };
    return map[type] || 'General';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="page-title">Notifications</h1>
          <p className="page-sub">In-app alerts for expiring certificates, overdue findings and audit updates</p>
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="btn btn-outline btn-sm">Mark all read</button>
        )}
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-sm text-gray-400">Loading notifications...</div>
        ) : error ? (
          <div className="p-16 text-center text-sm text-danger">Failed to load notifications</div>
        ) : notifications.length === 0 ? (
          <div className="p-16 text-center text-gray-400">
            <div className="text-2xl mb-2">🔔</div>
            <p className="text-sm">No notifications</p>
            <p className="text-[11px] mt-1">You are all caught up</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {notifications.map((n) => (
              <div key={n.id || n._id} className={`p-4 flex items-start gap-3 ${n.unread ? 'bg-blue-50/30' : ''}`}>
                <div className={`w-2 h-2 mt-2 rounded-full ${n.unread ? 'bg-accent' : 'bg-gray-300'}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`badge ${statusColor(typeLabel(n.type))}`}>{typeLabel(n.type)}</span>
                    <span className="text-[11px] text-gray-500">{fmtDate(n.createdAt)}</span>
                  </div>
                  <p className="text-sm font-medium text-ink-900">{n.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{n.body}</p>
                </div>
                {n.unread && (
                  <button onClick={() => markRead(n.id || n._id)} className="btn btn-ghost btn-sm">Mark read</button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
