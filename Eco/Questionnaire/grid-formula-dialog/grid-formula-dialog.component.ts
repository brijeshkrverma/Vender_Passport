import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

// Engine ki ek hi copy — backend (save pe dobara verify) bhi yahi use karta hai.
import {
  validateFormulas, evaluateFormulas, formulaToText, cellLabel, subLabel, cellKey, computedCellKeys,
} from '../../../../../Backend/scoring/grid-formula';

// Trend rule = assessor validation ka wo hissa jo aaj tak code me hardcoded tha.
import {
  validateTrendRule, evaluateTrendRule, validateBands as validateTrendBands,
} from '../../../../../Backend/scoring/trend-rule';

/**
 * GRID FORMULA BUILDER — popup.
 *
 * KAISE KAAM KARTA HAI (design ka faisla)
 *   Admin PEHLE target cell chunta hai, PHIR formula banata hai:
 *
 *       R4C4 pe click  ->  "R4C4 = " top pe dikhne lagta hai
 *       R1C1 pe click  ->  "R4C4 = R1C1"
 *       +      pe click ->  "R4C4 = R1C1 +"
 *       R2C4 pe click  ->  "R4C4 = R1C1 + R2C4"
 *       Save
 *
 *   Ye Excel wala tareeka hai — pehle cell chuno, phir formula likho. Ulta
 *   (pehle formula, aakhir me "=" dabakar target) isliye nahi rakha kyunki tab
 *   admin ko aakhir tak pata hi nahi chalta ki wo kaunsa cell bhar raha hai,
 *   aur ek galat click pe poora dobara banana padta hai.
 *
 *   "Add Calc" wali per-cell marking bhi nahi rakhi — jab popup me kisi bhi
 *   cell pe click karke use target banaya ja sakta hai, to pehle har cell ko
 *   alag se mark karna ek extra step hai jo koi nayi capability nahi deta.
 */
@Component({
  selector: 'app-grid-formula-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule],
  templateUrl: './grid-formula-dialog.component.html',
  styleUrls: ['./grid-formula-dialog.component.css'],
})
export class GridFormulaDialogComponent {
  rows: number[] = [];
  cols: number[] = [];
  grid: any[] = [];

  /** Jo formulas ab tak bane hain. */
  formulas: any[] = [];

  /** Abhi ban raha formula. */
  target: { row: number; col: number } | null = null;
  expr: any[] = [];

  /**
   * Cross-question target — nateeja isi grid me nahi, kisi AUR question ke
   * field me jaayega. Jaise energy ka "Renewable %" -> renewable-sources
   * question ka "Renewable Energy % of total energy consumption".
   */
  targetQuestion: any = null;

  /** Doosre questions jinme numeric sub-answer hai (target ban sakte hain). */
  crossTargets: { questionId: string; optionIndex: number; subIndex: number; label: string }[] = [];

  /**
   * Grid ke BAHAR wale sub-answer inputs — jaise "Consent to operate (KL)"
   * checkbox, jispe click karne se ek number input khulta hai.
   *
   * Kai questions me grid ka calculation inhi values pe depend karta hai
   * (jaise water utilisation % = consumed / consent-to-operate * 100), isliye
   * inhe bhi formula me lagaya ja sakta hai.
   */
  subs: { index: number; label: string; type: string }[] = [];

  /** Preview ke liye — admin sample values daal kar nateeja dekh sakta hai. */
  showPreview = false;
  previewGrid: any[] = [];
  previewWarnings: string[] = [];
  previewSubs: any[] = [];

  // ================= ASSESSOR VALIDATION (trend) =================
  //
  // Popup ke do kaam hain, isliye do tabs:
  //   'cell'  -> nateeja is grid ke kisi cell me jaata hai  (purana kaam)
  //   'trend' -> nateeja koi MARK nahi, balki ye tay karta hai ki assessor ka
  //              kaunsa option apne aap select hoga  (naya kaam)
  //
  // Trend alag tab me isliye hai, ek aur formula ki tarah nahi, kyunki uska
  // nateeja jaata hi kahin aur hai — cell me nahi, assessor ke option me.

  mode: 'cell' | 'trend' = 'cell';

  /** Doosre questions jinke paas grid hai — denominator inme se aayega. */
  gridSources: any[] = [];

  /** Is question ke assessor options — band inhi me se ek chunta hai. */
  assessorOptions: string[] = [];

