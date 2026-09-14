import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../components/Toast';
import { useConfirm } from '../../../components/ConfirmDialog';

import { submissionApi } from '../services/submissionApi';
import { questionnaireApi } from '../services/questionnaireApi';
import ReviewCard from '../components/render/ReviewCard';

/**
 * ASSESSING ONE SUBMISSION.
 *
 * ── WHY THE MARKS ARE ALREADY THERE ───────────────────────────────────────
 *
 * Scoring runs when the applicant submits, so this screen opens with the rules
 * already applied. The alternative — a "score" button the assessor presses
 * first — means whoever forgets reviews a questionnaire that appears to have
 * scored nothing, and there is no way for them to tell that from a real zero.
 *
 * The re-run button exists for the case that actually needs it: an author
 * changed a rule after the submission came in.
 *
 * ── SECTION AT A TIME ─────────────────────────────────────────────────────
 *
 * The same reason as the answering screen. A questionnaire runs to hundreds of
 * questions and an assessor works through it in passes, not in one sitting.
 */
export default function AssessSubmission() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { authHeaders } = useAuth();
  const { toast } = useToast();
  const confirm = useConfirm();

  const [submission, setSubmission] = useState(null);
  const [sections, setSections] = useState([]);
  const [activeSection, setActiveSection] = useState('');
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const readOnly = !!submission?.assessorSubmittedAt;

  const load = async (section) => {
    setLoading(true);
    try {
      const [sub, rows] = await Promise.all([
        submissionApi.getById(id, { headers: authHeaders }),
        submissionApi.forReview(id, section, { headers: authHeaders }),
      ]);
      setSubmission(sub);
      setEntries(rows || []);
      setError('');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(activeSection); }, [id, activeSection, authHeaders]);

  // Sections come from the questions themselves, not from the answers.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rows = await questionnaireApi.list(
          { financialYear: submission?.financialYear, limit: 200 }, { headers: authHeaders });
        if (cancelled || !rows) return;
        setSections([...new Set(rows.map((r) => r.section).filter(Boolean))].sort());
      } catch { /* the section rail is a convenience, not a requirement */ }
    })();
    return () => { cancelled = true; };
  }, [submission?.financialYear, authHeaders]);

  async function saveOne(questionId, payload) {
    setSaving(true);
    try {
      const updated = await submissionApi.review(id, questionId, payload, { headers: authHeaders });
      setEntries((rows) => rows.map((r) => (
        String(r.question._id) === String(questionId) ? { ...r, response: updated } : r)));
      // The review recomputes totals server-side, so the header must catch up.
      setSubmission(await submissionApi.getById(id, { headers: authHeaders }));
    } catch (e) {
      toast('Could not save', e.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function rescore() {
    const ok = await confirm({
      title: 'Re-run the scoring rules?',
      message: 'Marks you have set by hand are kept. Everything else is recalculated.',
    });
    if (!ok) return;

    setBusy(true);
    try {
      const out = await submissionApi.score(id, {}, { headers: authHeaders });
      toast('Rules re-run', `${out.scored} scored, ${out.skipped} left as set.`, 'success');
      await load(activeSection);
    } catch (e) {
      toast('Could not re-run', e.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  async function finish() {
    const unreviewed = entries.filter((e) => e.response && e.response.status === 'Submitted').length;
    const ok = await confirm({
      title: 'Complete this assessment?',
      message: unreviewed
        ? `${unreviewed} answer${unreviewed > 1 ? 's have' : ' has'} not been reviewed in this section. Complete anyway?`
        : 'The applicant will be told the assessment is done.',
    });
    if (!ok) return;

    setBusy(true);
    try {
      setSubmission(await submissionApi.assess(id, { headers: authHeaders }));
      toast('Assessment complete', 'The submission has been marked assessed.', 'success');
    } catch (e) {
      toast('Could not complete', e.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  /**
   * The final sign-off, once an assessor has finished.
   *
   * Separate from "Complete assessment" and deliberately not available to the
   * person who did it — the server refuses that, this only keeps the button
   * from being offered. `Approved` and `adminApprovedAt` were in the model from
   * the beginning with nothing able to set them.
   */
  async function approve() {
    const ok = await confirm({
      title: 'Approve this assessment?',
      message: 'The score becomes final.',
      detail: 'You cannot approve an assessment you carried out yourself.',
    });
    if (!ok) return;

    setBusy(true);
    try {
      setSubmission(await submissionApi.approve(id, { headers: authHeaders }));
      toast('Approved', 'The score is now final.', 'success');
    } catch (e) {
      toast('Could not approve', e.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  async function sendBack() {
    const ok = await confirm({
      title: 'Return this to the applicant?',
      message: 'They will be able to change their answers and submit again.',
      tone: 'danger',
    });
    if (!ok) return;

    setBusy(true);
    try {
      setSubmission(await submissionApi.returnToApplicant(id, { headers: authHeaders }));
      toast('Returned to the applicant', 'They can now edit and resubmit.', 'success');
    } catch (e) {
      toast('Could not return', e.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  const totals = submission?.totals || {};
  const pct = totals.maxMark ? Math.round((totals.obtainedMark / totals.maxMark) * 100) : 0;

  const reviewed = useMemo(
    () => entries.filter((e) => ['Reviewed', 'Accepted', 'Flagged'].includes(e.response?.status)).length,
    [entries]
  );

  return (
    <div className="pb-24">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link to="/assessor-queue" className="text-[12px] font-semibold text-[#002850] hover:underline">
            ← Back to the queue
          </Link>
          <h1 className="mt-1 font-display text-[24px] font-semibold leading-tight text-[#002850]">
            Assessment
          </h1>
          <p className="mt-1 text-[13px] text-[#7c7d7e]">
            {submission?.applicantId} · FY {submission?.financialYear}
            {readOnly && ' · completed'}
          </p>
        </div>

        <div className="flex items-end gap-4">
          <div className="text-right">
            <div className="text-[10px] font-semibold uppercase tracking-[0.07em] text-[#9aa0a6]">Score</div>
            <div className="font-display text-[26px] font-semibold leading-none text-[#002850]">
              {totals.obtainedMark ?? 0}
              <span className="text-[14px] font-normal text-[#9aa0a6]"> / {totals.maxMark ?? 0}</span>
            </div>
            <div className="text-[11px] text-[#7c7d7e]">{pct}%</div>
          </div>
        </div>
      </div>

      {/* Scoring runs on submit; if it failed the marks are zero for a reason
          the assessor would otherwise have no way to discover. */}
      {submission?.scoringError && (
        <div className="mb-4 rounded-[8px] border border-[#f0d7d3] bg-[#fdf6f5] px-4 py-3 text-[13px] text-[#842029]">
          <b>The rules did not run when this was submitted</b> — {submission.scoringError}.
          The marks below are not a score until you re-run them.
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-[6px] border border-[#f5c2c7] bg-[#f8d7da] px-4 py-3 text-[13px] text-[#842029]">
          {error}
        </div>
      )}

      <div className="grid grid-cols-12 gap-5">
        <aside className="col-span-12 lg:col-span-3">
          <div className="lg:sticky lg:top-4">
            <div className="rounded-[10px] border border-[#e6e9ec] bg-white p-3">
              <div className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.07em] text-[#9aa0a6]">
                Sections
              </div>
              <button
                type="button"
                onClick={() => setActiveSection('')}
                className={`mb-[2px] block w-full rounded-[6px] px-3 py-[8px] text-left text-[13px] ${
                  activeSection === '' ? 'bg-[#f0f4f8] font-semibold text-[#002850]' : 'text-[#41474d] hover:bg-[#f7f9fb]'
                }`}
              >
                All questions
              </button>
              {sections.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setActiveSection(s)}
                  className={`mb-[2px] block w-full rounded-[6px] px-3 py-[8px] text-left text-[13px] ${
                    s === activeSection ? 'bg-[#f0f4f8] font-semibold text-[#002850]' : 'text-[#41474d] hover:bg-[#f7f9fb]'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>

            {!readOnly && (
              <button
                type="button"
                onClick={rescore}
                disabled={busy}
                className="mt-3 w-full rounded-[8px] border border-[#b8863b] bg-[#fbf3e4] px-4 py-[9px] text-[12px] font-semibold text-[#8c6526] transition-colors hover:bg-[#f6e6c8] disabled:opacity-50"
              >
                Re-run scoring rules
              </button>
            )}
          </div>
        </aside>

        <div className="col-span-12 lg:col-span-9">
          {loading && <p className="py-10 text-center text-[13px] text-[#9aa0a6]">Loading…</p>}

          {!loading && entries.length === 0 && (
            <p className="rounded-[10px] border border-[#e6e9ec] bg-white py-12 text-center text-[13px] text-[#7c7d7e]">
              Nothing to review in this section.
            </p>
          )}

          {!loading && entries.map((entry, i) => (
            <ReviewCard
              key={entry.question._id}
              entry={entry}
              index={i}
              total={entries.length}
              readOnly={readOnly}
              saving={saving}
              onSave={saveOne}
            />
          ))}
        </div>
      </div>

      {/*
        * Assessed but not yet approved: the assessor's work is done and the
        * screen is read-only, but the score is not final until someone else
        * signs it off.
        */}
      {readOnly && submission?.status === 'Assessed' && (
        <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-[#e0e5ea] bg-white/95 backdrop-blur">
          <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-6 py-3">
            <span className="text-[12px] text-[#7c7d7e]">
              Assessment complete. The score is final once it is approved.
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={sendBack}
                disabled={busy}
                className="rounded-[6px] border border-[#d3dae1] bg-white px-5 py-[9px] text-[13px] font-semibold text-[#41474d] hover:bg-[#f3f5f7] disabled:opacity-50"
              >
                Return to applicant
              </button>
              <button
                type="button"
                onClick={approve}
                disabled={busy}
                className="rounded-[6px] bg-[#1f7a4d] px-6 py-[9px] text-[13px] font-semibold uppercase tracking-wide text-white hover:bg-[#186139] disabled:opacity-50"
              >
                Approve
              </button>
            </div>
          </div>
        </div>
      )}

      {!readOnly && entries.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-[#e0e5ea] bg-white/95 backdrop-blur">
          <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-6 py-3">
            <span className="text-[12px] text-[#7c7d7e]">
              {reviewed} of {entries.length} reviewed in this section
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={sendBack}
                disabled={busy}
                className="rounded-[6px] border border-[#d3dae1] bg-white px-5 py-[9px] text-[13px] font-semibold text-[#41474d] hover:bg-[#f3f5f7] disabled:opacity-50"
              >
                Return to applicant
              </button>
              <button
                type="button"
                onClick={finish}
                disabled={busy}
                className="rounded-[6px] bg-[#002850] px-6 py-[9px] text-[13px] font-semibold uppercase tracking-wide text-white hover:bg-[#013a6f] disabled:opacity-50"
              >
                Complete assessment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
