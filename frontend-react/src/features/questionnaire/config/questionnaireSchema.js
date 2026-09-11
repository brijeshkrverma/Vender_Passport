/**
 * FORM SCHEMA — field metadata driven by data, not JSX.
 *
 * The page renders from these lists. A new field is an entry here plus, if it
 * needs one, a control in the field registry — not a hand-placed <input> that
 * some other screen then forgets to include.
 *
 * `MASTERS` are the fallback dropdown sources. They are only defaults: at
 * runtime `useQuestionnaireMeta` replaces any list the API can supply, so the
 * catalogue becomes admin-managed without touching this file.
 */

const thisYear = 2026;

export const MASTERS = {
  /** Supply-chain tier the question applies to. */
  type: [
    { value: 'OEM', label: 'OEM' },
    { value: 'Upstream', label: 'Upstream' },
    { value: 'DownStream', label: 'DownStream' },
  ],
  category: [
    { value: 'General', label: 'General' },
    { value: 'Decarbonization', label: 'Decarbonization' },
    { value: 'Circularity', label: 'Circularity' },
    { value: 'Health & Safety', label: 'Health & Safety' },
    { value: 'Human Rights', label: 'Human Rights' },
    { value: 'Automobile Sector', label: 'Automobile Sector' },
  ],
  /**
   * Order slots. The original hardcoded 1..30 as thirty literal objects; the
   * ceiling is a config number here so a longer questionnaire does not need a
   * code change.
   */
  questionOrderNo: Array.from({ length: 30 }, (_, i) => ({
    value: String(i + 1), label: String(i + 1),
  })),
  financialYear: Array.from({ length: 6 }, (_, i) => {
    const start = thisYear - 2 + i;
    return { value: String(start), label: `${start}-${String(start + 1).slice(2)}` };
  }),
  /** BRSR / BRSR Core standard clauses. Real list comes from the API. */
  standardAlignment: [],
};

/**
 * Stable keys for answers and sub-answers.
 *
 * These are PERSISTED, not render-time ids. Every value reference in a formula,
 * a mark rule or a trend rule addresses its target by key, so a key that were
 * regenerated on load — or an index used in its place — would silently
 * re-point every rule the moment the author reordered two options.
 *
 * The time component is not decoration. A plain session counter restarts at 1
 * on every page load, so opening a question that already contains `a1` and
 * adding one more answer would mint a second `a1` — and the two would be
 * indistinguishable to every rule pointing at either.
 */
let seq = 0;
const key = (p) => { seq += 1; return `${p}${Date.now().toString(36).slice(-4)}${seq}`; };

/* ── Factories ─────────────────────────────────────────────────────────── */

export function emptyQuestionnaire() {
  return {
    type: [],
    standardAlignment: [],
    assessmentYear: '',
    financialYear: '',
    category: '',
    section: '',
    subSection: '',
    questionOrderNo: '',
    position: '',
    maxMark: '',
    isMarks: true,
    isText: false,
    isUpload: false,
    question: '',
    description: '',
    tooltip: '',
    brsrCore: '',
    answerType: '',
    /**
     * How this question's marks are worked out. `null` means the default —
     * add up the selected options. Anything else names an engine from
     * `markEngines`, which is where the 40 hardcoded per-question branches go.
     */
    scoringRule: null,
    answers: [],
  };
}

/** One assessor sub-option — the second marking level. */
export function emptyAssessorSubOption() {
  return { key: key('so'), option: '', marks: '', marksNotApplicable: false };
}

/** One assessor option — what the assessor ticks while marking. */
export function emptyAssessorOption() {
  return {
    key: key('ao'),
    option: '',
    marks: '',
    marksNotApplicable: false,
    assessorGuidance: '',
    subOptions: [],
  };
}

export function emptyGridColumn(label = '') {
  return { key: key('gc'), label, type: 'text' };
}

export function emptyGridRow(columns = []) {
  const cells = {};
  columns.forEach((c) => { cells[c.key] = ''; });
  return {
    key: key('gr'),
    label: '',
    disabled: false,
    cells,
    /** Column keys marked as available to the formula builder. */
    calc: {},
    assessorOptionType: '',
    assessorGuidance: '',
    assessorOptions: [],
  };
}

/** A grid starts usable: one label column, one data column, one row. */
export function emptyGrid() {
  const columns = [emptyGridColumn('Name'), emptyGridColumn('Value')];
  return {
    rowHeaderLabel: '',
    columns,
    rows: [emptyGridRow(columns)],
    formulas: [],
  };
}

/**
 * Formulas are held in the same token shape they are stored in
 * (`{ target: {row, col}, expr: [...] }`), so there is no editor-only
 * representation to keep in sync. The builder writes them directly.
 */