  /**
   * Kitne questions padhe gaye. "Koi grid nahi mila" do bilkul alag wajah se
   * ho sakta hai — ya to list hi khali aayi (server / data ka masla), ya list
   * aayi par usme grid nahi tha. Ginti dikhane se ye farq turant saaf ho jaata
   * hai, aur andaza lagana nahi padta.
   */
  questionsScanned = -1;
  questionsLoadError = '';

  /** Empty state me kya wajah likhni hai. */
  get gridSourceDiagnosis(): string {
    if (this.questionsLoadError)
      return 'Questions ki list load hi nahi hui (' + this.questionsLoadError
        + '). Page refresh karke dekhein — server se list aaye bina denominator nahi chun sakte.';
    if (this.questionsScanned === -1)
      return 'Questions ki list abhi aayi nahi hai. Ek pal ruk kar popup dobara kholein.';
    if (this.questionsScanned === 0)
      return 'Server se 0 questions aaye. Yaani list khali hai — is database me abhi koi '
        + 'doosra question hai hi nahi, ya list dene wali API kuch laut nahi rahi.';
    return this.questionsScanned + ' questions padhe gaye, par unme se kisi me bhi Grid '
      + 'sub-answer nahi mila. Denominator (revenue / production) kisi question ke Grid me '
      + 'hona chahiye.';
  }

  /** Ban raha / bana hua trend rule. */
  trend: any = null;

  /** Denominator ke liye chuna gaya source (gridSources me se). */
  denSource: any = null;

  trendPreview: any = null;

  constructor(
    public dialogRef: MatDialogRef<GridFormulaDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.grid = JSON.parse(JSON.stringify(data?.gridValue || []));
    this.formulas = JSON.parse(JSON.stringify(data?.formulas || []));
    this.subs = (data?.subs || []).map((s: any) => ({
      index: s.index,
      label: s.label || `Sub-answer ${s.index + 1}`,
      type: s.type || '',
    }));
    this.crossTargets = data?.crossTargets || [];
    this.gridSources = data?.gridSources || [];
    this.assessorOptions = data?.assessorOptions || [];
    this.questionsScanned = data?.questionsScanned ?? -1;
    this.questionsLoadError = data?.questionsLoadError || '';
    this.trend = data?.trendRule ? JSON.parse(JSON.stringify(data.trendRule)) : null;
    if (this.trend?.denominator?.questionId) {
      this.denSource = this.gridSources.find(
        (g: any) => String(g.questionId) === String(this.trend.denominator.questionId)
          && Number(g.optionIndex) === Number(this.trend.denominator.optionIndex ?? g.optionIndex)
      ) || null;
    }
    this.rows = this.grid.map((_: any, i: number) => i);
    const colCount = this.grid.reduce((m: number, row: any, r: number) => {
      const n = Object.keys(row || {}).filter((k) => k.indexOf(String(r)) === 0).length;
      return Math.max(m, n);
    }, 0);
    this.cols = Array.from({ length: colCount }, (_, i) => i);
  }

  // ---- grid padhna ----

  cellValue(r: number, c: number): string {
    const row = this.grid[r];
    if (!row) return '';
    const cell = row[cellKey(r, c)];
    if (cell === undefined || cell === null) return '';
    const v = typeof cell === 'object' ? cell.val : cell;
    return v === undefined || v === null ? '' : String(v);
  }

  label(r: number, c: number): string { return cellLabel({ row: r, col: c }); }

  /** Header row (0) aur pehla column aksar labels hote hain — unhe halka dikhate hain. */
  isLabelCell(r: number, c: number): boolean { return r === 0 || c === 0; }

  /**
   * Sirf wahi cells formula me use ho sakte hain jinpe admin ne grid me
   * "Add Calc" chuna tha. Isse popup me poora grid clickable nahi hota —
   * admin ko sirf apne chune hue cells dikhte hain.
   */
  isCalcCell(r: number, c: number): boolean {
    const row = this.grid[r];
    if (!row) return false;
    const cell = row[cellKey(r, c)];
    return !!(cell && typeof cell === 'object' && cell.isCalc === true);
  }

  /** Kitne cells "Add Calc" se chune gaye hain. */
  get calcCellCount(): number {
    let n = 0;
    this.rows.forEach((r) => this.cols.forEach((c) => { if (this.isCalcCell(r, c)) n += 1; }));
    return n;
  }

  // ---- state ----

  isTarget(r: number, c: number): boolean {
    return !!this.target && this.target.row === r && this.target.col === c;
  }

  /** Cell jispe pehle se koi formula laga hai. */
  isComputed(r: number, c: number): boolean {
    return computedCellKeys(this.formulas).indexOf(cellKey(r, c)) >= 0;
  }

