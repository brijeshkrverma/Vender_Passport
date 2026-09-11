import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { questionnaireApi } from '../features/questionnaire/services/questionnaireApi';
import { submissionApi } from '../features/questionnaire/services/submissionApi';
import { useAnswerSheet } from '../features/questionnaire/hooks/useAnswerSheet';
import QuestionRenderer from '../features/questionnaire/components/render/QuestionRenderer';
import { computedRefKeys } from '../features/questionnaire/services/gridFormula';
import { isAnswered } from '../features/questionnaire/services/answerValue';
import { getAnswerType } from '../features/questionnaire/config/questionTypes';

/**
 * THE QUESTIONNAIRE INSIDE AN AUDIT.
 *
 * This used to read a second, older questionnaire model
 * (`/api/assessments/templates`) that existed alongside the current one. The two
 * had different question shapes, different response storage and different
 * scoring, and a question authored in one was invisible to the other.
 *
 * The old model turned out to be carrying an enum rather than a capability: it
 * declared twenty question types and conditional logic, and the three stored
 * templates used one type and no conditions. So this now reads the same
 * questions, the same answers and the same scoring as every other questionnaire
 * screen — the audit link is one field on the submission.
 *
 * Everything below is shared: `useAnswerSheet` autosaves one small document per
 * answer, and `QuestionRenderer` is the component the applicant and the assessor
 * both see.
 */

const SAVE_LABEL = {
  saving: { text: 'Saving…', className: 'text-gray-400' },
  saved: { text: 'Saved', className: 'text-[#1f7a4d]' },
  error: { text: 'Not saved', className: 'text-[#b0362a]' },
};

export default function AuditQuestionnaireTab({ auditId, audit }) {
  const { authHeaders, user } = useAuth();

  const [submission, setSubmission] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // An audit's questionnaire is for the org being audited, in the audit's year.
  const financialYear = String(
    audit?.financialYear
    || (audit?.start ? new Date(audit.start).getFullYear() : new Date().getFullYear())
  );
  const applicantId = audit?.targetOrgId || user?.userId;

  useEffect(() => {
    if (!auditId) return undefined;
    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const [sub, rows] = await Promise.all([
          submissionApi.start(financialYear, { headers: authHeaders, auditId, applicantId }),
          questionnaireApi.list(
            { financialYear, include: 'answers', limit: 100 }, { headers: authHeaders }),
        ]);
        if (cancelled) return;
        setSubmission(sub);
        setQuestions(rows || []);
        setError('');
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [auditId, financialYear, applicantId, authHeaders]);

  const readOnly = !!submission?.applicantSubmittedAt;
  const sheet = useAnswerSheet(submission?._id, questions, { readOnly });

  const computedKeys = useMemo(() => {
    const formulas = questions.flatMap((q) => (q.answers || []).flatMap(
      (a) => (a.subAnswers || []).flatMap((s) => s.gridFormulas || [])));
    return new Set(computedRefKeys(formulas));
  }, [questions]);

  const answered = questions.filter((q) => isAnswered(
    sheet.answers[q._id] || {},
    { hasOptions: getAnswerType(q.answerType).hasOptions }
  )).length;

  const percent = questions.length ? Math.round((answered / questions.length) * 100) : 0;

  if (loading) {
    return <p className="py-10 text-center text-sm text-gray-400">Loading questionnaire…</p>;
  }

  if (error) {
    return (
      <div className="rounded-lg border border-[#f5c2c7] bg-[#f8d7da] px-4 py-3 text-sm text-[#842029]">
        {error}
      </div>
    );
  }

  if (!questions.length) {
    return (
      <div className="rounded-lg border border-border bg-surface py-12 text-center">
        <p className="text-sm text-gray-500">No questions are authored for FY {financialYear}.</p>
        <a href="/questionnaire-create" className="mt-1 inline-block text-xs font-semibold text-seal-dark hover:underline">
          Create one
        </a>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between rounded-lg border border-border bg-surface px-4 py-3">
        <div>
          <div className="text-sm font-semibold text-ink-900">
            {answered} of {questions.length} answered
          </div>
          <div className="mt-1 h-[5px] w-[200px] overflow-hidden rounded-full bg-gray-100">
            <div className="h-full rounded-full bg-[#1f7a4d]" style={{ width: `${percent}%` }} />
          </div>
        </div>

        <div className="text-right">
          {readOnly && <div className="text-xs text-[#1f7a4d]">Submitted</div>}
          {sheet.errorCount > 0 && (
            <div className="text-xs font-semibold text-[#b0362a]">
              {sheet.errorCount} answer{sheet.errorCount > 1 ? 's' : ''} did not save
            </div>
          )}
          {submission?.totals?.maxMark > 0 && (
            <div className="text-xs text-gray-500">
              Score {submission.totals.obtainedMark} / {submission.totals.maxMark}
            </div>
          )}
        </div>
      </div>

      {questions.map((question, i) => {
        const label = SAVE_LABEL[sheet.status[question._id]];

        return (
          <div key={question._id} className="mb-4 rounded-lg border border-border bg-surface p-5">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                Question {i + 1} of {questions.length}
                {question.maxMark > 0 && ` · ${question.maxMark} marks`}
              </span>
              {label && <span className={`text-[11px] ${label.className}`}>{label.text}</span>}
            </div>

            <QuestionRenderer
              question={question}
              answer={sheet.answers[question._id] || {}}
              onChange={(fn) => sheet.setAnswer(question._id, fn)}
              disabled={readOnly}
              computedKeys={computedKeys}
            />

            {sheet.errors[question._id] && (
              <div className="mt-3 rounded-md border border-[#f5c2c7] bg-[#f8d7da] px-3 py-2 text-xs text-[#842029]">
                {sheet.errors[question._id]}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