export function emptySubAnswer() {
  return {
    key: key('s'),
    subAnswerLabel: '',
    subScore: '',
    gridLabel: '',
    subAnswerType: '',
    inputMode: '',
    isDisabled: false,
    flag: '',
    /** { ref, operator, value } — null means always shown. */
    dependsOn: null,
    /** Relative contribution among siblings. */
    weight: '1',
    evidenceRequired: false,
    assessorOptionType: '',
    assessorGuidance: '',
    assessorOptions: [],
    /** Whatever this sub-answer's type needs configuring — see types/. */
    config: null,
    /**
     * Assessor validation. Reads the grid's year-on-year change and selects one
     * of this sub-answer's assessor options by itself. `null` means the
     * assessor decides by hand, which is the default.
     */
    trendRule: null,
  };
}

export function emptyAnswer() {
  return {
    key: key('a'),
    answerLabel: '',
    displayLabel: '',
    sortOrder: '',
    score: '',
    assessorOptionType: '',
    assessorGuidance: '',
    assessorOptions: [],
    hasSubAnswers: false,
    subAnswerType: '',
    subAnswers: [],
  };
}

/* ── Field definitions ─────────────────────────────────────────────────── */

/**
 * The authoring form's sections, in order.
 *
 * Twelve fields in one undifferentiated run is hard to scan and impossible to
 * navigate — an author looking for "Max Marks" had to read every label. Naming
 * the groups also gives the section rail something to jump to and to count
 * errors against.
 */
export const FORM_SECTIONS = [
  { id: 'classify', title: 'Classification', hint: 'Who this question is for, and when' },
  { id: 'placement', title: 'Placement & Marks', hint: 'Where it sits in the questionnaire' },
  { id: 'content', title: 'Question Content', hint: 'What the respondent reads' },
  { id: 'answering', title: 'How It Is Answered', hint: 'Answer type and capabilities' },
];

/**
 * "Basic Information" fields.
 *   `group` — which section it belongs to
 *   `span`  — 12-col desktop width
 *   `width` — 'sm' keeps a numeric input from stretching to 700px
 */
export const BASIC_FIELDS = [
  { name: 'type', label: 'Type', control: 'multiselect', source: 'type', required: true, span: 12, group: 'classify', placeholder: 'Select type' },
  { name: 'assessmentYear', label: 'Assesment Year', control: 'date', required: true, span: 4, group: 'classify' },
  { name: 'category', label: 'Category', control: 'select', source: 'category', required: true, span: 4, group: 'classify', placeholder: 'Select category' },
  { name: 'financialYear', label: 'Financial Year', control: 'select', source: 'financialYear', span: 4, group: 'classify', placeholder: 'Select year', hint: 'Used by the question list and year rollover' },

  { name: 'section', label: 'Section', control: 'text', span: 6, group: 'placement', placeholder: 'Enter section', maxWords: 200 },
  { name: 'subSection', label: 'Sub-Section', control: 'text', span: 6, group: 'placement', placeholder: 'Enter sub-section', maxWords: 200 },
  { name: 'questionOrderNo', label: 'Question Oder No', control: 'select', source: 'questionOrderNo', required: true, span: 4, group: 'placement', width: 'sm', placeholder: 'Select' },
  { name: 'position', label: 'Position', control: 'number', span: 4, group: 'placement', width: 'sm', placeholder: 'e.g. 12', hint: 'Drag-and-drop order in the list' },
  { name: 'maxMark', label: 'Max Marks', control: 'number', span: 4, group: 'placement', width: 'sm', placeholder: 'e.g. 100' },

  { name: 'question', label: 'Question', control: 'richtext', required: true, span: 12, group: 'content' },
  { name: 'description', label: 'Description', control: 'textarea', span: 12, rows: 3, group: 'content', hint: 'Shown in exports as “BRSR Questionnaire”' },

  { name: 'answerType', label: 'Answer Type', control: 'answerType', span: 6, group: 'answering', placeholder: 'Select type' },
];

/**
 * "Reporting & Guidance" block — optional, collapsed by default.
 *
 * These fields exist on every stored question and are exported in the BRSR
 * report, but the Angular create screen never offered them: they could only be
 * populated by editing the database directly.
 */
export const REPORTING_FIELDS = [
  { name: 'tooltip', label: 'Tooltip', control: 'richtext', span: 12, hint: 'Help text shown to the respondent' },
  { name: 'brsrCore', label: 'BRSR Core', control: 'richtext', span: 12, hint: 'BRSR Core disclosure wording' },
  { name: 'standardAlignment', label: 'Standard Alignment', control: 'multiselect', source: 'standardAlignment', span: 12, placeholder: 'Select BRSR / BRSR Core clauses' },
];

/** Capability toggles. Derived defaults, but the author can override. */
export const CAPABILITY_FIELDS = [
  { name: 'isMarks', label: 'Carries marks', hint: 'Counts towards the assessment total' },
  { name: 'isText', label: 'Accepts free text', hint: 'Respondent can type an answer' },
  { name: 'isUpload', label: 'Accepts upload', hint: 'Respondent can attach evidence' },
];