  /** Cell jo abhi ban rahe formula me use hua hai. */
  isUsed(r: number, c: number): boolean {
    return this.expr.some((t) => t.cell && t.cell.row === r && t.cell.col === c);
  }

  get building(): boolean { return this.target !== null || this.targetQuestion !== null; }

  get currentText(): string {
    if (!this.building) return '';
    const f = this.targetQuestion
      ? { targetQuestion: this.targetQuestion, expr: this.expr }
      : { target: this.target, expr: this.expr };
    return formulaToText(f).replace(/\s+$/, '');
  }

  /** Doosre question ko target banana — grid cell ki jagah. */
  pickCrossTarget(t: any) {
    if (!t) { this.targetQuestion = null; return; }
    this.target = null;
    this.targetQuestion = {
      questionId: t.questionId,
      optionIndex: t.optionIndex,
      subIndex: t.subIndex,
      field: 'numericTypeVal',
    };
    this.expr = [];
  }

  get crossTargetLabel(): string {
    if (!this.targetQuestion) return '';
    const t = this.crossTargets.find(
      (x) => x.questionId === this.targetQuestion.questionId && x.subIndex === this.targetQuestion.subIndex
    );
    return t ? t.label : 'doosra question';
  }

  /** Ab cell chahiye ya operator — buttons ko isse enable/disable karte hain. */
  get expectsValue(): boolean {
    if (!this.expr.length) return true;
    const last = this.expr[this.expr.length - 1];
    return !!last.op && last.op !== ')';
  }

  // ---- banana ----

  onCellClick(r: number, c: number) {
    if (!this.isCalcCell(r, c)) return;    // sirf "Add Calc" wale cells
    if (this.targetQuestion) {
      // cross-question target chuna hua hai -> cell sirf formula me jaayega
      if (!this.expectsValue) return;
      this.expr.push({ cell: { row: r, col: c } });
      return;
    }
    if (!this.target) {
      if (this.isComputed(r, c)) return;   // pehle se formula hai — pehle wo hatao
      this.target = { row: r, col: c };
      this.expr = [];
      return;
    }
    if (this.target.row === r && this.target.col === c) return;  // khud ko nahi
    if (!this.expectsValue) return;
    this.expr.push({ cell: { row: r, col: c } });
  }

  /** Sub-answer input ko formula me daalna (grid ke bahar wali value). */
  onSubClick(index: number) {
    if (!this.target || !this.expectsValue) return;
    this.expr.push({ sub: { index } });
  }

  /** Ye sub abhi ban rahe formula me use hua hai? */
  isSubUsed(index: number): boolean {
    return this.expr.some((t) => t.sub && t.sub.index === index);
  }

  subRef(index: number): string { return subLabel({ index }); }

  addOp(op: string) {
    if (!this.target) return;
    if (op === '(') { this.expr.push({ op }); return; }
    if (op === ')') { this.expr.push({ op }); return; }
    if (this.expectsValue) return;
    this.expr.push({ op });
  }

  addNumber(n: string) {
    if (!this.target || !this.expectsValue) return;
    this.expr.push({ num: Number(n) });
  }

  backspace() { this.expr.pop(); }

  cancelBuilding() { this.target = null; this.targetQuestion = null; this.expr = []; }

  get currentErrors(): string[] {
    if (!this.building || !this.expr.length) return [];
    const draft: any = this.targetQuestion
      ? { targetQuestion: this.targetQuestion, expr: this.expr }
      : { target: this.target, expr: this.expr };
    return validateFormulas(
      this.formulas.concat([draft]),
      { rows: this.rows.length, cols: this.cols.length, subCount: this.subs.length }
    );
  }

  saveFormula() {
    if (!this.building || !this.expr.length || this.currentErrors.length) return;
    this.formulas.push(this.targetQuestion
      ? { targetQuestion: this.targetQuestion, expr: this.expr }
      : { target: this.target, expr: this.expr });
    this.target = null;
    this.targetQuestion = null;
    this.expr = [];
    this.refreshPreview();
  }

  removeFormula(i: number) {
    this.formulas.splice(i, 1);
    this.refreshPreview();
  }

  text(f: any): string { return formulaToText(f); }

  get allErrors(): string[] {
    return validateFormulas(this.formulas, {
      rows: this.rows.length, cols: this.cols.length, subCount: this.subs.length,
    });
  }

  // ---- preview ----

  togglePreview() {
    this.showPreview = !this.showPreview;
    if (this.showPreview) this.refreshPreview();
  }

