import { useAuth } from '../context/AuthContext';

const ICONS = { cert:'\u2B22', finding:'\u25B2', doc:'\u25F2', audit:'\u25C8', system:'\u25C9', action_required:'\u25B6', audit_assigned:'\u25C8', finding_overdue:'\u25B2', audit_due:'\u25A0', doc_shared:'\u25F2' };
const COLORS = { cert:'bg-seal-bg text-seal-dark', finding:'bg-danger-bg text-danger', doc:'bg-info-bg text-info', audit:'bg-violet-bg text-violet', system:'bg-gray-200 text-gray-700', action_required:'bg-warning-bg text-warning', audit_assigned:'bg-violet-bg text-violet', finding_overdue:'bg-danger-bg text-danger', audit_due:'bg-warning-bg text-warning', doc_shared:'bg-info-bg text-info' };

export default function NotificationPanel({ open, onClose, notifications = [], setNotifications }) {
  const { authHeaders } = useAuth();
  
  const handleMarkAllRead = () => {
    fetch('/api/notifications/mark-all-read', { method: 'POST', headers: authHeaders })
      .catch(console.error);
    if (setNotifications) {
      setNotifications(notifications.map(n => ({ ...n, unread: false })));
    }
  };

  const unread = notifications.filter(n => n.unread).length;

  if (!open) return null;

  return (
    <div className="absolute top-14 right-20 w-96 max-h-[440px] overflow-y-auto bg-surface border border-border rounded-xl shadow-lg z-30">
      <div className="p-3 border-b border-border flex justify-between items-center text-sm font-semibold">
        Notifications {unread > 0 && <span className="ml-1 bg-seal text-white text-[10px] px-1.5 rounded">{unread}</span>}
        <button onClick={handleMarkAllRead} className="text-[11px] text-seal-dark font-semibold">Mark all read</button>
      </div>
      {notifications.length === 0 ? (
        <div className="p-6 text-center text-xs text-gray-400">No notifications</div>
      ) : (
        notifications.map(n => (
          <div key={n._id || n.id} className={`flex gap-3 p-3 border-b border-border ${n.unread ? 'bg-seal-bg/30' : ''}`}>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${COLORS[n.type] || COLORS.system}`}>{ICONS[n.type] || ICONS.system}</div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold">{n.title}</div>
              <div className="text-[11px] text-gray-500 mt-0.5">{n.body}</div>
            </div>
            <span className="text-[10px] text-gray-400 whitespace-nowrap">{n.time || new Date(n.createdAt).toLocaleDateString()}</span>
          </div>
        ))
      )}
    </div>
  );
}
