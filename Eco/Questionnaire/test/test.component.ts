import { ChangeDetectorRef, Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router, RouterLink, RouterOutlet } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { NgSelectModule } from '@ng-select/ng-select';
import { AngularEditorConfig, AngularEditorModule } from '@kolkov/angular-editor';
import { FormArray, FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule, formatDate } from '@angular/common';
import { MatDividerModule } from '@angular/material/divider';
import { MatRadioModule } from '@angular/material/radio';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { AlertService } from '../../../services/alert.service';
import { GridFormulaDialogComponent } from '../grid-formula-dialog/grid-formula-dialog.component';
// Grid formula engine — backend save pe bhi yahi module chalata hai (ek hi copy).
import { formulaToText as gridFormulaToText } from '../../../../../Backend/scoring/grid-formula';
import { ApiService } from '../../../services/api.service';
import { LoaderService } from '../../../services/utility/loader.service';
import { FormGridComponent } from '../add-questionnaire/form-type-components/form-grid/form-grid.component';
import { MatTable, MatTableModule } from '@angular/material/table';
import { StorageService } from '../../../services/utility/storage.service';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { forkJoin } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { AssessordialogComponent } from '../assessordialog/assessordialog.component';
import { MaxWordLengthDirective } from '../../../directive/max-word-length.directive';
import { NumbersOnlyDirective } from '../../../directive/numbers-only.directive';

@Component({
  selector: 'app-test',
  standalone: true,

  imports: [
    NgSelectModule,
    CommonModule,
    AngularEditorModule,
    MatRadioModule,
    HttpClientModule,
    RouterOutlet,
    MaxWordLengthDirective,
    NumbersOnlyDirective,
    RouterLink,
    ReactiveFormsModule,
    FormsModule,
    CommonModule,
    MatDividerModule,
    MatFormFieldModule,
    MatInputModule,
    MatTableModule,
    FormGridComponent,
    MatCheckboxModule,
    MatButtonModule
  ],
  templateUrl: './test.component.html',
  styleUrls: ['./test.component.css']
})
export class TestComponent implements OnInit {


  devloperform: FormGroup;
  answerType: string = '';
  innerFormDataHolder: any = {};
  question_id: any = '';
  selectedType: string = '';
  selectedYear: string = '';
  sections:any[] = [
    'Section A',
    'Section B',
    'Section C',
    'Section D',
    'Section E',
    'Section F',
    'Section G',
    'Section H',
  ];

subOptionCounts:string[] = ['a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p','q','r','s','t','u','v','w','x','y','z']



  @ViewChild(MatTable, { static: true }) table!: MatTable<any>;
  displayedColumns: string[] = ['0'];
  columnsToDisplay: string[] = this.displayedColumns.slice();
  isAlignmentLoaded: boolean = false;
  constructor(private fb: FormBuilder,
    private alertService: AlertService,
    private apiService: ApiService,
    private loaderService: LoaderService,
    public storageService: StorageService,
    private router: ActivatedRoute,
    private _formBuilder: FormBuilder,
    public dialog: MatDialog,
    private cd:ChangeDetectorRef,
    private routes:Router
  ) {

    this.router.queryParams
      .subscribe(params => {
        this.question_id = params['id'];
        this.selectedType = params['type'] || '';
        this.selectedYear = params['fy'] || '';
      }
      );


    this.devloperform = this.fb.group({
      type: ['', Validators.required],
      assignmentYear: [this.getCurrentDate(), Validators.required],
      category: ['', Validators.required],
      section: [''],
      subSection: [''],
      // questionOrderNo: ['', Validators.required],
      maxMark: [0],
      question: ['', Validators.required],
      brsrCore: [''],
      description: [''],
      isMarks: [true],
      standardAlignment: [''],
      isText: [true],
      isUpload: [false],
      answerType: [''],
      tooltip: [''],
      answer: this.fb.array([]),
      formGrid: this.fb.array([
        new FormGroup({ '0': new FormControl('') })
      ])
    });

    if (this.question_id) {
      console.log('Question ID:', this.question_id);
      this.getQuestionById(this.question_id);
    } else if (this.selectedType) {
      this.devloperform.get('type')?.patchValue([this.selectedType]);
      this.devloperform.get('type')?.disable();
      if (this.selectedYear) {
        this.devloperform.get('assignmentYear')?.patchValue(this.getYearStartDate(this.selectedYear));
        this.devloperform.get('assignmentYear')?.disable();
      }
    } else {
      this.routes.navigate(['/dashboard/questionnaire-selector']);
    }
  }

  getYearStartDate(year: string): string {
    if (!year) return '';
    const y = Number(year);
    if (isNaN(y)) return year;
    return `${y}-01-01`;
  }