  onPreviewInput(r: number, c: number, ev: any) {
    const row = this.previewGrid[r] || (this.previewGrid[r] = {});
    row[cellKey(r, c)] = { val: ev.target.value, type: 'number' };
    this.refreshPreview();
  }

  previewValue(r: number, c: number): string {
    const row = this.previewGrid[r];
    if (!row) return '';
    const cell = row[cellKey(r, c)];
    if (!cell) return '';
    return typeof cell === 'object' ? (cell.val ?? '') : String(cell);
  }

  /** Preview me sub-answer input ki sample value. */
  onPreviewSubInput(index: number, ev: any) {
    this.previewSubs[index] = { numericTypeVal: ev.target.value };
    this.refreshPreview();
  }

  previewSubValue(index: number): string {
    return this.previewSubs[index]?.numericTypeVal ?? '';
  }

  private refreshPreview() {
    if (!this.showPreview) return;
    if (!this.previewGrid.length) this.previewGrid = JSON.parse(JSON.stringify(this.grid));
    const out = evaluateFormulas(this.previewGrid, this.formulas, this.previewSubs);
    this.previewGrid = out.gridValue;
    this.previewWarnings = out.warnings;
  }

  // ================= trend rule =================

  setMode(m: 'cell' | 'trend') { this.mode = m; }

  /**
   * Is grid ke kaunse columns SAAL ke hain.
   *
   * Sirf "column 0 chhod do" kaafi nahi — asli data me revenue wale grid ke
   * columns "Information | Unit | FY 2021 | FY 2022 | FY 2023" hain, yaani
   * column 1 "Unit" hai. Header padh kar chunte hain, na mile to sab.
   */
  private guessYearCols(): number[] {
    const looksLikeYear = (s: string) =>
      /(^|\D)(19|20)\d{2}(\D|$)/.test(s) || /\bFY\b|\byear\b/i.test(s);
    const hit = this.cols.filter((c) => c > 0 && looksLikeYear(this.cellValue(0, c) || ''));
    return hit.length >= 2 ? hit : this.cols.filter((c) => c > 0);
  }

  /** Rule pehli baar banate waqt sensible default de do. */
  startTrend() {
    const years = this.guessYearCols();
    const def = this.gridSources[0] || null;
    this.denSource = def;

    const nCols = years.slice(0, 3);
    // Dono taraf ke saal ki ginti BARABAR honi chahiye — engine inhe position
    // se jodta hai (pehla-pehla, doosra-doosra). Isliye denominator ko
    // numerator jitna hi kaat dete hain.
    const dAll = (def?.yearCols && def.yearCols.length) ? def.yearCols : years;
    const dCols = dAll.slice(0, nCols.length);

    this.trend = {
      numerator: { row: this.rows.length > 1 ? 1 : 0, cols: nCols },
      denominator: {
        questionId: def?.questionId || '',
        optionIndex: def?.optionIndex ?? 0,
        subIndex: def?.subIndex ?? 0,
        row: def && def.rows.length > 1 ? 1 : 0,
        cols: dCols,
      },
      bands: this.assessorOptions.length
        ? this.defaultBands()
        : [],
      allowOverride: false,
    };
    this.refreshTrend();
  }

  /** Teen band ka wahi shape jo aaj code me hardcoded hai — par edit ho sakta hai. */
  private defaultBands() {
    const o = this.assessorOptions;
    const pick = (i: number) => o[Math.min(i, o.length - 1)] || '';
    return [
      { from: null, to: -5, option: pick(0), marks: 20 },
      { from: -5, to: 5, option: pick(1), marks: 10 },
      { from: 5, to: null, option: pick(2), marks: 0 },
    ];
  }

  removeTrend() { this.trend = null; this.trendPreview = null; }

  /** Option usi row pe dikhe jo padhi gayi, ya kisi aur pe. */
  toggleSeparateTarget(on: boolean) {
    if (!this.trend) return;
    this.trend.targetRow = on ? this.trend.numerator.row : null;
  }

  /** Numerator ki row grid me click karke chunte hain. */
  pickNumeratorRow(r: number) {
    if (!this.trend) return;
    this.trend.numerator.row = r;
    this.refreshTrend();
  }

  /** Saal wale columns toggle — kaunse columns tulna me hain. */
  toggleNumeratorCol(c: number) {
    if (!this.trend) return;
    const cols = this.trend.numerator.cols;
    const i = cols.indexOf(c);
    if (i >= 0) cols.splice(i, 1); else cols.push(c);
    cols.sort((a: number, b: number) => a - b);
    this.refreshTrend();
  }

