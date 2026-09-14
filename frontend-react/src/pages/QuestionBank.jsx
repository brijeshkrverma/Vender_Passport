import { useState } from 'react';
import { Link } from 'react-router-dom';
import { usePaginatedApi } from '../hooks/usePaginatedApi';
import Pagination from '../components/Pagination';
import { QUESTIONNAIRE_BASE } from '../features/questionnaire/services/questionnaireApi';
import { useQuestionnaireMeta } from '../features/questionnaire/hooks/useQuestionnaireMeta';
import MultiSelect from '../features/questionnaire/components/MultiSelect';

/**
 * The library of authored questions, grouped by what they cover.
 *
 * Reads the same questions every other screen does. It used to read a second,
 * older model that stored questions inside templates — so a question authored
 * here was invisible to the questionnaire an applicant actually filled in.
 */

const plain = (html) => String(html || '').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();

export default function QuestionBank() {
  const { optionsFor } = useQuestionnaireMeta();
  const [filters, setFilters] = useState({ category: '', search: '' });

  const { data: rows, pagination, loading, error, page, setPage } =
    usePaginatedApi(QUESTIONNAIRE_BASE, filters, 10);

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-900">Question Bank</h1>
          <p className="text-sm text-gray-500">
            {pagination ? `${pagination.total} reusable question${pagination.total === 1 ? '' : 's'}` : 'Loading…'}
          </p>
        </div>
        <Link
          to="/questionnaire-create"
          className="rounded-md bg-[#002850] px-5 py-[9px] text-[13px] font-semibold text-white hover:bg-[#013a6f]"
        >
          + New question
        </Link>
      </div>

      <div className="grid grid-cols-12 gap-3 rounded-lg border border-border bg-surface p-4">
        <div className="col-span-12 md:col-span-4">
          <label className="mb-[6px] block text-xs text-gray-500">Category</label>
          <MultiSelect
            options={optionsFor('category')}
            value={filters.category}
            onChange={(v) => setFilters((f) => ({ ...f, category: v }))}
            placeholder="All categories"
          />
        </div>
        <div className="col-span-12 md:col-span-5">
          <label className="mb-[6px] block text-xs text-gray-500">Search</label>
          <input
            type="text"
            placeholder="Question text"
            value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
            className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-seal"
          />
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-danger-bg px-4 py-3 text-xs text-danger">{error}</div>
      )}

      {loading && <p className="py-10 text-center text-sm text-gray-400">Loading…</p>}

      {!loading && rows.length === 0 && (
        <div className="rounded-lg border border-border bg-surface py-16 text-center">
          <p className="text-sm text-gray-500">No questions found.</p>
        </div>
      )}

      <div className="space-y-2">
        {!loading && rows.map((q) => (
          <Link
            key={q._id}
            to={`/questionnaire-edit/${q._id}`}
            className="block rounded-lg border border-border bg-surface px-5 py-4 transition-colors hover:border-seal"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-ink-900">
                  {plain(q.question).slice(0, 130) || 'Untitled question'}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-gray-400">
                  {q.category && <span>{q.category}</span>}
                  {q.section && <span>· {q.section}</span>}
                  {q.answerType && <span>· {q.answerType}</span>}
                  {(q.type || []).map((t) => (
                    <span key={t} className="rounded-full bg-gray-100 px-2 py-[1px]">{t}</span>
                  ))}
                </div>
              </div>
              {q.maxMark > 0 && (
                <span className="flex-shrink-0 font-mono text-sm text-gray-500">{q.maxMark}</span>
              )}
            </div>
          </Link>
        ))}
      </div>

      {pagination && pagination.totalPages > 1 && (
        <Pagination
          page={page} totalPages={pagination.totalPages}
          total={pagination.total} limit={pagination.limit} onPageChange={setPage}
        />
      )}
    </div>
  );
}