  gridArray(i: number, j: number): any {
    if (this.subanswar(i).at(j).value.subAnswerTypes == 'Grid') {
      const formArray = this.subanswar(i).at(j).get(j.toString()) as FormArray;
      if (formArray)
        return (this.subanswar(i).at(j).get(j.toString()) as FormArray).controls;
      else
        return undefined
    } else {
      return undefined
    }

  }

  getQuestionById(questionId: string) {
    this.apiService.getById('getQuestionniareById', questionId).subscribe({
      next: (resp: any) => {
        if (resp['status'] == 'success') {
          // console.log(resp['data']);
          let item = resp['data'];
          if (resp['data']) {
 
            this.devloperform = this._formBuilder.group({
              type: [item.type],
              assignmentYear: [item.assignmentYear],
              category: [item.category],
              section: [item.section],
              subSection: [item.subSection],
              questionOrderNo: [item.questionOrderNo],
              maxMark: [item.maxMark],
              isMarks:[item.isMarks],
              standardAlignment: [item.standardAlignment],
              question: [item.question],
              brsrCore: [item.brsrCore],
              description: [item.description],
              tooltip: [item.tooltip],
              answerType: [item.answerType],
              answer: this._formBuilder.array(
                item.answer.map((question: any) => this._formBuilder.group({
                  answerLabel: [question.answerLabel],
                  ansValue: [null],
                  sortOrder: [question.sortOrder],
                  score: [question.score],
                  subAnswer: [question.subAnswer],
                  assessorOption: [question.assessorOption || []],
                  assessorOptionType:[question.assessorOptionType || ''],
                  assessorGuidence:[question.assessorGuidence || ''],

                  subAnswerType: [question.subAnswerType],
                  subanswar: this._formBuilder.array(

                    question.subanswar?.length > 0 ? question.subanswar.map((subQuestion: any, i: number) => this._formBuilder.group({
                      subAnswerLabel: [subQuestion.subAnswerLabel],
                      subscore: [subQuestion.subscore], gridLabel: [subQuestion.gridLabel],
                      subAnswerTypes: [subQuestion.subAnswerTypes],
                      isTypeText: [subQuestion.isTypeText],
                      isTypeNumericText:[subQuestion.isTypeNumericText],
                      isUploadText: [subQuestion.isUploadText],
                      ansValue: [subQuestion.subQuestion],
                      isDisabled:[subQuestion?.isDisabled || false],
                      assessorOptionType:[question.assessorOptionType || ''],
                      assessorOption: [subQuestion.assessorOption || []],
                      assessorGuidence:[subQuestion.assessorGuidence || ''],
                      // Grid formulas — iske bina edit pe kholte hi saved formulas
                      // form se gir jaate the aur popup khali khulta tha.
                      gridFormulas: [subQuestion.gridFormulas || []],
                      // Assessor validation ka trend rule — edit pe wapas load ho
                      trendRule: [subQuestion.trendRule || null],

                      // [i.toString()]: subQuestion.subAnswerTypes == 'Grid' ? this._formBuilder.array(
                      //   subQuestion[i.toString()].map((row: any) => this._formBuilder.control({
                      //     ...row  // Assuming each row is an object with properties like '00', '01', etc.
                      //   }))
                      // ) : null
                      [i.toString()]: subQuestion.subAnswerTypes === 'Grid' && subQuestion[i.toString()]?.length > 0
                       ? this._formBuilder.array(
                       subQuestion[i.toString()].map((row: any) => this._formBuilder.control({
                       ...row  // Assuming each row is an object with properties like '00', '01', etc.
                      }))
                    )
                  : null
                    })) : [],

                  )
                }))
              )
            });
            this.devloperform.get('type')?.disable();
            this.devloperform.get('assignmentYear')?.disable();
            console.log('--------------------------------',this.devloperform.value);
          }
        }
      },
      error: (err: any) => {
        // console.log(err);
      }
    });
  }


  getIsDisabled(i,j): boolean {
    // return this.subanswar(i, j).at(k)?.get('isDisabled')?.value
    // console.log(this.subanswar(i).at(j).get('isDisabled')?.value);
   return this.subanswar(i).at(j).get('isDisabled')?.value || false;
  }

  // ===========================================================================
  // GRID FORMULA
  //
  // Admin kisi grid cell ki value doosre cells se nikalwa sakta hai —
  // jaise R4C4 = R1C1 + R2C4. Wo cell applicant ke liye disabled ho jaata hai.
  //
  // Ye scoring se ALAG hai: ye grid me dikhne wali VALUE banata hai, marks nahi.
  // Engine `src/app/shared/scoring/grid-formula.js` me hai — backend bhi save pe
  // wahi chalata hai, taaki browser se aayi value pe bharosa na karna pade.
  // ===========================================================================

