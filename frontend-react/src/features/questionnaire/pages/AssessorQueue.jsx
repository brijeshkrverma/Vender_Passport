import { useState } from 'react';
import { Link } from 'react-router-dom';
import { usePaginatedApi } from '../../../hooks/usePaginatedApi';
import Pagination from '../../../components/Pagination';
import MultiSelect from '../components/MultiSelect';
import { useQuestionnaireMeta } from '../hooks/useQuestionnaireMeta';
import { SUBMISSION_BASE } from '../services/submissionApi';

/**
 * WHAT IS WAITING ON AN ASSESSOR.
 *
 * Reads the submission headers only. The stored totals are why that is enough:
 * a row shows how far along a questionnaire is and what it has scored without
 * touching a single answer. In the system this replaces the same list would
 * have read 2.3 MB per row to answer "has this one been submitted?".
 */

const STATUS_STYLE = {
  Draft: 'bg-[#eef1f4] text-[#41474d]',
  Submitted: 'bg-[#fbf3e4] text-[#8c6526]',
  'Under Assessment': 'bg-[#e3edf7] text-[#002850]',
  Assessed: 'bg-[#e6f4ec] text-[#1f7a4d]',
  Approved: 'bg-[#e6f4ec] text-[#1f7a4d]',
  Returned: 'bg-[#fdf6f5] text-[#b0362a]',
};

export default function AssessorQueue() {
  const { optionsFor } = useQuestionnaireMeta();
  // Submitted first: that is the queue. The others are here to be found, not
  // to be worked through.
  const [filters, setFilters] = useState({ status: 'Submitted', financialYear: '' });

  const { data: rows, pagination, loading, error, page, setPage } =
    usePaginatedApi(SUBMISSION_BASE, filters, 10);

  const th = 'px-3 py-[9px] text-left text-[10px] font-semibold uppercase tracking-[0.06em] text-[#7c7d7e]';
  const td = 'px-3 py-[11px] align-middle text-[13px] text-[#41474d]';

  return (
    <div>
      <div className="mb-4">
        <h1 className="font-display text-[24px] font-semibold leading-tight text-[#002850]">
          Assessment Queue
        </h1>
        <p className="mt-1 text-[13px] text-[#7c7d7e]">
          {pagination ? `${pagination.total} submission${pagination.total === 1 ? '' : 's'}` : 'Loading…'}
        </p>
      </div>

      <div className="mb-4 grid grid-cols-12 gap-3 rounded-[10px] border border-[#e6e9ec] bg-white p-4">
        <div className="col-span-12 md:col-span-3">
          <label className="mb-[6px] block text-[12px] text-[#7c7d7e]">Status</label>
          <MultiSelect
            options={Object.keys(STATUS_STYLE).map((s) => ({ value: s, label: s }))}
            value={filters.status}
            onChange={(v) => setFilters((f) => ({ ...f, status: v }))}
            placeholder="All"
            searchable={false}
          />
        </div>
        <div className="col-span-12 md:col-span-3">
          <label className="mb-[6px] block text-[12px] text-[#7c7d7e]">Financial Year</label>
          <MultiSelect
            options={optionsFor('financialYear')}
            value={filters.financialYear}
            onChange={(v) => setFilters((f) => ({ ...f, financialYear: v }))}
            placeholder="All years"
            searchable={false}
          />
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-[6px] border border-[#f5c2c7] bg-[#f8d7da] px-4 py-3 text-[13px] text-[#842029]">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-[10px] border border-[#e6e9ec] bg-white">
        <table className="w-full border-collapse">
          <thead className="border-b border-[#e6e9ec] bg-[#fafbfc]">
            <tr>
              <th className={th}>Applicant</th>
              <th className={`${th} w-[110px]`}>Year</th>
              <th className={`${th} w-[150px]`}>Status</th>
              <th className={`${th} w-[160px]`}>Answered</th>
              <th className={`${th} w-[130px] text-right`}>Score</th>
              <th className={`${th} w-[110px]`} />
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={6} className="px-3 py-10 text-center text-[13px] text-[#9aa0a6]">Loading…</td></tr>
            )}

            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-12 text-center text-[13px] text-[#7c7d7e]">
                  Nothing here. {filters.status === 'Submitted' && 'No questionnaire is waiting to be assessed.'}
                </td>
              </tr>
            )}

            {!loading && rows.map((s) => {
              const t = s.totals || {};
              const done = t.questions ? Math.round((t.answered / t.questions) * 100) : 0;

              return (
                <tr key={s._id} className="border-b border-[#f1f3f5] last:border-0 hover:bg-[#fbfcfd]">
                  <td className={td}>
                    <Link to={`/assess/${s._id}`} className="font-medium text-[#002850] hover:underline">
                      {s.applicantId}
                    </Link>
                    {s.applicantType && (
                      <div className="text-[11px] text-[#9aa0a6]">{s.applicantType}</div>
                    )}
                  </td>
                  <td className={td}>{s.financialYear}</td>
                  <td className={td}>
                    <span className={`rounded-[10px] px-[8px] py-[2px] text-[11px] font-semibold ${STATUS_STYLE[s.status] || ''}`}>
                      {s.status}
                    </span>
                    {/* Marks of zero mean two different things; this says which. */}
                    {s.scoringError && (
                      <div className="mt-[3px] text-[10px] text-[#b0362a]">rules did not run</div>
                    )}
                  </td>
                  <td className={td}>
                    <div className="flex items-center gap-2">
                      <div className="h-[5px] w-[70px] overflow-hidden rounded-full bg-[#eef1f4]">
                        <div className="h-full rounded-full bg-[#1f7a4d]" style={{ width: `${done}%` }} />
                      </div>
                      <span className="text-[11px] text-[#7c7d7e]">{t.answered ?? 0}/{t.questions ?? 0}</span>
                    </div>
                  </td>
                  <td className={`${td} text-right font-mono`}>
                    {t.obtainedMark ?? 0}
                    <span className="text-[#9aa0a6]"> / {t.maxMark ?? 0}</span>
                  </td>
                  <td className={`${td} text-right`}>
                    <Link
                      to={`/assess/${s._id}`}
                      className="rounded-[5px] border border-[#d3dae1] px-3 py-[4px] text-[12px] font-semibold text-[#41474d] hover:bg-[#f3f5f7]"
                    >
                      {s.assessorSubmittedAt ? 'View' : 'Assess'}
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {pagination && pagination.totalPages > 1 && (
          <div className="border-t border-[#e6e9ec] px-3 py-2">
            <Pagination
              page={page} totalPages={pagination.totalPages}
              total={pagination.total} limit={pagination.limit} onPageChange={setPage}
            />
          </div>
        )}
      </div>
    </div>
  );
}
