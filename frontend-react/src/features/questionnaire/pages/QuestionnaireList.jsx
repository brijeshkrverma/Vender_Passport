import { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../components/Toast';
import { useConfirm } from '../../../components/ConfirmDialog';
import { usePaginatedApi } from '../../../hooks/usePaginatedApi';
import Pagination from '../../../components/Pagination';

import { useQuestionnaireMeta } from '../hooks/useQuestionnaireMeta';
import { questionnaireApi, QUESTIONNAIRE_BASE } from '../services/questionnaireApi';
import MultiSelect from '../components/MultiSelect';

/**
 * QUESTION LIST.
 *
 * Filtering happens on the server. The screen this replaces fetched every
 * question — 322 documents, 1.6 MB — and filtered in the browser to display
 * about 106 rows, on a payload that was two-thirds answer tree the list never
 * showed. `usePaginatedApi` passes the filters through, and the list projection
 * drops the tree, so a page costs roughly what it displays.
 */

const plain = (html) => String(html || '').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();

/**
 * A question's state is the difference between "an author is still writing it"
 * and "an answer already refers to it", so the list has to show it — the
 * consequence of an edit depends entirely on which one it is.
 */
const STATUS_STYLE = {
  Draft: 'bg-[#eef1f4] text-[#41474d]',
  Published: 'bg-[#e6f4ec] text-[#1f7a4d]',
  Superseded: 'bg-[#fbf3e4] text-[#8c6526]',
  Archived: 'bg-[#fdf6f5] text-[#b0362a]',
};

export default function QuestionnaireList() {
  const navigate = useNavigate();
  const { authHeaders } = useAuth();
  const { toast } = useToast();
  const confirm = useConfirm();
  const { optionsFor } = useQuestionnaireMeta();

  const [filters, setFilters] = useState({ financialYear: '', type: '', category: '', search: '' });
  const [busyId, setBusyId] = useState(null);
  const [versions, setVersions] = useState(null);

  const {
    data: rows, pagination, loading, error, page, setPage, refetch,
  } = usePaginatedApi(QUESTIONNAIRE_BASE, filters, 10);

  const setFilter = (name, value) => setFilters((f) => ({ ...f, [name]: value }));
  const activeFilters = Object.entries(filters).filter(([, v]) => v).length;

  /**
   * Reorder by swapping with the neighbour.
   *
   * Only the two affected documents are written — renumbering the whole list on
   * every move turns one drag into N writes. The list is re-fetched rather than
   * reordered locally so the displayed order is always the stored one.
   */
  async function move(row, direction) {
    const index = rows.findIndex((r) => r._id === row._id);
    const other = rows[index + direction];
    if (!other) return;

    setBusyId(row._id);
    try {
      await questionnaireApi.reorder(row._id, other._id, { headers: authHeaders });
      await refetch();
    } catch (e) {
      toast('Could not reorder', e.message, 'error');
    } finally {
      setBusyId(null);
    }
  }

  /**
   * Publishing is the point at which editing stops being free.
   *
   * Confirmed rather than immediate, because it changes what a later edit does:
   * before, an edit changes the question; after, it creates a version and the
   * old one becomes read-only history.
   */
  async function publish(row) {
    const ok = await confirm({
      title: 'Publish this question?',
      message: 'It becomes answerable. After this, editing it creates a new version '
        + 'rather than changing it — so answers already given keep the wording they were shown.',
    });
    if (!ok) return;

    setBusyId(row._id);
    try {
      await questionnaireApi.publish(row._id, { headers: authHeaders });
      toast('Published', 'The question is now answerable.', 'success');
      await refetch();
    } catch (e) {
      toast('Could not publish', e.message, 'error');
    } finally {
      setBusyId(null);
    }
  }

  async function archive(row) {
    const ok = await confirm({
      title: 'Withdraw this question?',
      message: 'It stops being offered. Answers already given keep pointing at it.',
      tone: 'danger',
    });
    if (!ok) return;

    setBusyId(row._id);
    try {
      await questionnaireApi.archive(row._id, { headers: authHeaders });
      toast('Withdrawn', 'The question is no longer offered.', 'success');
      await refetch();
    } catch (e) {
      // The usual reason is an open questionnaire — the message says which.
      toast('Could not withdraw', e.message, 'error');
    } finally {
      setBusyId(null);
    }
  }

  /** The wording each version carried, so an old answer can be read as given. */
  async function showVersions(row) {
    setBusyId(row._id);
    try {
      setVersions({ row, list: await questionnaireApi.versions(row._id, { headers: authHeaders }) });
    } catch (e) {
      toast('Could not load versions', e.message, 'error');
    } finally {
      setBusyId(null);
    }
  }

  async function remove(row) {
    const ok = await confirm({
      title: 'Delete this question?',
      message: plain(row.question).slice(0, 120) || 'Untitled question',
      tone: 'danger',
    });
    if (!ok) return;

    setBusyId(row._id);
    try {
      await questionnaireApi.remove(row._id, { headers: authHeaders });
      toast('Question deleted', 'It has been removed from the list.', 'success');
      await refetch();
    } catch (e) {
      toast('Could not delete', e.message, 'error');
    } finally {
      setBusyId(null);
    }
  }

  /**
   * Export what is on screen.
   *
   * Deliberately the current page and the current filters, not the whole
   * collection: an export that quietly includes rows the author filtered out is
   * worse than one that says what it contains.
   */
  const exportCsv = () => {
    const cols = ['Position', 'Type', 'Category', 'Section', 'Sub-Section',
      'Max Marks', 'Answer Type', 'Question', 'Description'];
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lines = [cols.join(',')].concat(rows.map((r) => [
      r.position ?? r.questionOrderNo ?? '', (r.type || []).join(' / '), r.category, r.section,
      r.subSection, r.maxMark ?? '', r.answerType, plain(r.question), plain(r.description),
    ].map(esc).join(',')));

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `questions-${filters.category || 'all'}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const yearOptions = useMemo(() => optionsFor('financialYear'), [optionsFor]);

  const th = 'px-3 py-[9px] text-left text-[10px] font-semibold uppercase tracking-[0.06em] text-[#7c7d7e]';
  const td = 'px-3 py-[10px] align-top text-[13px] text-[#41474d]';
  const btnGhost = 'rounded-[6px] border border-[#d3dae1] bg-white px-4 py-[8px] text-[13px] '
    + 'font-semibold text-[#41474d] transition-colors hover:bg-[#f3f5f7]';

  return (
    <div>
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[24px] font-semibold leading-tight text-[#002850]">
            Questions
          </h1>
          <p className="mt-1 text-[13px] text-[#7c7d7e]">
            {pagination
              ? `${pagination.total} question${pagination.total === 1 ? '' : 's'}${activeFilters ? ' matching the filters' : ''}`
              : 'Loading…'}
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={exportCsv} disabled={!rows.length} className={btnGhost}>
            Export this page
          </button>
          <Link
            to="/questionnaire-create"
            className="rounded-[6px] bg-[#002850] px-5 py-[9px] text-[13px] font-semibold text-white transition-colors hover:bg-[#013a6f]"
          >
            + New question
          </Link>
        </div>
      </div>

      {/* ── Filters ─────────────────────────────────────────────────── */}
      <div className="mb-4 grid grid-cols-12 gap-3 rounded-[10px] border border-[#e6e9ec] bg-white p-4">
        <div className="col-span-12 md:col-span-3">
          <label className="mb-[6px] block text-[12px] text-[#7c7d7e]">Financial Year</label>
          <MultiSelect
            options={yearOptions}
            value={filters.financialYear}
            onChange={(v) => setFilter('financialYear', v)}
            placeholder="All years"
            searchable={false}
          />
        </div>
        <div className="col-span-12 md:col-span-3">
          <label className="mb-[6px] block text-[12px] text-[#7c7d7e]">Applicant Type</label>
          <MultiSelect
            options={optionsFor('type')}
            value={filters.type}
            onChange={(v) => setFilter('type', v)}
            placeholder="All types"
            searchable={false}
          />
        </div>
        <div className="col-span-12 md:col-span-3">
          <label className="mb-[6px] block text-[12px] text-[#7c7d7e]">Category</label>
          <MultiSelect
            options={optionsFor('category')}
            value={filters.category}
            onChange={(v) => setFilter('category', v)}
            placeholder="All categories"
          />
        </div>
        <div className="col-span-12 md:col-span-3">
          <label className="mb-[6px] block text-[12px] text-[#7c7d7e]">Search</label>
          <input
            type="text"
            placeholder="Question text"
            value={filters.search}
            onChange={(e) => setFilter('search', e.target.value)}
            className="w-full rounded-[6px] border border-[#ced4da] bg-white px-3 py-[8px] text-[14px] outline-none focus:border-[#86b7fe]"
          />
        </div>

        {activeFilters > 0 && (
          <div className="col-span-12">
            <button
              type="button"
              onClick={() => setFilters({ financialYear: '', type: '', category: '', search: '' })}
              className="text-[12px] font-semibold text-[#002850] hover:underline"
            >
              Clear {activeFilters} filter{activeFilters > 1 ? 's' : ''}
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-[6px] border border-[#f5c2c7] bg-[#f8d7da] px-4 py-3 text-[13px] text-[#842029]">
          {error}
        </div>
      )}

      {/* ── Table ───────────────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-[10px] border border-[#e6e9ec] bg-white">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead className="border-b border-[#e6e9ec] bg-[#fafbfc]">
              <tr>
                <th className={`${th} w-[70px]`}>Order</th>
                <th className={`${th} w-[110px]`}>Type</th>
                <th className={`${th} w-[130px]`}>Category</th>
                <th className={`${th} w-[150px]`}>Section</th>
                <th className={th}>Question</th>
                <th className={`${th} w-[110px]`}>Answer</th>
                <th className={`${th} w-[130px]`}>State</th>
                <th className={`${th} w-[70px] text-right`}>Marks</th>
                <th className={`${th} w-[130px]`} />
              </tr>
            </thead>

            <tbody>
              {loading && (
                <tr><td colSpan={8} className="px-3 py-10 text-center text-[13px] text-[#9aa0a6]">Loading…</td></tr>
              )}

              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-3 py-12 text-center">
                    <p className="text-[13px] text-[#7c7d7e]">
                      {activeFilters ? 'No questions match these filters.' : 'No questions yet.'}
                    </p>
                    {!activeFilters && (
                      <Link to="/questionnaire-create" className="mt-1 inline-block text-[12px] font-semibold text-[#002850] hover:underline">
                        Create the first one
                      </Link>
                    )}
                  </td>
                </tr>
              )}

              {!loading && rows.map((row, i) => (
                <tr key={row._id} className={`border-b border-[#f1f3f5] last:border-0 hover:bg-[#fbfcfd] ${busyId === row._id ? 'opacity-50' : ''}`}>
                  <td className={td}>
                    <div className="flex items-center gap-1">
                      <span className="w-[22px] font-mono text-[12px] text-[#9aa0a6]">
                        {row.position ?? row.questionOrderNo ?? '—'}
                      </span>
                      <div className="flex flex-col">
                        <button
                          type="button" title="Move up" disabled={i === 0 || !!busyId}
                          onClick={() => move(row, -1)}
                          className="text-[9px] leading-[11px] text-[#9aa0a6] hover:text-[#002850] disabled:opacity-25"
                        >&#9650;</button>
                        <button
                          type="button" title="Move down" disabled={i === rows.length - 1 || !!busyId}
                          onClick={() => move(row, 1)}
                          className="text-[9px] leading-[11px] text-[#9aa0a6] hover:text-[#002850] disabled:opacity-25"
                        >&#9660;</button>
                      </div>
                    </div>
                  </td>

                  <td className={td}>
                    <div className="flex flex-wrap gap-1">
                      {(row.type || []).map((t) => (
                        <span key={t} className="rounded-[10px] bg-[#eef3f8] px-[7px] py-[1px] text-[11px] text-[#002850]">{t}</span>
                      ))}
                    </div>
                  </td>

                  <td className={td}>{row.category || '—'}</td>

                  <td className={td}>
                    <div>{row.section || '—'}</div>
                    {row.subSection && (
                      <div className="text-[11px] text-[#9aa0a6]">{row.subSection}</div>
                    )}
                  </td>

                  <td className={td}>
                    <Link to={`/questionnaire-edit/${row._id}`} className="font-medium text-[#002850] hover:underline">
                      {plain(row.question).slice(0, 110) || 'Untitled question'}
                    </Link>
                    {row.description && (
                      <div className="mt-[2px] text-[11px] text-[#9aa0a6]">
                        {plain(row.description).slice(0, 90)}
                      </div>
                    )}
                  </td>

                  <td className={td}>
                    <span className="text-[12px]">{row.answerType || '—'}</span>
                  </td>

                  <td className={td}>
                    <span className={`rounded-[10px] px-[8px] py-[2px] text-[11px] font-semibold ${STATUS_STYLE[row.status] || STATUS_STYLE.Draft}`}>
                      {row.status || 'Draft'}
                    </span>
                    {row.version > 1 && (
                      <button
                        type="button"
                        onClick={() => showVersions(row)}
                        title="See every version"
                        className="ml-1 text-[11px] text-[#7c7d7e] hover:text-[#002850] hover:underline"
                      >
                        v{row.version}
                      </button>
                    )}
                  </td>

                  <td className={`${td} text-right`}>
                    {row.isMarks === false
                      ? <span className="text-[#9aa0a6]">—</span>
                      : <span className="font-mono">{row.maxMark ?? 0}</span>}
                  </td>

                  <td className={`${td} text-right`}>
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => navigate(`/questionnaire-edit/${row._id}`)}
                        className="rounded-[5px] border border-[#d3dae1] px-3 py-[4px] text-[12px] font-semibold text-[#41474d] hover:bg-[#f3f5f7]"
                      >
                        Edit
                      </button>

                      {/* Publishing is offered only where it applies: a Draft.
                          A Published question offers withdrawal instead, and a
                          Superseded one offers neither — it is history. */}
                      {(row.status || 'Draft') === 'Draft' && (
                        <button
                          type="button"
                          disabled={!!busyId}
                          onClick={() => publish(row)}
                          title="Make this answerable"
                          className="rounded-[5px] border border-[#1f7a4d] px-3 py-[4px] text-[12px] font-semibold text-[#1f7a4d] hover:bg-[#1f7a4d] hover:text-white disabled:opacity-30"
                        >
                          Publish
                        </button>
                      )}
                      {row.status === 'Published' && (
                        <button
                          type="button"
                          disabled={!!busyId}
                          onClick={() => archive(row)}
                          title="Stop offering this question"
                          className="rounded-[5px] border border-[#d3dae1] px-3 py-[4px] text-[12px] font-semibold text-[#41474d] hover:bg-[#f3f5f7] disabled:opacity-30"
                        >
                          Withdraw
                        </button>
                      )}

                      <button
                        type="button"
                        disabled={!!busyId}
                        onClick={() => remove(row)}
                        className="rounded-[5px] px-2 py-[4px] text-[15px] leading-none text-[#b0362a] hover:bg-[#fbeae7] disabled:opacity-30"
                        aria-label="Delete question"
                      >
                        &times;
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {pagination && pagination.totalPages > 1 && (
          <div className="border-t border-[#e6e9ec] px-3 py-2">
            <Pagination
              page={page}
              totalPages={pagination.totalPages}
              total={pagination.total}
              limit={pagination.limit}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>

      {/* ── Version history ─────────────────────────────────────────────
          The wording each version carried. This is what `questionVersion` on a
          response is for: an assessor reading a score needs the question as the
          applicant saw it, which may be several edits ago. */}
      {versions && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
          <div className="my-8 w-full max-w-[760px] rounded-[10px] bg-white shadow-lg">
            <div className="flex items-start justify-between border-b border-[#e6e9ec] px-5 py-4">
              <div>
                <h3 className="text-[16px] font-semibold text-[#002850]">Version history</h3>
                <p className="mt-1 text-[12px] text-[#7c7d7e]">
                  {versions.list.length} version{versions.list.length === 1 ? '' : 's'} · newest first
                </p>
              </div>
              <button
                type="button"
                onClick={() => setVersions(null)}
                aria-label="Close"
                className="rounded-[6px] px-2 py-1 text-[20px] leading-none text-[#7c7d7e] hover:bg-[#f1f3f5]"
              >
                &times;
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-5">
              {versions.list.map((v) => (
                <div
                  key={v._id}
                  className={`mb-3 rounded-[8px] border-l-[3px] p-4 ring-1 ${
                    v.status === 'Superseded'
                      ? 'border-l-[#b8863b] bg-[#fdfbf6] ring-[#f0e2c4]'
                      : 'border-l-[#1f7a4d] bg-white ring-[#e6e9ec]'
                  }`}
                >
                  <div className="mb-1 flex items-center gap-2">
                    <span className="font-mono text-[12px] font-semibold text-[#002850]">v{v.version}</span>
                    <span className={`rounded-[10px] px-[8px] py-[2px] text-[11px] font-semibold ${STATUS_STYLE[v.status] || ''}`}>
                      {v.status}
                    </span>
                    <span className="ml-auto text-[11px] text-[#9aa0a6]">
                      {v.updatedAt ? new Date(v.updatedAt).toLocaleDateString() : ''}
                      {v.createdBy ? ` · ${v.createdBy}` : ''}
                    </span>
                  </div>
                  <p className="text-[13px] leading-[1.6] text-[#41474d]">
                    {plain(v.question) || 'Untitled question'}
                  </p>
                  {v.maxMark > 0 && (
                    <p className="mt-1 text-[11px] text-[#9aa0a6]">{v.maxMark} marks</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