  /**
   * Grid ke rows ({val,type,isCalc} cells) form se nikaalta hai.
   *
   * Grid data sub-answer ke andar uske APNE index waale key pe rehta hai —
   * `subanswar[j][j]`. `changeGridValue()` wahin likhta hai (seedha `.value` pe,
   * FormControl banaye bina), isliye `get(j)` se nahi milta. Edit mode me kabhi
   * FormArray bhi hota hai, to dono raste dekh lete hain.
   */
  private gridValueOf(i: number, j: number): any[] {
    const sub: any = this.subanswar(i).at(j);
    if (!sub) return [];

    const raw = sub.value ? sub.value[j] : null;
    if (Array.isArray(raw) && raw.length) return raw;

    const arr = sub.get(j.toString()) as FormArray;
    if (arr && arr.controls?.length) return arr.controls.map((c: any) => c.value);

    return [];
  }

  private formulasOf(i: number, j: number): any[] {
    return this.subanswar(i).at(j).get('gridFormulas')?.value || [];
  }

  /**
   * Doosre questions jinke numeric sub-answer me formula ka nateeja bheja ja
   * sakta hai (cross-question target).
   *
   * Sirf `isTypeNumericText` wale sub-answers liye jaate hain — text field me
   * calculated number bhejne ka matlab nahi banta. Khud ye question chhod diya
   * jaata hai.
   */
  crossQuestionTargets: { questionId: string; optionIndex: number; subIndex: number; label: string }[] = [];

  /** Doosre questions ke grids — trend rule ka denominator inme se aata hai. */
  gridSources: any[] = [];

  /** Kitne questions padhe gaye — popup me diagnose karne ke liye. */
  questionsScanned = -1;          // -1 = abhi list aayi hi nahi
  questionsLoadError = '';

