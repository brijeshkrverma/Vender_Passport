import { useState, useMemo, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../components/Toast';
import { useQuestionnaireDoc, useRecentQuestions } from '../hooks/useQuestionnaireDoc';

import {
  BASIC_FIELDS, REPORTING_FIELDS, CAPABILITY_FIELDS, FORM_SECTIONS,
} from '../config/questionnaireSchema';
import { getAnswerType } from '../config/questionTypes';
import { useQuestionnaireForm } from '../hooks/useQuestionnaireForm';
import { useQuestionnaireMeta } from '../hooks/useQuestionnaireMeta';
import { useFormulaSources } from '../hooks/useFormulaSources';
import { questionnaireApi } from '../services/questionnaireApi';

import FieldRenderer from '../components/FieldRenderer';
import AnswerCard from '../components/AnswerCard';
import CollapsibleSection from '../components/CollapsibleSection';
import ScoringRuleEditor from '../components/ScoringRuleEditor';
import SectionRail from '../components/SectionRail';
import AnswerPreview from '../components/AnswerPreview';
import FormSection from '../components/FormSection';
import { labelClass } from '../components/Field';
import { describeRule } from '../services/markEngines';
import { buildCatalog } from '../services/valueRef';

/**
 * QUESTIONNAIRE EDITOR — one screen, two modes.
 *
 * Create and edit are the same form: the same twenty-odd fields, the same grid
 * builder, the same marking scheme. Two screens would mean every field added
 * later has to be added twice, and the pair drifting is only visible as a
 * question that cannot be edited the way it was created.
 *
 * The form is long — a fully specified question carries classification,
 * placement, content, an answer type, a marking scheme, grids, formulas and a
 * trend rule. Laid out flat it ran past two thousand pixels, which put the
 * Submit button out of reach, buried "7 fields need attention" at the bottom
 * with no way to find the seven, and turned six answer options into six
 * identical boxes.
 *
 * So the page is built around three things a long form needs: a rail that says
 * where you are and what is wrong, sections that make the run scannable, and
 * an action bar that stays reachable.
 */

/** Which section each validation error belongs to. */
function sectionOfError(key) {
  if (key.startsWith('answers')) return 'answers';
  if (key === 'scoringRule') return 'answering';
  if (REPORTING_FIELDS.some((f) => f.name === key)) return 'answering';
  return BASIC_FIELDS.find((f) => f.name === key)?.group || 'classify';
}

const SECTIONS = [...FORM_SECTIONS, { id: 'answers', title: 'Answers', hint: 'The options a respondent chooses from' }];

export default function QuestionnaireEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { authHeaders } = useAuth();
  const { toast } = useToast();
  const { optionsFor, source } = useQuestionnaireMeta();

  const isEdit = !!id;
  const { doc, loading: loadingDoc, error: loadError } = useQuestionnaireDoc(id);

  const form = useQuestionnaireForm();
  const {
    form: state, setField, setAt, touch, errorFor, errors, isValid, scores,
    allowsSubAnswers, addAnswer, removeAnswer, moveAnswer, addSubAnswer, removeSubAnswer,
    toggleSubAnswers, setSubAnswerType, updateGrid, setFormulas,
    addAssessorOption, removeAssessorOption, addAssessorSubOption, removeAssessorSubOption,
    reset, replace, markSubmitAttempted, submitAttempted, buildPayload,
  } = form;

  const [savedTick, setSavedTick] = useState(0);
  const recent = useRecentQuestions({ reloadKey: savedTick });

  /** Pour the loaded document into the form once it arrives. */
  useEffect(() => { if (doc) replace(doc); }, [doc, replace]);

  // One request for both — the server walks the answer trees and returns labels.
  const { crossTargets, gridSources, diagnosis: sourcesDiagnosis } = useFormulaSources({
    financialYear: state.financialYear,
  });

  /**
   * Everything a value reference may point at, built from the question being
   * edited plus whatever other questions are reachable. Shared by the scoring
   * editor and the formula builder so both offer the same choices.
   */
  const catalog = useMemo(() => buildCatalog(state, crossTargets), [state, crossTargets]);

  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState('');
  const [showPayload, setShowPayload] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [activeSection, setActiveSection] = useState('classify');

  /**
   * Which answer cards are folded away.
   *
   * Adding an option folds the others: an author works on one at a time, and
   * six expanded cards is a wall nobody can navigate. Nothing is auto-folded
   * otherwise, so a card never disappears without the author doing something.
   */
  const [collapsedKeys, setCollapsedKeys] = useState(() => new Set());
  const bodyRef = useRef(null);

  const answerType = getAnswerType(state.answerType);
  const errorKeys = Object.keys(errors);

  /** Per-section state for the rail: how many problems, and is it done. */
  const sections = useMemo(() => {
    const counts = {};
    errorKeys.forEach((k) => { const s = sectionOfError(k); counts[s] = (counts[s] || 0) + 1; });

    const filled = (name) => {
      const v = state[name];
      if (Array.isArray(v)) return v.length > 0;
      return !!String(v ?? '').replace(/<[^>]*>/g, '').trim();
    };

    const summaryFor = (id) => {
      if (id === 'classify') return state.category || '';
      if (id === 'placement') return state.section || '';
      if (id === 'content') return state.question ? 'Written' : '';
      if (id === 'answering') return state.answerType || '';
      if (id === 'answers') return state.answers.length ? `${state.answers.length} options` : '';
      return '';
    };

    return SECTIONS.map((s) => {
      const own = BASIC_FIELDS.filter((f) => f.group === s.id);
      const required = own.filter((f) => f.required);
      const complete = s.id === 'answers'
        ? state.answers.length > 0
        : required.length > 0 && required.every((f) => filled(f.name));

      // Errors only count once the author has tried to submit or touched the
      // field — a rail that is red before anything is typed teaches nothing.
      return {
        ...s,
        errors: submitAttempted ? (counts[s.id] || 0) : 0,
        complete,
        summary: summaryFor(s.id),
      };
    });
  }, [state, errorKeys, submitAttempted]);

  /** Highlight the section the reader is actually looking at. */
  useEffect(() => {
    const nodes = SECTIONS.map((s) => document.getElementById(s.id)).filter(Boolean);
    if (!nodes.length) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActiveSection(visible.target.id);
      },
      // Bias the band towards the top of the viewport so the active item is the
      // one being read, not whichever happens to be tallest.
      { rootMargin: '-70px 0px -55% 0px', threshold: 0 }
    );
    nodes.forEach((n) => observer.observe(n));
    return () => observer.disconnect();
  }, [state.answers.length]);

  const jumpTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setActiveSection(id);
  };

  /**
   * Errors in the order the author reads them.
   *
   * `Object.keys` follows insertion order, which is close but puts every answer
   * error after every basic one regardless of where they sit on screen. "Go to
   * the first problem" has to mean the topmost one.
   */
  const orderedErrors = useMemo(() => {
    const rank = Object.fromEntries(SECTIONS.map((s, i) => [s.id, i]));
    return [...errorKeys].sort((a, b) => {
      const bySection = rank[sectionOfError(a)] - rank[sectionOfError(b)];
      if (bySection !== 0) return bySection;
      // Within Answers, follow the option order rather than the key's spelling.
      const ia = Number(/^answers\.(\d+)/.exec(a)?.[1] ?? -1);
      const ib = Number(/^answers\.(\d+)/.exec(b)?.[1] ?? -1);
      return ia - ib;
    });
  }, [errorKeys]);

  /**
   * Where the next jump should land. Held in state rather than acted on
   * directly because the target may not be in the DOM yet: a problem inside a
   * folded answer card only renders once that card is unfolded, so the scroll
   * has to wait for the render that unfolding causes.
   */
  const [pendingFocus, setPendingFocus] = useState(null);

  useEffect(() => {
    if (!pendingFocus) return;
    const el = document.getElementById(`field-${pendingFocus}`);

    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Put the caret in it. `[role="button"]` and `[contenteditable]` are here
      // because the token select and the rich-text editor are not native form
      // controls — without them, jumping to Type or Question scrolled correctly
      // and then left focus on the button that was clicked.
      //
      // `preventScroll` matters: focusing without it fights the smooth scroll
      // and lands somewhere between the two positions.
      el.querySelector('input, select, textarea, [contenteditable], [role="button"]')
        ?.focus({ preventScroll: true });
    } else {
      // No anchor for this error — fall back to its section so the jump still
      // moves the author closer rather than doing nothing.
      jumpTo(sectionOfError(pendingFocus));
    }
    setPendingFocus(null);
  }, [pendingFocus, collapsedKeys]);

  /** Unfold whatever hides this error, then aim at it. */
  const goToError = (key) => {
    const match = /^answers\.(\d+)/.exec(key);
    if (match) {
      const answer = state.answers[Number(match[1])];
      if (answer) {
        setCollapsedKeys((prev) => {
          if (!prev.has(answer.key)) return prev;
          const next = new Set(prev);
          next.delete(answer.key);
          return next;
        });
      }
    }
    setPendingFocus(key);
  };

  const jumpToFirstProblem = () => {
    if (orderedErrors.length) goToError(orderedErrors[0]);
  };

  /** Rail click: a section with a problem aims at the problem, not the heading. */
  const jumpToSection = (id) => {
    const firstInSection = submitAttempted
      && orderedErrors.find((k) => sectionOfError(k) === id);
    if (firstInSection) goToError(firstInSection);
    else jumpTo(id);
  };

  async function handleSubmit() {
    markSubmitAttempted();
    setServerError('');

    if (!isValid) {
      toast('Form is not valid', 'Please check the highlighted fields and try again.', 'error');
      jumpToFirstProblem();
      return;
    }

    setSaving(true);
    try {
      const payload = buildPayload();

      if (isEdit) {
        await questionnaireApi.update(id, payload, { headers: authHeaders });
        toast('Changes saved', 'The question has been updated.', 'success');
        setSavedTick((n) => n + 1);
      } else {
        const created = await questionnaireApi.create(payload, { headers: authHeaders });
        toast('Questionnaire created', 'The question has been saved.', 'success');
        // Straight into edit mode on the thing just created, rather than back
        // to a blank form. Authoring is iterative — the first save is rarely
        // the last — and it also means the round trip is exercised every time
        // instead of only when someone goes looking for it.
        const newId = created?._id || created?.id;
        if (newId) navigate(`/questionnaire-edit/${newId}`);
        else { reset(); setCollapsedKeys(new Set()); }
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      setServerError(e.message);
      toast('Could not save', e.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  /** Handlers every nested editor needs, bundled once. */
  const nested = {
    onChange: setAt,
    onTouch: touch,
    errorFor,
    onSetSubAnswerType: setSubAnswerType,
    onUpdateGrid: updateGrid,
    onSetFormulas: setFormulas,
    onAddOption: addAssessorOption,
    onRemoveOption: removeAssessorOption,
    onAddSubOption: addAssessorSubOption,
    onRemoveSubOption: removeAssessorSubOption,
    catalog,
  };

  const fieldsOf = (group) => BASIC_FIELDS.filter((f) => f.group === group);

  const renderFields = (fields) => (
    <div className="grid grid-cols-12 gap-x-4">
      {fields.map((field) => (
        <div
          key={field.name}
          className={
            field.span === 12 ? 'col-span-12'
              : field.span === 4 ? 'col-span-6 md:col-span-4'
                : 'col-span-12 md:col-span-6'
          }
        >
          <FieldRenderer
            field={field}
            value={state[field.name]}
            error={errorFor(field.name)}
            options={field.source ? optionsFor(field.source) : []}
            onChange={setField}
            onTouch={touch}
          />
        </div>
      ))}
    </div>
  );

  const btnGhost = 'rounded-[6px] border border-[#d3dae1] bg-white px-4 py-[8px] text-[13px] '
    + 'font-semibold text-[#41474d] transition-colors hover:bg-[#f3f5f7]';

  return (
    <div>
      {/* ── Page header ─────────────────────────────────────────────── */}
      <div className="mb-4 flex items-end justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="font-display text-[24px] font-semibold leading-tight text-[#002850]">
              {isEdit ? 'Edit Questionnaire' : 'Create Questionnaire'}
            </h1>
            {isEdit && (
              <span className="rounded-[10px] bg-[#eef3f8] px-[8px] py-[2px] font-mono text-[11px] text-[#41474d]">
                {String(id).slice(-6)}
              </span>
            )}
          </div>
          <p className="mt-1 text-[13px] text-[#7c7d7e]">
            {isEdit
              ? 'Editing a saved question. Changes replace the stored version.'
              : 'One question, its answers, and how it is marked.'}
          </p>
        </div>

        <div className="flex flex-shrink-0 items-center gap-2">
          {/* Until the list screen exists this is the only way to reach a saved
              question without typing an id into the address bar. */}
          <select
            value={id || ''}
            onChange={(e) => navigate(e.target.value
              ? `/questionnaire-edit/${e.target.value}`
              : '/questionnaire-create')}
            className="max-w-[280px] rounded-[6px] border border-[#d3dae1] bg-white px-3 py-[8px] text-[13px] text-[#41474d]"
          >
            <option value="">＋ New question</option>
            {recent.map((q) => (
              <option key={q.id} value={q.id}>
                {q.label}{q.meta ? ` — ${q.meta}` : ''}
              </option>
            ))}
          </select>

          <button type="button" onClick={() => setShowPayload((v) => !v)} className={btnGhost}>
            {showPayload ? 'Hide JSON' : 'Preview JSON'}
          </button>
          <button
            type="button"
            onClick={() => setShowPreview((v) => !v)}
            className={`rounded-[7px] border px-4 py-[9px] text-[13px] font-semibold transition-colors ${
              showPreview
                ? 'border-[#002850] bg-[#002850] text-white'
                : 'border-[#d3dae1] bg-white text-[#41474d] hover:bg-[#f3f5f7]'
            }`}
          >
            Preview
          </button>
        </div>
      </div>

      {loadingDoc && (
        <div className="mb-4 rounded-[6px] border border-[#e6e9ec] bg-[#fafbfc] px-4 py-3 text-[13px] text-[#7c7d7e]">
          Loading question…
        </div>
      )}

      {loadError && (
        <div className="mb-4 rounded-[6px] border border-[#f5c2c7] bg-[#f8d7da] px-4 py-3 text-[13px] text-[#842029]">
          Could not load this question: {loadError}
        </div>
      )}

      {serverError && (
        <div className="mb-4 rounded-[6px] border border-[#f5c2c7] bg-[#f8d7da] px-4 py-3 text-[13px] text-[#842029]">
          {serverError}
        </div>
      )}

      {/* The exact document that will be stored — including the coordinate-keyed
          grid, so there is no doubt about what the builder produced. */}
      {showPayload && (
        <pre className="mb-4 max-h-[320px] overflow-auto rounded-[8px] border border-[#e6e9ec] bg-[#fafbfc] p-4 text-[11px] leading-[1.5] text-[#41474d]">
          {JSON.stringify(buildPayload(), null, 2)}
        </pre>
      )}

      <div className="grid grid-cols-12 gap-5">
        {/* ── Rail ──────────────────────────────────────────────────── */}
        <aside className="col-span-12 lg:col-span-3">
          <div className="lg:sticky lg:top-4">
            <div className="rounded-[10px] border border-[#e6e9ec] bg-white p-3">
              <SectionRail sections={sections} activeId={activeSection} onJump={jumpToSection} />
            </div>

            {(scores.reachable > 0 || scores.max > 0) && (
              <div className="mt-3 rounded-[10px] border border-[#e6e9ec] bg-white p-4">
                <div className="text-[10px] font-semibold uppercase tracking-[0.07em] text-[#9aa0a6]">
                  Score check
                </div>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="font-display text-[26px] font-semibold leading-none text-[#002850]">
                    {scores.reachable}
                  </span>
                  {scores.max > 0 && (
                    <span className="text-[13px] text-[#9aa0a6]">/ {scores.max}</span>
                  )}
                </div>

                {scores.max > 0 && (
                  <div className="mt-2 h-[5px] overflow-hidden rounded-full bg-[#eef1f4]">
                    <div
                      className={`h-full rounded-full ${scores.exceedsMax ? 'bg-[#b0362a]' : 'bg-[#1f7a4d]'}`}
                      style={{ width: `${Math.min(100, (scores.reachable / scores.max) * 100)}%` }}
                    />
                  </div>
                )}

                <dl className="mt-3 space-y-[3px] text-[12px]">
                  <div className="flex justify-between">
                    <dt className="text-[#7c7d7e]">Option scores</dt>
                    <dd className="font-medium text-[#41474d]">{scores.combined}</dd>
                  </div>
                  {scores.assessorTotal > 0 && (
                    <div className="flex justify-between">
                      <dt className="text-[#7c7d7e]">Assessor marks</dt>
                      <dd className="font-medium text-[#41474d]">{scores.assessorTotal}</dd>
                    </div>
                  )}
                </dl>

                {scores.exceedsMax && (
                  <p className="mt-2 text-[11px] leading-snug text-[#b0362a]">
                    Reachable marks exceed Max Marks.
                  </p>
                )}
              </div>
            )}

            {source === 'local' && (
              <p className="mt-3 px-1 text-[11px] leading-[1.55] text-[#9aa0a6]">
                Dropdown lists come from local config — connect
                <code className="mx-1 rounded bg-[#f1f3f5] px-1">/meta</code>
                to manage them from the admin screens.
              </p>
            )}
          </div>
        </aside>

        {/* ── Form ──────────────────────────────────────────────────── */}
        <div className={`col-span-12 ${showPreview ? 'lg:col-span-5' : 'lg:col-span-9'}`} ref={bodyRef}>
          <div className="space-y-5 rounded-[10px] border border-[#e6e9ec] bg-white p-5">
            <FormSection id="classify" title="Classification" hint="Who this question is for, and when">
              {renderFields(fieldsOf('classify'))}
            </FormSection>

            <FormSection id="placement" title="Placement & Marks" hint="Where it sits in the questionnaire">
              {renderFields(fieldsOf('placement'))}
            </FormSection>

            <FormSection id="content" title="Question Content" hint="What the respondent reads">
              {renderFields(fieldsOf('content'))}

              <CollapsibleSection
                title="Reporting & Guidance"
                subtitle="Tooltip · BRSR Core · Standard Alignment"
                count={REPORTING_FIELDS.filter((f) => {
                  const v = state[f.name];
                  return Array.isArray(v) ? v.length > 0 : !!String(v || '').replace(/<[^>]*>/g, '').trim();
                }).length}
              >
                {renderFields(REPORTING_FIELDS.map((f) => ({ ...f, span: 12 })))}
              </CollapsibleSection>
            </FormSection>

            <FormSection id="answering" title="How It Is Answered" hint="Answer type, capabilities and scoring">
              {renderFields(fieldsOf('answering'))}

              {/* Defaults come from the answer type, but a question can override
                  them — a Text question that carries no marks, an option
                  question that also accepts evidence. */}
              <div className="mb-3">
                <label className={labelClass}>Capabilities</label>
                <div className="flex flex-wrap gap-2">
                  {CAPABILITY_FIELDS.map((c) => (
                    <label
                      key={c.name}
                      title={c.hint}
                      className={`flex cursor-pointer items-center gap-2 rounded-[6px] border px-3 py-[7px] text-[13px] transition-colors ${
                        state[c.name]
                          ? 'border-[#002850] bg-[#eef3f8] font-medium text-[#002850]'
                          : 'border-[#d3dae1] bg-white text-[#6e6e6e] hover:border-[#b9c3cd]'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={!!state[c.name]}
                        onChange={(e) => setField(c.name, e.target.checked)}
                        className="h-[14px] w-[14px] accent-[#002850]"
                      />
                      {c.label}
                    </label>
                  ))}
                </div>
              </div>

              <CollapsibleSection
                title="Scoring"
                subtitle={state.scoringRule?.engine ? describeRule(state.scoringRule, catalog) : 'Default — add up selected options'}
                count={state.scoringRule?.engine ? 1 : 0}
                hasError={!!errorFor('scoringRule')}
              >
                {errorFor('scoringRule') && (
                  <div className="mb-2 text-[12px] text-[#ff0000]">{errorFor('scoringRule')}</div>
                )}
                <ScoringRuleEditor
                  rule={state.scoringRule}
                  onChange={(r) => setField('scoringRule', r)}
                  catalog={catalog}
                  gridSources={gridSources}
                  maxMark={Number(state.maxMark) || 0}
                />
              </CollapsibleSection>
            </FormSection>

            <FormSection
              id="answers"
              title="Answers"
              hint={state.answerType
                ? `${answerType.label} — ${answerType.hint}`
                : 'Select an answer type above to describe how this question is answered'}
              aside={
                <button
                  type="button"
                  onClick={() => {
                    // Fold what is already there so the new card is the only
                    // one open — the author is about to work on it.
                    setCollapsedKeys(new Set(state.answers.map((a) => a.key)));
                    addAnswer();
                  }}
                  className="flex-shrink-0 rounded-[6px] bg-[#002850] px-4 py-[8px] text-[13px] font-semibold text-white transition-colors hover:bg-[#013a6f]"
                >
                  + Add Answer
                </button>
              }
            >
              {errorFor('answers') && (
                <div className="mb-2 rounded-[6px] border border-[#f0d7d3] bg-[#fdf6f5] px-3 py-2 text-[12px] text-[#b0362a]">
                  {errorFor('answers')}
                </div>
              )}

              {state.answers.length === 0 ? (
                <div className="rounded-[8px] border border-dashed border-[#d3dae1] px-4 py-8 text-center">
                  <p className="text-[13px] text-[#7c7d7e]">No answers yet.</p>
                  <p className="mt-1 text-[12px] text-[#9aa0a6]">
                    Add the options a respondent will choose from.
                  </p>
                </div>
              ) : (
                <>
                  {state.answers.length > 1 && (
                    <div className="mb-2 flex items-center justify-between text-[11px] text-[#9aa0a6]">
                      <span>{state.answers.length} answers</span>
                      <button
                        type="button"
                        onClick={() => setCollapsedKeys(
                          collapsedKeys.size === state.answers.length
                            ? new Set()
                            : new Set(state.answers.map((a) => a.key))
                        )}
                        className="font-semibold text-[#002850] hover:underline"
                      >
                        {collapsedKeys.size === state.answers.length ? 'Expand all' : 'Collapse all'}
                      </button>
                    </div>
                  )}

                  {state.answers.map((answer, index) => (
                    <AnswerCard
                      key={answer.key}
                      value={answer}
                      index={index}
                      total={state.answers.length}
                      path={['answers', index]}
                      allowsSubAnswers={allowsSubAnswers}
                      collapsed={collapsedKeys.has(answer.key)}
                      onToggleCollapse={() => setCollapsedKeys((prev) => {
                        const next = new Set(prev);
                        if (next.has(answer.key)) next.delete(answer.key);
                        else next.add(answer.key);
                        return next;
                      })}
                      onMove={moveAnswer}
                      onRemove={() => removeAnswer(index)}
                      onToggleSubAnswers={toggleSubAnswers}
                      onAddSubAnswer={addSubAnswer}
                      onRemoveSubAnswer={removeSubAnswer}
                      {...nested}
                    />
                  ))}
                </>
              )}
            </FormSection>
          </div>
        </div>

        {/* ── Preview ───────────────────────────────────────────────────
            Sticky beside the form, so an author sees the effect of a change
            without leaving the field they changed. It renders the SAVED shape,
            so what appears here is what a respondent gets. */}
        {showPreview && (
          <aside className="col-span-12 lg:col-span-4">
            <div className="lg:sticky lg:top-4">
              <AnswerPreview form={state} catalog={catalog} />
            </div>
          </aside>
        )}
      </div>

      {/* ── Action bar ───────────────────────────────────────────────
          Sticky, because the form is long enough that a Submit button at the
          top is a Submit button you cannot reach. The error count is a button:
          it takes you to the first section that has one. */}
      {/* `sticky`, not `fixed`: fixed positioning is measured from the viewport,
          so the bar ran under the sidebar and had to be told the sidebar's
          width — a number that would silently go stale. Sticky pins it to the
          bottom of the viewport while it stays inside the content column, so it
          lines up on its own and takes up its own space instead of covering the
          last row of the form. */}
      <div className="sticky bottom-0 z-30 -mx-6 mt-4 border-t border-[#e0e5ea] bg-white/95 px-6 backdrop-blur">
        <div className="flex items-center justify-between gap-4 py-[10px]">
          {errorKeys.length > 0 && submitAttempted ? (
            <button
              type="button"
              onClick={jumpToFirstProblem}
              className="flex items-center gap-2 text-[13px] font-semibold text-[#b0362a] hover:underline"
            >
              <span className="flex h-[16px] w-[16px] items-center justify-center rounded-full bg-[#b0362a] text-[10px] font-bold text-white">
                !
              </span>
              {errorKeys.length} field{errorKeys.length > 1 ? 's' : ''} need attention — go to first
            </button>
          ) : (
            <span className="text-[13px] text-[#7c7d7e]">
              {errorKeys.length === 0
                ? 'All required fields are filled'
                : `${errorKeys.length} field${errorKeys.length > 1 ? 's' : ''} still to fill`}
            </span>
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                // In edit mode "reset" means "undo my changes", not "blank the
                // form" — blanking a saved question and then saving would wipe
                // it, which is not what the word suggests.
                if (isEdit && doc) replace(doc);
                else reset();
                setCollapsedKeys(new Set());
              }}
              className={btnGhost}
            >
              {isEdit ? 'Discard changes' : 'Reset form'}
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving || loadingDoc}
              className="rounded-[6px] bg-[#002850] px-7 py-[9px] text-[13px] font-semibold uppercase tracking-wide text-white transition-colors hover:bg-[#013a6f] disabled:opacity-50"
            >
              {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Submit'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
