import { useState, useCallback } from 'react';
import { ApiErrorState } from '../components/DataStateNotice';
import EntityFormModal from '../components/EntityFormModal';
import { fmtDate } from '../hooks/useApi';
import { usePaginatedApi } from '../hooks/usePaginatedApi';
import { useCrud } from '../hooks/useCrud';
import Pagination from '../components/Pagination';
import { useAuth } from '../context/AuthContext';
import { useCreateFromUrl } from '../hooks/useCreateFromUrl';
import { useConfirm } from '../components/ConfirmDialog';
import { useToast } from '../components/Toast';

/**
 * Roles an administrator can hand out. 'Super Admin' appears only for a Super
 * Admin: it bypasses tenant isolation, so an Organization Admin creating one
 * would be a platform-wide escalation. The server enforces the same rule in
 * shared/roles.js — this list only keeps the UI from offering an option that
 * would be rejected.
 */
const ASSIGNABLE_ROLES = [
  'Organization Admin', 'Compliance Manager', 'Audit Manager', 'Auditor',
  'Reviewer', 'Risk Manager', 'Document Manager', 'Vendor Manager',
  'Employee', 'External Company User', 'CA / Consultant',
];

const STATUSES = ['Active', 'Inactive', 'Suspended', 'On Leave'];

const createFields = (roles) => [
  { name: 'name', label: 'Full name', required: true, placeholder: 'Priya Sharma' },
  { name: 'email', label: 'Work email', type: 'email', required: true, placeholder: 'priya@company.com' },
  {
    name: 'password', label: 'Temporary password', type: 'password', required: true,
    placeholder: 'Min 8 characters', span: 2,
    help: 'Share this with the person; they can change it from Settings after signing in.',
  },
  { name: 'role', label: 'Role', type: 'select', options: roles, required: true },
  { name: 'status', label: 'Status', type: 'select', options: STATUSES, placeholder: 'Active' },
];

const editFields = (roles) => [
  { name: 'name', label: 'Full name', required: true },
  { name: 'email', label: 'Work email', type: 'email', required: true },
  { name: 'role', label: 'Role', type: 'select', options: roles, required: true },
  { name: 'status', label: 'Status', type: 'select', options: STATUSES, required: true },
];

