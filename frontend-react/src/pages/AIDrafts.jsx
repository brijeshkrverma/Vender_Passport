import { useState } from 'react';
import { SampleDataBanner } from '../components/DataStateNotice';
import { useAuth } from '../context/AuthContext';
import { fmtDate } from '../hooks/useApi';

const MOCK_DRAFTS = [
  { id: 'draft-1', title: 'SOC 2 Type II Assessment', type: 'Assessment Report', createdDate: '2026-07-20', status: 'Pending Review' },
  { id: 'draft-2', title: 'Vendor Due Diligence — CloudOps Inc.', type: 'Vendor Report', createdDate: '2026-07-22', status: 'Pending Review' },
  { id: 'draft-3', title: 'ISO 27001 Gap Analysis', type: 'Gap Analysis', createdDate: '2026-07-25', status: 'Pending Review' },
];

export default function AIDrafts() {
  const { user } = useAuth();
  const [drafts, setDrafts] = useState(MOCK_DRAFTS);

  const handleApprove = (id) => {
    setDrafts((prev) => prev.map((d) => (d.id === id ? { ...d, status: 'Approved' } : d)));
  };

  const handleReject = (id) => {
    setDrafts((prev) => prev.map((d) => (d.id === id ? { ...d, status: 'Rejected' } : d)));
  };

  const handleDiscard = (id) => {
    setDrafts((prev) => prev.filter((d) => d.id !== id));
  };

  const statusBadge = (status) => {
    const map = {
      'Pending Review': 'badge-info',
      'Approved': 'badge-success',
      'Rejected': 'badge-danger',
    };
    return map[status] || 'badge-neutral';
  };

  return (
    <div className="space-y-4">
      <SampleDataBanner feature="AI Drafts" />
      <div>
        <h1 className="text-2xl font-display font-semibold text-ink-900">AI Drafts Approval</h1>
        <p className="text-sm text-gray-500">Review and approve AI-generated compliance drafts</p>
      </div>

      <div className="bg-surface border border-border rounded-lg overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border bg-paper/50 text-gray-500">
              <th className="text-left px-4 py-3 font-medium">Title</th>
              <th className="text-left px-4 py-3 font-medium">Type</th>
              <th className="text-left px-4 py-3 font-medium">Created</th>
              <th className="text-left px-4 py-3 font-medium">Status</th>
              <th className="text-left px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {drafts.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-16 text-gray-400">
                  <div className="text-2xl mb-2">&#10003;</div>
                  <p className="text-sm">All drafts reviewed</p>
                  <p className="text-[11px] mt-1">No pending AI drafts to approve</p>
                </td>
              </tr>
            ) : (
              drafts.map((d) => (
                <tr key={d.id} className="border-b border-border/50 hover:bg-paper transition-colors">
                  <td className="px-4 py-3 text-ink-900 font-medium">{d.title}</td>
                  <td className="px-4 py-3">
                    <span className="badge badge-neutral">{d.type}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{fmtDate(d.createdDate)}</td>
                  <td className="px-4 py-3">
                    <span className={`badge ${statusBadge(d.status)}`}>{d.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      {d.status === 'Pending Review' && (
                        <>
                          <button
                            onClick={() => handleApprove(d.id)}
                            className="text-[10px] px-2.5 py-1 rounded-md bg-success text-white font-medium hover:bg-success/90 transition-colors"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleReject(d.id)}
                            className="text-[10px] px-2.5 py-1 rounded-md bg-danger text-white font-medium hover:bg-danger/90 transition-colors"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleDiscard(d.id)}
                        className="text-[10px] px-2.5 py-1 rounded-md border border-border text-gray-400 font-medium hover:bg-paper transition-colors"
                      >
                        Discard
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