  isNumeratorCol(c: number): boolean {
    return !!this.trend && this.trend.numerator.cols.indexOf(c) >= 0;
  }

  onDenSourceChange(src: any) {
    if (!this.trend) return;
    this.denSource = src || null;
    this.trend.denominator.questionId = src?.questionId || '';
    this.trend.denominator.optionIndex = src?.optionIndex ?? 0;
    this.trend.denominator.subIndex = src?.subIndex ?? 0;
    this.trend.denominator.row = src && src.rows.length > 1 ? 1 : 0;
    this.trend.denominator.cols = (src?.yearCols || []).slice(0, this.trend.numerator.cols.length);
    this.refreshTrend();
  }

  pickDenominatorRow(r: number) {
    if (!this.trend) return;
    this.trend.denominator.row = r;
    this.refreshTrend();
  }

  toggleDenominatorCol(c: number) {
    if (!this.trend) return;
    const cols = this.trend.denominator.cols;
    const i = cols.indexOf(c);
    if (i >= 0) cols.splice(i, 1); else cols.push(c);
    cols.sort((a: number, b: number) => a - b);
    this.refreshTrend();
  }

  isDenominatorCol(c: number): boolean {
    return !!this.trend && this.trend.denominator.cols.indexOf(c) >= 0;
  }

  addBand() {
    if (!this.trend) return;
    this.trend.bands.push({ from: 0, to: null, option: this.assessorOptions[0] || '', marks: 0 });
    this.refreshTrend();
  }

  removeBand(i: number) {
    if (!this.trend) return;
    this.trend.bands.splice(i, 1);
    this.refreshTrend();
  }

  setBandField(i: number, field: string, value: any) {
    if (!this.trend) return;
    const b = this.trend.bands[i];
    if (field === 'option') b.option = value;
    else b[field] = (value === '' || value === null) ? null : Number(value);
    this.refreshTrend();
  }

  /** Band edges se ban ne wali seedhi angrezi — "−∞ se −5 tak". */
  bandRangeText(b: any): string {
    const lo = (b.from === null || b.from === undefined) ? 'any value' : b.from + '%';
    const hi = (b.to === null || b.to === undefined) ? '' : ' up to ' + b.to + '%';
    if (b.from === null || b.from === undefined) {
      return (b.to === null || b.to === undefined) ? 'any change' : 'below ' + b.to + '%';
    }
    return (b.to === null || b.to === undefined) ? lo + ' or more' : lo + hi;
  }

  /** Rule ke apne errors (band gap/overlap wagairah). */
  get trendErrors(): string[] {
    if (!this.trend) return [];
    const errs = validateTrendRule(this.trend) as string[];
    if (this.assessorOptions.length) {
      this.trend.bands.forEach((b: any, i: number) => {
        if (b.option && this.assessorOptions.indexOf(b.option) < 0)
          errs.push('Band ' + (i + 1) + ' ka option "' + b.option + '" is question me hai hi nahi.');
      });
    }
    return errs;
  }

  get bandErrors(): string[] {
    return this.trend ? (validateTrendBands(this.trend.bands || []) as string[]) : [];
  }

  /** Abhi grid me jo values padi hain, unpe rule chalakar dikhao. */
  refreshTrend() {
    if (!this.trend) { this.trendPreview = null; return; }
    const denGrid = this.denSource?.grid || [];
    this.trendPreview = evaluateTrendRule(this.trend, this.grid, denGrid);
  }

  /** Preview ke liye chhote-chhote helpers (template me hisaab nahi karte). */
  fmt(n: any): string {
    if (n === null || n === undefined || n === '') return '—';
    const v = Number(n);
    if (isNaN(v)) return '—';
    return (Math.round(v * 100) / 100).toLocaleString('en-IN');
  }

  rowLabel(r: number): string {
    const v = this.cellValue(r, 0);
    return v || `Row ${r + 1}`;
  }

  denRowLabel(r: number): string {
    const rows = this.denSource?.rows || [];
    return rows[r] || `Row ${r + 1}`;
  }

  colLabel(c: number): string {
    const v = this.cellValue(0, c);
    return v || `Col ${c + 1}`;
  }

  denColLabel(c: number): string {
    const cols = this.denSource?.colLabels || [];
    return cols[c] || `Col ${c + 1}`;
  }

  // ---- close ----

  done() {
    if (this.allErrors.length || this.trendErrors.length) return;
    this.dialogRef.close({ formulas: this.formulas, trendRule: this.trend });
  }

  cancel() { this.dialogRef.close(); }
}