export default function Users() {
  const { user: me } = useAuth();
  const confirm = useConfirm();
  const { toast } = useToast();
  const { data: users, loading, error, pagination, page, setPage, refetch } =
    usePaginatedApi('/api/users');

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(null);

  const close = useCallback(() => { setCreating(false); setEditing(null); }, []);
  const crud = useCrud('/api/users', { onDone: async () => { await refetch(); close(); } });

  /**
   * Confirm every write on screen.
   *
   * The dialog closing was the only signal that anything had happened, which
   * reads the same as the dialog being dismissed. A failure already shows its
   * reason in the form; a success said nothing at all.
   */
  async function run(action, onSuccess) {
    const res = await action;
    if (res?.ok) onSuccess();
    return res;
  }

  // "+ Create" in the top bar deep-links here with ?new=1.
  useCreateFromUrl(useCallback(() => setCreating(true), []));

  const roles = me?.role === 'Super Admin' ? ['Super Admin', ...ASSIGNABLE_ROLES] : ASSIGNABLE_ROLES;

  async function handleDeactivate(u) {
    const ok = await confirm({
      title: `Remove ${u.name}?`,
      message: `${u.email} will no longer be able to sign in.`,
      detail: 'The account is deactivated, not erased — their past actions stay in the audit trail.',
      confirmLabel: 'Remove user',
      tone: 'danger',
    });
    if (!ok) return;
    const res = await crud.remove(u.id);
    if (res?.ok) toast('User removed', `${u.name} can no longer sign in.`, 'success');
    else if (crud.error) toast('Could not remove user', crud.error, 'error');
  }

  const header = (
    <div className="flex items-start justify-between gap-4 flex-wrap">
      <div>
        <h1 className="text-2xl font-display font-semibold text-ink-900">User Management</h1>
        <p className="text-sm text-gray-500">Manage platform users and access controls</p>
      </div>
      <button
        onClick={() => { crud.clearError(); setCreating(true); }}
        className="text-xs font-semibold bg-seal text-white rounded-lg px-4 py-2 hover:bg-seal-dark"
      >
        + Add User
      </button>
    </div>
  );

  if (loading) {
    return (
      <div className="space-y-4">
        {header}
        <div className="bg-surface border border-border rounded-lg p-16 text-center text-sm text-gray-400">Loading...</div>
      </div>
    );
  }

  if (error && !users) {
    return (
      <div className="space-y-4">
        {header}
        <ApiErrorState entity="users" onRetry={refetch} message={typeof error === 'string' ? error : undefined} />
      </div>
    );
  }

  // Never substitute sample rows for real accounts: a fake user list on an
  // access-control screen is indistinguishable from a real one.
  const displayUsers = users || [];

  return (
    <div className="space-y-4">
      {header}

      <div className="rounded-lg border border-border bg-paper/40 px-4 py-2.5 text-[11.5px] text-gray-600 leading-relaxed">
        Signing up from the login screen always creates a <b>new</b> organization. Adding someone to
        <b> this</b> organization is done here — that is what keeps one tenant out of another's data.
      </div>

      {crud.error && !creating && !editing && (
        <div role="alert" className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
          {crud.error}
        </div>
      )}

      <div className="bg-surface border border-border rounded-lg overflow-hidden">
        {displayUsers.length === 0 ? (
          <div className="p-16 text-center text-gray-400">
            <div className="text-2xl mb-2">💼</div>
            <p className="text-sm">No users found</p>
            <p className="text-[11px] mt-1">Use “+ Add User” to invite someone to this organization</p>
          </div>
        ) : (
          <>
            <UsersTable
              users={displayUsers}
              meId={me?.id || me?._id}
              onEdit={(u) => { crud.clearError(); setEditing(u); }}
              onDeactivate={handleDeactivate}
            />
            <Pagination
              page={page}
              totalPages={pagination?.totalPages || 1}
              total={pagination?.total || displayUsers.length}
              limit={pagination?.limit || 20}
              onPageChange={setPage}
            />
          </>
        )}
      </div>

      <EntityFormModal
        open={creating}
        onClose={close}
        title="Add user to this organization"
        intro="The account is created directly in your organization. They sign in with the email and temporary password you set here."
        fields={createFields(roles)}
        initial={{ status: 'Active' }}
        submitLabel="Create user"
        saving={crud.saving}
        error={crud.error}
        onSubmit={(payload) => run(
          crud.create(payload),
          () => toast('User created', `${payload.name} can now sign in with the password you set.`, 'success'),
        )}
      />

      <EntityFormModal
        open={!!editing}
        onClose={close}
        title={`Edit ${editing?.name || 'user'}`}
        fields={editFields(roles)}
        initial={editing ? { name: editing.name, email: editing.email, role: editing.role, status: editing.status } : {}}
        submitLabel="Save changes"
        saving={crud.saving}
        error={crud.error}
        onSubmit={(payload) => run(
          crud.update(editing.id, payload),
          () => toast('Changes saved', `${payload.name || editing.name} has been updated.`, 'success'),
        )}
      />
    </div>
  );
}

function UsersTable({ users, meId, onEdit, onDeactivate }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border bg-paper/50 text-gray-500">
            <th className="text-left px-4 py-3 font-medium">Name</th>
            <th className="text-left px-4 py-3 font-medium">Role</th>
            <th className="text-left px-4 py-3 font-medium">Email</th>
            <th className="text-left px-4 py-3 font-medium">Status</th>
            <th className="text-left px-4 py-3 font-medium">Last Login</th>
            <th className="text-right px-4 py-3 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => {
            const isMe = meId && String(u.id) === String(meId);
            return (
              <tr key={u.id} className="border-b border-border/50 hover:bg-paper transition-colors">
                <td className="px-4 py-3 text-ink-900 font-medium">
                  {u.name}
                  {isMe && <span className="ml-2 text-[10px] text-gray-400">(you)</span>}
                </td>
                <td className="px-4 py-3"><span className="badge badge-violet">{u.role}</span></td>
                <td className="px-4 py-3 text-gray-500">{u.email}</td>
                <td className="px-4 py-3">
                  <span className={`badge ${u.status === 'Active' ? 'badge-success' : 'badge-neutral'}`}>
                    {u.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500">{fmtDate(u.lastLogin)}</td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <button onClick={() => onEdit(u)}
                    className="text-[11px] font-semibold border border-border rounded-md px-2.5 py-1 hover:bg-paper">
                    Edit
                  </button>
                  {/* Removing your own account would lock you out mid-session. */}
                  {!isMe && (
                    <button onClick={() => onDeactivate(u)}
                      className="ml-2 text-[11px] font-semibold border border-danger/30 text-danger rounded-md px-2.5 py-1 hover:bg-danger/10">
                      Remove
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