  loadCrossQuestionTargets(): void {
    this.apiService.get('getAllQuestionnries').subscribe({
      next: (resp: any) => {
        const list = resp?.data || [];
        const out: any[] = [];
        const clean = (s: any) => String(s || '')
          .replace(/<[^>]*>/g, ' ').replace(/&nbsp;|&#160;/g, ' ').replace(/\s+/g, ' ').trim();

        list.forEach((q: any) => {
          if (String(q._id) === String(this.question_id)) return;   // khud ko nahi
          (q.answer || []).forEach((opt: any, oi: number) => {
            (opt.subanswar || []).forEach((s: any, si: number) => {
              const isNum = s?.isTypeNumericText === true || s?.isTypeNumericText === 'true';
              if (!isNum) return;
              out.push({
                questionId: String(q._id),
                optionIndex: oi,
                subIndex: si,
                label: clean(q.question).slice(0, 46) + '  →  ' + (clean(s.subAnswerLabel) || `sub${si}`).slice(0, 40),
              });
            });
          });
        });
        this.crossQuestionTargets = out;
        this.gridSources = this.buildGridSources(list, clean);
        // Popup ko batane ke liye ki list aayi bhi thi ya nahi — warna
        // "koi grid nahi mila" do bilkul alag wajah se dikh sakta hai.
        this.questionsScanned = list.length;
        this.questionsLoadError = '';
      },
      error: (e: any) => {
        this.crossQuestionTargets = [];
        this.gridSources = [];
        this.questionsScanned = 0;
        this.questionsLoadError = e?.message || 'Questions list load nahi hui';
      },
    });
  }

  /**
   * Header dekh kar tay karo ki kaunse columns SAAL ke hain.
   *
   * "FY 2021", "2022-23", "Year 3" — sab chalega. Agar ek bhi na mile to
   * column 0 (jo aksar row ka naam hota hai) chhodkar baaki sab maan lete hain,
   * kyunki galat andaza lagane se behtar hai admin ko khud tick karne dena.
   */
  static guessYearCols(colIdx: number[], header: (c: number) => string): number[] {
    const looksLikeYear = (s: string) => /(^|\D)(19|20)\d{2}(\D|$)/.test(s) || /\bFY\b|\byear\b/i.test(s);
    const hit = colIdx.filter((c) => c > 0 && looksLikeYear(header(c) || ''));
    return hit.length >= 2 ? hit : colIdx.filter((c) => c > 0);
  }

  /**
   * Doosre questions ke GRIDS — trend rule ka denominator inme se aata hai.
   *
   * Denominator lagbhag hamesha revenue / production hota hai, aur wo General
   * category ke AAKHRI question me rehta hai. Isliye General ke questions upar
   * rakhte hain, aur unme bhi aakhri wala sabse upar — taaki popup khulte hi
   * sahi cheez pehle se chuni hui mile aur admin ko dhoondhna na pade.
   */
  private buildGridSources(list: any[], clean: (s: any) => string): any[] {
    const out: any[] = [];

    list.forEach((q: any) => {
      if (String(q._id) === String(this.question_id)) return;      // khud ko nahi
      (q.answer || []).forEach((opt: any, oi: number) => {
        (opt.subanswar || []).forEach((s: any, si: number) => {
          if (String(s?.subAnswerTypes || '') !== 'Grid') return;

          // Master question me grid rows sub-answer ke apne index pe rehti hain.
          const rows = Array.isArray(s[String(si)]) ? s[String(si)]
            : (Array.isArray(s?.grid?.gridValue) ? s.grid.gridValue : []);
          if (!rows.length) return;

          const cellAt = (r: number, c: number) => {
            const cell = rows[r]?.[String(r) + String(c)];
            if (cell === undefined || cell === null) return '';
            const v = typeof cell === 'object' ? cell.val : cell;
            return v === undefined || v === null ? '' : String(v);
          };
          const colCount = Object.keys(rows[0] || {})
            .filter((k) => k.indexOf('0') === 0).length;

          const rowIdx = rows.map((_: any, i: number) => i);
          const colIdx = Array.from({ length: colCount }, (_, i) => i);

          out.push({
            key: String(q._id) + ':' + oi + ':' + si,
            questionId: String(q._id),
            optionIndex: oi,
            subIndex: si,
            category: String(q.category || ''),
            order: Number(q.questionOrderNo || q.position || 0),
            label: (String(q.category || '?') + ' · ' + clean(q.question)).slice(0, 88),
            grid: rows,
            rowIdx,
            colIdx,
            rows: rowIdx.map((r: number) => cellAt(r, 0) || `Row ${r + 1}`),
            colLabels: colIdx.map((c: number) => cellAt(0, c) || `Col ${c + 1}`),
            // Kaunse columns SAAL ke hain — sirf "column 0 chhod do" kaafi nahi.
            // Asli data me revenue wale grid ke columns aise hain:
            //   "Information" | "Unit" | "FY 2021" | "FY 2022" | "FY 2023"
            // yaani column 1 "Unit" hai, saal nahi. Isliye header dekh kar
            // chunte hain, aur kuch na mile tabhi "0 ke baad sab" pe girte hain.
            yearCols: TestComponent.guessYearCols(colIdx, (c: number) => cellAt(0, c)),
          });
        });
      });
    });

    // General pehle, aur General me aakhri question sabse upar.
    return out.sort((a, b) => {
      const ag = a.category === 'General' ? 0 : 1;
      const bg = b.category === 'General' ? 0 : 1;
      if (ag !== bg) return ag - bg;
      if (ag === 0) return b.order - a.order;          // General me ulta — aakhri pehle
      return a.order - b.order;
    });
  }

  /**
   * Us option ke saare sub-answers jo formula me VALUE de sakte hain.
   *
   * Grid khud chhod diya jaata hai — wo target hai, input nahi. Bache hue
   * checkbox/text/number sub-answers wo hain jinpe click karne se input khulta
   * hai (jaise "Consent to operate (KL)"), aur unki value grid ke calculation
   * me lag sakti hai.
   *
   * `index` wahi hai jo `subanswar` array me hai — engine `{sub:{index}}` se
   * usi position se value padhta hai, isliye ye position badalni nahi chahiye.
   */
  private subAnswerInputs(i: number, gridIndex: number): { index: number; label: string; type: string }[] {
    const subs = this.subanswar(i);
    if (!subs) return [];
    const out: { index: number; label: string; type: string }[] = [];
    subs.controls.forEach((c: any, idx: number) => {
      if (idx === gridIndex) return;                        // grid khud nahi
      const type = c.get('subAnswerTypes')?.value || '';
      if (type === 'Grid') return;                          // doosra grid bhi nahi
      const label = String(c.get('subAnswerLabel')?.value || '')
        .replace(/<[^>]*>/g, ' ')
        .replace(/&nbsp;|&#160;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      out.push({ index: idx, label: label || `Sub-answer ${idx + 1}`, type });
    });
    return out;
  }

  formulaCount(i: number, j: number): number {
    return this.formulasOf(i, j).length;
  }

  formulaTexts(i: number, j: number): string[] {
    return this.formulasOf(i, j).map((f: any) => gridFormulaToText(f));
  }

  openGridFormula(i: number, j: number) {
    const gridValue = this.gridValueOf(i, j);
    if (!gridValue.length) {
      this.alertService.errorSnackBar('Please add grid rows and columns first', 'Error', 'top-right');
      return;
    }

    const ref = this.dialog.open(GridFormulaDialogComponent, {
      width: '1100px',
      maxWidth: '95vw',
      data: {
        gridValue,
        formulas: this.formulasOf(i, j),
        // Grid ke bahar wale inputs bhi formula me use ho sakte hain — jaise
        // "Consent to operate (KL)" checkbox ka number input. Grid khud is
        // list me nahi aata (wo target hai, input nahi).
        subs: this.subAnswerInputs(i, j),
        // Doosre questions jinke numeric field me nateeja bheja ja sakta hai
        crossTargets: this.crossQuestionTargets,
        // Assessor validation (trend) ke liye: denominator kis question ke grid
        // se aayega, aur rule kaunse assessor options me se chun sakta hai.
        gridSources: this.gridSources,
        assessorOptions: this.assessorOptionLabels(i, j),
        trendRule: this.trendRuleOf(i, j),
        questionsScanned: this.questionsScanned,
        questionsLoadError: this.questionsLoadError,
      },
    });

    ref.afterClosed().subscribe((result: any) => {
      if (!result) return;   // cancel
      const sub = this.subanswar(i).at(j) as FormGroup;
      if (sub.get('gridFormulas')) sub.get('gridFormulas')?.patchValue(result.formulas);
      else sub.addControl('gridFormulas', new FormControl(result.formulas));

      // Trend rule — question ke sub-answer pe hi rehta hai, formulas ke saath.
      if (sub.get('trendRule')) sub.get('trendRule')?.patchValue(result.trendRule || null);
      else sub.addControl('trendRule', new FormControl(result.trendRule || null));

      this.cd.detectChanges();
    });
  }

  /** Pehle se saved trend rule (edit karte waqt popup me bhara hua aaye). */
  trendRuleOf(i: number, j: number): any {
    const sub = this.subanswar(i).at(j) as FormGroup;
    return sub?.get('trendRule')?.value || null;
  }

  /**
   * Is sub-answer ke assessor options ke labels — band inhi me se ek chunta hai.
   * Option-level aur sub-answer-level, dono jagah dekhte hain.
   */
  assessorOptionLabels(i: number, j: number): string[] {
    const out: string[] = [];
    const push = (list: any) => (list || []).forEach((o: any) => {
      const t = String(o?.option || '').trim();
      if (t && out.indexOf(t) < 0) out.push(t);
    });
    const sub = this.subanswar(i).at(j) as FormGroup;
    push(sub?.get('assessorOption')?.value);
    push((this.skills().at(i) as FormGroup)?.get('assessorOption')?.value);
    return out;
  }

  getGridIndex(i, j): any {
    if (this.question_id) {
      return { gridIndex: j, formIndex: i, appliData: this.gridArray(i, j), role: 'admin', isDisabled:this.getIsDisabled(i,j) };
    } else {
      return { gridIndex: j, formIndex: i };
    }
  }

  ngOnInit(): void {
    this.getAllData();
    // Formula popup me "nateeja doosre question me bhejo" ki list ke liye
    this.loadCrossQuestionTargets();
    setTimeout(()=>{
      this.cd.detectChanges();
      console.log("Done!!!!!!!!!!!!!!!!!!!!!!!!!!");
    },3000);
    this.devloperform.valueChanges.subscribe({
      next: (resp: any) => {
        // console.log(resp);
      }
    })
  }
  getCurrentDate(): string {
    const currentDate = new Date();
    return formatDate(currentDate, 'yyyy-MM-dd', 'en');
  }
  changeGridValue(data: any): void {
    console.log("OK",data);
  
    const formArray = this.skills().at(data.formIndex).get('subanswar') as FormArray;
    formArray.value[data.gridIndex][data.gridIndex] = data.data;
    
  //  (this.skills().at(data.formIndex).get('subanswar') as FormArray).at(data.gridIndex)?.get('isDisabled')?.patchValue(data?.isDisabled);
   console.log("Patched Value:  ",formArray.value);
  //  console.log((this.skills().at(data.formIndex).get('subanswar') as FormArray).at(data.gridIndex).get('isDisabled'));
  }

  htmlContent = '';
  config: AngularEditorConfig = {
    editable: true,
    spellcheck: true,
    height: '10rem',
    minHeight: '5rem',
    placeholder: 'Enter text here...',
    translate: 'no',
    defaultParagraphSeparator: 'p',
    defaultFontName: 'Arial',
    toolbarHiddenButtons: [],
    customClasses: [
      {
        name: "quote",
        class: "quote",
      },
      {
        name: 'redText',
        class: 'redText'
      },
      {
        name: "titleText",
        class: "titleText",
        tag: "h1",
      },
    ]
  };

  answartype: any[] = [
    { id: 1, name: 'RadioButton' },
    { id: 2, name: 'CheckBox' },
    { id: 3, name: 'Text' },
    { id: 4, name: 'Upload' },
    { id: 5, name: 'Grid' },
  ];

  categoryList: any[] = [];

  questionOrderNumber = [
    { id: 1, name: 1 },
    { id: 2, name: 2 },
    { id: 3, name: 3 },
    { id: 4, name: 4 },
    { id: 5, name: 5 },
    { id: 6, name: 6 },
    { id: 7, name: 7 },
    { id: 8, name: 8 },
    { id: 9, name: 9 },
    { id: 10, name: 10 },
    { id: 11, name: 11 },
    { id: 12, name: 12 },
    { id: 13, name: 13 },
    { id: 14, name: 14 },
    { id: 15, name: 15 },
    { id: 16, name: 16 },
    { id: 17, name: 17 },
    { id: 18, name: 18 },
    { id: 19, name: 19 },
    { id: 20, name: 20 },
    { id: 21, name: 21 },
    { id: 22, name: 22 },
    { id: 23, name: 23 },
    { id: 24, name: 24 },
    { id: 25, name: 25 },
    { id: 26, name: 26 },
    { id: 27, name: 27 },
    { id: 28, name: 28 },
    { id: 29, name: 29 },
    { id: 30, name: 30 },
  ];

  cars = [
    { id: 1, name: 'OEM',value: 'OEM' },
    { id: 2, name: 'Upstream',value: 'Upstream Manufacturing' },
    {id:3,name:'Upstream-Service',value:'Upstream Services' },
    { id: 4, name: 'DownStream',value: 'DownStream' },
    // {id:4,name:'Manufacturing',value:'Manufacturing' },

  ];

  standardAlign: any[] = [];

  updateMarkStatus(e: any) {
    if (e.checked == false) {
      this.devloperform.get('maxMark').patchValue('');
    }

  }

  getAllData(): void {
    this.loaderService.showLoading();
    let brsrMaster = this.apiService.get('get-brsr-master');
    let categoryMaster = this.apiService.get('get-category-master');
    forkJoin([brsrMaster, categoryMaster]).subscribe({
      next: (resp: any) => {
        this.loaderService.hideLoading();
        this.standardAlign = resp[0]['data'];
        console.log(resp[0]['data']);
        this.cd.detectChanges();
        this.categoryList = resp[1]['data'];
        this.isAlignmentLoaded = true;
      },
      error: (err: any) => {
        this.loaderService.hideLoading();
      }
    });
  }

  selectAnswerType(e: any): void {
    // console.log(e.name);
    this.answerType = e.name;
    if (this.innerFormDataHolder['answer'] !== undefined) {
      this.innerFormDataHolder = {};
    }
  }

  submitForm(): void {
    console.log(this.devloperform.value);
    console.log(this.devloperform.value?.answer[0]?.subanswar);
    if (this.devloperform.valid) {
      if(this.checkValidation()){
      this.loaderService.showLoading();
      this.apiService.post('createQuestionnaire', this.devloperform.getRawValue()).subscribe({
        next: (resp: any) => {
          this.loaderService.hideLoading();
          if (resp['status'] == 'success') {
            this.alertService.successSnackBar(resp['message'], 'OK', 'top-right');
            this.routes.navigate(['/dashboard/questionnaire-list'], {
              queryParams: { fy: this.selectedYear, type: this.selectedType }
            });
          } else {
            this.alertService.errorSnackBar("Please Check...", 'Error', 'top-right');
          }
        },
        error: (err: any) => {
          this.loaderService.hideLoading();
          this.alertService.errorSnackBar(err.error.messgae, 'Error', 'top-right');
        }
      });
    }
    } else {
      this.alertService.errorSnackBar("Form is not valid. Please check the fields and try again.", 'OK', 'top-right');
    }
  }

  updateForm(): void {

    if (this.devloperform.valid) {
      // if(this.checkValidation()){
        this.loaderService.showLoading();
        this.apiService.update('updateQuestionnaire', this.devloperform.getRawValue(), this.question_id).subscribe({
          next: (resp: any) => {
            this.loaderService.hideLoading();
            if (resp['status'] == 'success') {
              this.alertService.successSnackBar(resp['message'], 'OK', 'top-right');
              this.routes.navigate(['/dashboard/questionnaire-list'], {
                queryParams: { fy: this.selectedYear, type: this.selectedType }
              });
            } else {
              this.alertService.errorSnackBar("Please Check...", 'Error', 'top-right');
            }
          },
          error: (err: any) => {
            this.loaderService.hideLoading();
            this.alertService.errorSnackBar(err.error.messgae, 'Error', 'top-right');
          }
        });
      // }
    } else {
      this.alertService.errorSnackBar("Form is not valid. Please check the fields and try again.", 'OK', 'top-right');
    }
  }

  // toggleDisabled() {
  //   const car: any = this.cars[1];
  //   car.disabled = !car.disabled;
  // }

  skills(): FormArray {
    return this.devloperform.get("answer") as FormArray;
  }

  subanswar(empIndex: number): FormArray {
    return this.skills().at(empIndex).get("subanswar") as FormArray;
  }

  addQuestion() {
    const skill = this.fb.group({
      answerLabel: new FormControl(''),
      sortOrder: new FormControl(''),
      score: new FormControl(''),
      ansValue: new FormControl(null),
      assessorOption:new FormControl([]),
      assessorOptionType:new FormControl(''),
      assessorGuidence:new FormControl(''),
      subAnswer: new FormControl('no', Validators.required),
      subAnswerType: [''],
      subanswar: this.fb.array([]),
      formGrid: this.fb.array([])
    });
    this.skills().push(skill);
  }

  addsubanswar(): FormGroup {
    if (this.answerType == 'CheckBox') {
      return this.fb.group({
        subAnswerLabel: new FormControl(''),
        subscore: new FormControl(''),
        gridLabel: new FormControl(''),
        ansValue: new FormControl(''),
        isTypeText: new FormControl(''),
        isTypeNumericText:new FormControl(''),
        isUploadText: new FormControl(''),
        subAnswerTypes: new FormControl('CheckBox'),
        assessorOption: new FormControl([]),
        assessorOptionType:new FormControl(''),
      assessorGuidence:new FormControl(''),

      });
    } else if (this.answerType == 'Grid') {
      return this.fb.group({
        // '0': new FormControl(''),
        // subAnswerLabel: new FormControl(''),
        //         gridLabel: new FormControl(''),


        subscore: new FormControl(''),
        ansValue: new FormControl(''),
        isTypeText: new FormControl(''),
        isTypeNumericText:new FormControl(''),
        isUploadText: new FormControl(''),
        subAnswerTypes: new FormControl('Grid'),
        assessorOption: new FormControl([]),
        assessorOptionType:new FormControl(''),
        assessorGuidence:new FormControl(''),
        isDisabled: new FormControl(false),

      });
    } else if (this.answerType == 'Text') {
      return this.fb.group({
        subAnswerLabel: new FormControl(''),
        subscore: new FormControl(''),
        gridLabel: new FormControl(''),
        ansValue: new FormControl(''),
        isTypeText: new FormControl(''),
        isTypeNumericText:new FormControl(''),
        isUploadText: new FormControl(''),
        subAnswerTypes: new FormControl('Text'),
        assessorOption: new FormControl([]),
        assessorOptionType:new FormControl(''),
      assessorGuidence:new FormControl('')
      });
    } else if (this.answerType == 'RadioButton') {
      return this.fb.group({
        subAnswerLabel: new FormControl(''),
        subscore: new FormControl(''),
        gridLabel: new FormControl(''),
        ansValue: new FormControl(''),
        isTypeText: new FormControl(''),
        isTypeNumericText:new FormControl(''),
        isUploadText: new FormControl(''),
        // radioAns: new FormControl(''),
        subAnswerTypes: new FormControl('RadioButton'),
        assessorOption: new FormControl([]),
        assessorOptionType:new FormControl(''),
        assessorGuidence:new FormControl('')
      });
    } else if (this.answerType == 'Upload') {
      return this.fb.group({
        ansValue: new FormControl(''),
        subscore: new FormControl(''),
        subAnswerLabel: new FormControl(''),
        isTypeText: new FormControl(''),
        isTypeNumericText:new FormControl(''),
        isUploadText: new FormControl(''),
        subAnswerTypes: new FormControl('Upload'),
        assessorOption: new FormControl([]),
        assessorOptionType:new FormControl(''),
        assessorGuidence:new FormControl('')
      });
    }
    else {
      return this.fb.group({});
    }
  }

  addSubAnswer(empIndex: number) {
    this.subanswar(empIndex).push(this.addsubanswar());
  }


  fieldremove(index: any) {
    this.skills().removeAt(index);
  }

  removeSubSkill(empIndex: number, skillIndex: number) {
    this.subanswar(empIndex).removeAt(skillIndex);
  }

  //Grid Form Code

  addSubGrid(empIndex: number) {
    this.formGrid(empIndex).push(this.addsubanswarGrid());
  }

  addsubanswarGrid(): FormGroup {
    return this.fb.group(
      new FormGroup({ '0': new FormControl('') })
    );
  }


  formGrid(empIndex: number): FormArray {
    return this.skills().at(empIndex).get("formGrid") as FormArray;
  }


  addRow(empIndex: number) {
    const rowIndex = this.formGrid(empIndex).length;
    const newRow = new FormGroup({});
    this.displayedColumns.forEach((col) => {
      const newKey = `${rowIndex}${col}`;
      newRow.addControl(newKey, new FormControl(''));
    });
    this.formGrid(empIndex).push(newRow);
    this.table.renderRows();
  }


  getControl(empIndex: number, rowIndex: number, controlName: string): FormControl {
    return (this.formGrid(empIndex).at(rowIndex) as FormGroup).get(controlName) as FormControl;
  }

  addColumn(empIndex: number) {
    const colIndex = this.displayedColumns.length;
    const newColHeader = `${colIndex}`;
    this.displayedColumns.push(newColHeader);
    this.columnsToDisplay = [...this.displayedColumns];
    (this.formGrid(empIndex) as any).controls.forEach((row: FormGroup, rowIndex: any) => {
      const newKey = `${rowIndex}${colIndex}`;
      row.addControl(newKey, new FormControl(''));
    });
  }

  

  openAssessorOptions(i: number, skill: any, subIndex?: number) {
    let answer = this.skills().at(i) as FormGroup;
    let formArray = answer.get('subanswar') as FormArray;
    
    // Log initial form state for debugging
    console.log('Initial answer form:', answer.value);
    console.log('skill.value:', skill.value);

  
    const dialog = this.dialog.open(AssessordialogComponent, {
      data: skill.value
    });
  
    dialog.afterClosed().subscribe(result => {
      console.log(result, 'result');
  
      if (result && result.assessorOption) {
        console.log(subIndex);
        if (subIndex !== undefined) {
          const subFormGroup = formArray.at(subIndex) as FormGroup;
          answer.get('assessorOptionType')?.patchValue(result?.assessorOptionType,{onlySelf: true});
          if (result.assessorOption) {
            skill.get('assessorOption')?.patchValue(result?.assessorOption, { onlySelf: true});
            skill.get('assessorOptionType')?.patchValue(result?.assessorOptionType,{onlySelf: true});
            skill.get('assessorGuidence')?.patchValue(result?.assessorGuidence);
          }
  
          console.log('Inner FormGroup after patch:', subFormGroup.value);
        } else {
          if (result.assessorOption) {
            console.log('result.assessorOption:', result);
            answer.get('assessorOption')?.patchValue(result.assessorOption, { onlySelf: true });
            answer.get('assessorOptionType')?.patchValue(result?.assessorOptionType,{onlySelf: true});
            answer.get('assessorGuidence')?.patchValue(result?.assessorGuidence);
          }
        }
        answer.updateValueAndValidity({ onlySelf: false, emitEvent: true });
      }
      console.log('Updated answer:', answer);
    });
  }
  
  checkValidation(): boolean {
    console.log(this.devloperform.value?.answer);
    let formData: any = this.devloperform.value;
    let isValid = true;
  
    if (formData?.answer?.length > 0) {
      for (let i = 0; i < formData.answer.length; i++) {
        const element = formData.answer[i];
        const answerScoreRaw = element?.score;
        const answerScore = Number(answerScoreRaw);
  
        // 🔍 Check for missing/invalid score
        if (
          answerScoreRaw === null ||
          answerScoreRaw === undefined ||
          answerScoreRaw === '' ||
          isNaN(answerScore)
        ) {
          console.log(isNaN(answerScore));
          console.log(answerScoreRaw);
          isValid = false;
          this.alertService.errorSnackBar(
            `❌ Missing or invalid score at option[${i + 1}]`,
            'OK',
            'top-right'
          );
          console.warn(`❌ Invalid score at option[${i + 1}]`);
          break; // ⛔ Break loop immediately
        }
  
        let subTotal = 0;
  
        if (element?.subanswar?.length > 0) {
          element.subanswar.forEach((subElement: any) => {
            const subScore = Number(subElement?.subscore) || 0;
            subTotal += subScore;
          });
  
          if (answerScore !== subTotal) {
            isValid = false;
            console.warn(`❌ Mismatch at option[${i + 1}]: score (${answerScore}) ≠ sum of suboption (${subTotal})`);
            this.alertService.errorSnackBar(
              `❌ Mismatch at option[${i + 1}]: score (${answerScore}) ≠ sum of suboption (${subTotal})`,
              'OK',
              'top-right'
            );
            break; // ⛔ Break loop on mismatch too
          } else {
            console.log(`✅ Valid answer[${i + 1}]: score matches subanswar total.`);
          }
        }
      }
    }
  
    if (!isValid) {
      this.devloperform.setErrors({ scoreMismatch: true });
      console.error("Form is invalid due to score mismatch or missing score.");
    } else {
      this.devloperform.setErrors(null);
      console.log("Form is valid.");
    }
  
    return isValid;
  }
  

  

}