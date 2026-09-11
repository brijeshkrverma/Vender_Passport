
import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, NgZone, OnDestroy, OnInit } from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { MatStepper, MatStepperModule } from '@angular/material/stepper';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { combineLatest, debounceTime, Observable, of, Subject, takeUntil } from 'rxjs';
import { MaxWordLengthDirective } from '../../../directive/max-word-length.directive';
import { NumbersOnlyDirective } from '../../../directive/numbers-only.directive';
import { AlertService } from '../../../services/alert.service';
import { ApiService } from '../../../services/api.service';
import { ImageUploaderService } from '../../../services/utility/image-uploader.service';
import { LoaderService } from '../../../services/utility/loader.service';
import { StorageService } from '../../../services/utility/storage.service';
import { UtilityService } from '../../../services/utility/utility.service';
import { DocumentListComponent } from '../../masters/document-master/document-list/document-list.component';
import { WorkforceoardComponent } from '../../workforceoard/workforceoard.component';
import { FormGridComponent } from '../add-questionnaire/form-type-components/form-grid/form-grid.component';
import { ScopeEmissionsComponent } from '../scope-emissions/scope-emissions.component';
import { TooltipDialog } from '../tooltip-dialog/tooltip-dialog.component';
import { DialogOverviewExampleDialog } from './dialog/dialog-overview-example.component';

import { animate, state, style, transition, trigger } from '@angular/animations';
import { MatExpansionModule } from '@angular/material/expansion';
import { SkeletonDirective } from '../../../directive/skeleton.directive';
import { ExtractTextPipe } from '../../../extract-text.pipe';
import { Events } from '../../../services/utility/events';
import { ScientificCalculatorComponent } from '../scientific-calculator/scientific-calculator.component';

import { MutationObserverDirective } from '../../../directive/mutation-observer.directive';
import { FindOnePipe } from '../../../pipes/find-one.pipe';
import { AssessorUploadDocumentComponent } from '../../assessor/assessor-upload-document/assessor-upload-document.component';

// Admin ka banaya hua trend rule chalane ke liye — engine ki wahi ek copy jo
// backend save pe validate karne ke liye use karta hai.
import { evaluateTrendRule } from '../../../../../Backend/scoring/trend-rule';

@Component({
  selector: 'app-questionnaire-form',
  standalone: true,
  imports: [MatStepperModule,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatRadioModule,
    SkeletonDirective,
    ScientificCalculatorComponent,
    MatCheckboxModule,
    FormGridComponent,
    MatTableModule,
    MutationObserverDirective,
    NumbersOnlyDirective,
    MaxWordLengthDirective,
    WorkforceoardComponent,
    MatCardModule,
    MatTooltipModule,
    MatIconModule,
    ExtractTextPipe,
    MatChipsModule,
    DialogOverviewExampleDialog,
    ScopeEmissionsComponent,
    MatExpansionModule,
    FindOnePipe,
    RouterModule,
  ],
  templateUrl: './questionnaire-form.component.html',
  styleUrl: './questionnaire-form.component.css',
  // changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [DialogOverviewExampleDialog, { provide: MAT_DIALOG_DATA, useValue: {} },
    { provide: MatDialogRef, useValue: {} }],
  animations: [
    trigger('fadeInOut', [
      state('void', style({ opacity: 0 })), // When the element is not in the DOM
      state('*', style({ opacity: 1 })),    // When the element is in the DOM
      transition('void <=> *', [
        animate('0.8s ease-in-out')         // Animation duration and easing
      ]),
    ])
  ]

})


export class QuestionnaireFormComponent implements OnInit, OnDestroy {
  panelOpenState: boolean = false;
  animal: string;
  name: string;
  questionLength: number = 0;
  financialYear:string= new Date().getFullYear().toString();
  // financialYear: string = '2025';

  fyReferenceMappings: any[] = [];

  isFinalSubmitted: string = 'draft';
  userQuestionnaire: any = {};

  applicantQuestionForm: FormGroup;
  questionnarie: any[] = [];
  categoryCount: any[] = [];
  questionHolder: any = {};
  userMeta: any = {};
  selectedCategotyData: string = 'Workforce';
  displayedColumns: string[] = ['0', '1', '2', '3'];
  columnsToDisplay: string[] = this.displayedColumns.slice();
  dataIndexes: number[] = [];
  attemptQuestionDetails: any[] = [];
  assessorId: string = '';
  applicantId: string = '';
  type: any[] = [];
  // selectedData: any[] = [];
  // adminSelectedData :any[] = [];
  allBrsrData: any[] = [];
  allCategoryCount: number = 0;
  savedQuestionnaireLength: number = 0;
  finalSubmitStatus: boolean = false;
  statusList: any = {};
  changeFormValue: Observable<any> = of('');
  isToggleCalc: boolean = false;
  isView: boolean = false;
  isAdmin: boolean = false;
  private destroy$ = new Subject<void>();
  categoryData: any[] = [
    { id: 'pills-general-tab', category: 'General' },
    { id: 'pills-decarbonization-tab', category: 'Decarbonization' },
    { id: 'pills-circularty-tab', category: 'Circularity' },
    { id: 'pills-health-tab', category: 'Health & Safety' },
    { id: 'pills-human-tab', category: 'Human Rights' },
    { id: 'pills-automobile-tab', category: 'Automobile Sector' },
    { id: 'pills-workforce-tab', category: 'Workforce' }
  ];

  constructor(private _formBuilder: FormBuilder,
    private apiService: ApiService,
    public loader: LoaderService,
    private alertService: AlertService,
    private storageService: StorageService,
    public utilityService: UtilityService,
    private router: Router,
    public dialog: MatDialog,
    // private staticQuestionService:StaticQuestionService,submitted
    private actRoute: ActivatedRoute,
    private imageUploaderService: ImageUploaderService,
    private cd: ChangeDetectorRef,
    private event: Events,
    private ngZone: NgZone
  ) {
    this.actRoute.queryParams.subscribe(params => {
      this.applicantId = params['applicantId'];
      this.assessorId = params['assessorId'];

      this.isView = params['view'] === 'true';  // Ensures correct Boolean conversion
      this.isAdmin = params['isAdmin'] === 'true';

      console.log(params['view'], this.isView);
    });

    this.applicantQuestionForm = this._formBuilder.group({
      answers: this._formBuilder.array([]),
      additionalDesc: ['']
    });
  }




  // allChangeDetectionCompleted(){
  //   // Create an Observable from NgZone.onStable
  //   this.loader.showLoading();
  //   const zoneStable$ = fromEventPattern(
  //     (handler) => this.ngZone.onStable.subscribe(handler),
  //     (handler) => this.ngZone.onStable.unsubscribe()
  //   );

  //   // Use switchMap and debounceTime to delay execution
  //   zoneStable$
  //     .pipe(
  //       debounceTime(1000), // Adjust debounce delay as needed
  //       switchMap(() => {
  //         return this.onChangeDetectionComplete();
  //       }),
  //       takeUntil(this.destroy$) // Clean up on destroy
  //     )
  //     .subscribe(() => {
  //       // console.log('Custom lifecycle logic executed!');
  //     });


  // }

  // private onChangeDetectionComplete() {
  //   return new Promise<void>((resolve) => {
  //   // this.loader.hideLoading();
  //     // console.log('All change detection cycles are complete.');
  //     resolve();
  //   });
  // }

  ngOnDestroy() {
    // Cleanup subscriptions
    // this.destroy$.next();
    // this.destroy$.complete();
  }

  ngOnInit(): void {
    this.storageService.getStorage('EcoUser').subscribe({
      next: (user: any) => {
        if (user !== null) {
          this.userMeta = user;
        }
      }
    });

    this.storageService.getStorage('financialYear').subscribe({
      next: (year: any) => {
        console.log(year);
        if (year) {
          this.financialYear = year;
        }
        this.loadFyReference(this.financialYear);
      }
    })

    // this.allChangeDetectionCompleted();


    this.getAllBRSRMasterData();
    this.getApplicantData();
    this.event.question11.subscribe({
      next: (resp: any) => {
        // console.log(resp,"  :resp");
        let indexOfQuestionDecarbonisetion11 = (this.applicantQuestionForm.get('answers') as FormArray).value.findIndex((item: any) => item.questionId == '66cd58332702eefa574c42c9');
        if (indexOfQuestionDecarbonisetion11 !== (-1)) {
          let answer = (this.applicantQuestionForm.get('answers') as FormArray).at(indexOfQuestionDecarbonisetion11).get('answer') as FormArray;
          answer.at(0).get('ansValue').patchValue(answer.at(0).get('answerLabel').value);
          (answer.at(0).get('subanswar') as FormArray).at(0).get('ansValue').patchValue(resp);
        }
      }
    });






  }

  toggleCalc(): void {
    this.isToggleCalc = !this.isToggleCalc;
  }



  openDialog(isView: boolean): void {
    this.getDetailOfAttemptQuestions();
    let dialogRef = this.dialog.open(DialogOverviewExampleDialog, {
      width: '900px',
      data: { detail: this.attemptQuestionDetails, isView: isView ? true : false },
      enterAnimationDuration: '800ms',
      exitAnimationDuration: '1000ms',
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result?.category_name) {
        let findIndex = this.categoryData.findIndex(ind => result?.category_name == ind.category);
        let btns = document.getElementById(this.categoryData[findIndex].id);
        btns.click();
        setTimeout(() => {
          this.getAllUpdatedQuestions();
        }, 2000);
      }
      this.animal = result;
    });
  }



  get answers(): FormArray {
    return this.applicantQuestionForm.get('answers') as FormArray;
  }


  answer(i: number): FormArray {
    return (this.applicantQuestionForm.get('answers') as FormArray).at(i).get("answer") as FormArray;
  }



  subanswar(i: number, j: number): FormArray {
    return this.answer(i).at(j).get("subanswar") as FormArray;
  }

  gridArray(i: number, j: number, k: number): FormArray {
    const formArray = this.subanswar(i, j).at(k).get('grid').get('gridValue') as FormArray;
    return formArray;
  }

  /**
   * Admin ne is grid pe jo formulas lagaye the (jaise R4C4 = R1C1 + R2C4).
   *
   * Ye `app-form-grid` ko pass hote hain, jahan applicant ke type karte hi chalte
   * hain aur target cell apne aap bhar jaata hai (aur readonly ho jaata hai).
   *
   * ⚠ Bharosa iske nateeje pe nahi hai — backend save ke waqt yahi formulas
   *   dobara chalata hai, kyunki disabled field ko devtools se badla ja sakta hai.
   */
  getGridFormulas(i: number, j: number, k: number): any[] {
    const sub: any = this.subanswar(i, j)?.at(k);
    const f = sub?.get('gridFormulas')?.value ?? sub?.value?.gridFormulas;
    return Array.isArray(f) ? f : [];
  }

  /**
   * Us option ke saare sub-answers ki values.
   *
   * Formula me `{sub:{index}}` token ho sakta hai — jaise "Consent to operate (KL)"
   * checkbox ka number input, jo grid ke BAHAR hai par grid ke calculation me
   * lagta hai. Engine ko `subanswar[index]` chahiye, isliye poora array bhejte hain.
   */
  getGridSubs(i: number, j: number): any[] {
    const subs: any = this.subanswar(i, j);
    return subs?.value || [];
  }

  /**
   * Cross-question formula ka nateeja doosre question ke field me likhta hai.
   *
   * Jaise energy question ka "Renewable %" — uska nateeja
   * "type of renewable energy sources" question ke
   * "Renewable Energy % of total energy consumption" field me jaata hai.
   *
   * Aaj ye kaam `:1101` pe hardcoded hai aur question ke POSITION pe tika hai
   * (`answers.at(10)`), isliye beech me ek question add karte hi toot jaata hai.
   * Yahan target `questionId` se dhoondha jaata hai — position se nahi.
   */
  applyCrossQuestionValues(results: any[]): void {
    if (!Array.isArray(results) || !results.length) return;
    const answers = this.applicantQuestionForm.get('answers') as FormArray;
    if (!answers) return;

    results.forEach((r) => {
      const t = r?.target;
      if (!t?.questionId) return;

      // questionId se dhoondo — index se nahi
      const idx = answers.controls.findIndex(
        (a: any) => String(a.get('questionId')?.value) === String(t.questionId)
      );
      if (idx < 0) {
        console.warn('[cross-question] target question not found in form:', t.questionId);
        return;
      }

      const opts = answers.at(idx).get('answer') as FormArray;
      const opt = opts?.at(Number(t.optionIndex) || 0);
      const subs = opt?.get('subanswar') as FormArray;
      const sub = subs?.at(Number(t.subIndex));
      if (!sub) {
        console.warn('[cross-question] target sub-answer not found:', t);
        return;
      }

      const field = t.field || 'numericTypeVal';
      const ctrl = sub.get(field);
      if (!ctrl) return;

      // emitEvent: false — warna valueChanges dobara chalega aur loop ban jayega
      if (String(ctrl.value ?? '') !== String(r.value ?? '')) {
        ctrl.patchValue(r.value, { emitEvent: false });
      }

      // us option/sub ko "selected" dikhana, warna bhari hui value ignore ho jaati hai
      const optLabel = opt?.get('answerLabel')?.value;
      if (optLabel && !opt?.get('ansValue')?.value) {
        opt.get('ansValue')?.patchValue(optLabel, { emitEvent: false });
      }
      const subLabel = sub.get('subAnswerLabel')?.value;
      if (subLabel && !sub.get('ansValue')?.value) {
        sub.get('ansValue')?.patchValue(subLabel, { emitEvent: false });
      }
    });
  }

  // getIsDisabled(i,j,k): boolean {
  //   return this.subanswar(i, j).at(k)?.get('isDisabled')?.value
  // }

  getFormArrayControls(gridValue: any): AbstractControl[] {
    if (Array.isArray(gridValue)) {
      const formArray = new FormArray(gridValue.map((value) => new FormControl(value)));
      return formArray.controls;
    }
    return [];
  }


  getQuestionId(i: number): string | null {
    const formArray = this.applicantQuestionForm.get('answers') as FormArray;
    return formArray?.at(i)?.get('questionId')?.value ?? null;
  }


  changeGridValue(data: any): void {
    console.log(data);

    let gridValue = (((this.applicantQuestionForm.get('answers') as FormArray).at(data.formIndex).get('answer') as FormArray).at(data.gridIndex).get('subanswar') as FormArray).at(data.k).get('grid');
    gridValue.value['gridValue'] = data.data;

    //     gridValue?.get('isDisabled')?.patchValue(data?.isDisabled);
    //  (((this.applicantQuestionForm.get('answers') as FormArray).at(data.formIndex).get('answer') as FormArray).at(data.gridIndex).get('subanswar') as FormArray).at(data.k).get('isDisabled')?.patchValue(data?.isDisabled);
  }


  getStepControl(index: number): any {
    const controlArray = this.applicantQuestionForm.get('answers') as FormArray;
    return index >= 0 && index < controlArray.length ? { control: controlArray.at(index), length: controlArray.value.indexOf(index) } : null;
  }

  getDisplayedIndex(index: number): number {
    let displayedIndex = 0;
    for (let currentIndex = 0; currentIndex <= index; currentIndex++) {
      const category = this.answers.controls[currentIndex].get('category').value;
      if (category === 'General') {
        displayedIndex++;
      } else {
        displayedIndex - 3;
      }
    }
    return displayedIndex;
  }

  getBrsrBySA(standeredAlign: any): string[] {
    let brsrData: any[] = [];
    if (standeredAlign?.length > 0) {
      standeredAlign.forEach((item: any) => {
        let brsr = this.allBrsrData.find(o => o._id === item);
        brsrData.push(brsr?.brsrType);
      });
    }
    return brsrData;
  }

  getAllBRSRMasterData(): void {
    this.loader.showLoading();
    this.apiService.get('getAllBrsrData').subscribe({
      next: (resp: any) => {
        if (resp['status'] === 'success') {
          this.allBrsrData = resp['data'];
        }
      },
      error: (err: any) => {
        console.log(err);
      }
    });
  }


  currentYear: any = new Date().getFullYear().toString();
  loadFyReference(financialYear: string): void {
    this.fyReferenceMappings = this.defaultFyReferences();
    this.apiService.get(`get-fy-reference-mapping/${financialYear}`).subscribe({
      next: (resp: any) => {
        if (resp && resp['status'] === 'success' && resp['data']?.mappings?.length) {
          this.fyReferenceMappings = resp['data']['mappings'];
        }
      },
      error: (err: any) => {
        console.log(err);
      }
    });
  }

  defaultFyReferences(): any[] {
    const baseYear = parseInt(this.financialYear, 10) || new Date().getFullYear();
    return [
      { reference: 'FY+2', financialYear: `FY ${baseYear + 2}-${String(baseYear + 3).slice(2)}` },
      { reference: 'FY+1', financialYear: `FY ${baseYear + 1}-${String(baseYear + 2).slice(2)}` },
      { reference: 'Current FY', financialYear: `FY ${baseYear}-${String(baseYear + 1).slice(2)}` },
      { reference: 'Previous FY', financialYear: `FY ${baseYear - 1}-${String(baseYear).slice(2)}` },
      { reference: 'Previous FY-1', financialYear: `FY ${baseYear - 2}-${String(baseYear - 1).slice(2)}` },
      { reference: 'Previous FY-2', financialYear: `FY ${baseYear - 3}-${String(baseYear - 2).slice(2)}` },
    ];
  }

  getApplicantData(): void {
    this.loader.showLoading();
    let userId = this.applicantId ? this.applicantId : this.userMeta?._id;
    this.apiService.post('get-all-user', { applicant_id: userId, financialYear: this.financialYear }).subscribe({
      next: (resp: any) => {
        this.loader.hideLoading();
        if (resp['status'] === 'success') {
          if (resp['data']?.length > 0) {
            this.statusList = resp['data'][0];

            // Define a mapping for vcp_type and standAs values
            const typeMapping = {
              'Upstream-Service': 'Upstream-Service',
              'Sourcing': 'OEM',
              'Upstream': 'Upstream',
              'Downstream': 'DownStream'
            };

            // Check if vcpData is available and determine the type
            if (this.statusList?.vcpData?.vcp_type) {
              const vcpType = this.statusList.vcpData.vcp_type;
              if (typeMapping[vcpType]) {
                this.type.push(typeMapping[vcpType]);
              }
            } else {
              // If vcpData is not available, use standAs values
              const standAs = this.statusList?.standAs;
              if (typeMapping[standAs]) {
                this.type.push(typeMapping[standAs]);
              }
            }


          }
        }
      },
      error: (err: any) => {
        this.loader.hideLoading();
      },
      complete: () => {

        this.getAllUpdatedQuestions();
        this.getAllCategoryCount();
        this.getDetailOfAttemptQuestions();
        this.selectCategory('General');

        // this.updateQuestionnaireStatus();
      }
    })
  }

  trackByIndex(index: number, control: AbstractControl): number {
    return index; // or return control.value._id if each control has a unique identifier.
  }




  getDetailOfAttemptQuestions(): void {
    this.loader.showLoading();
    let userId = this.applicantId ? this.applicantId : this.userMeta?._id;
    let body: any = { type: this.type };
    if (this.userMeta?.role == 'assessor') {
      body['role'] = 'assessor';
    }
    body['financialYear'] = this.financialYear;
    this.apiService.post(`getQuestionsDetailsByApplicantID/${userId}`, body).subscribe({
      next: (resp: any) => {
        this.loader.hideLoading();
        if (resp['status'] === 'success') {
          if (this.statusList?.sector !== 'Automobile' && this.statusList?.sector !== 'Auto-components') {
            let automobileCategoryCount = resp['data']?.find((countElementData: any) => countElementData?.category == "Automobile Sector");
            resp['allQuestionCount'] = resp['allQuestionCount'] - automobileCategoryCount?.total_count;
            resp['totals']['total_count'] = resp['allQuestionCount'];
            let automobileCategoryCountIndex = resp['data']?.findIndex((countElementData: any) => countElementData?.category == "Automobile Sector");
            resp['data'].splice(automobileCategoryCountIndex, 1);
          }

          this.attemptQuestionDetails = resp;
          if (resp['count']) {
            this.savedQuestionnaireLength = resp['count'];
            this.finalSubmitStatus = (this.savedQuestionnaireLength == this.allCategoryCount) ? true : false;
          }
        }

      },
      error: (err: any) => {
        this.loader.hideLoading();
      }
    })
  }




  selectedEmmission: any = {};
  isLoad: boolean = true;
  isRequestInfo: boolean = false;
  isObjectEmpty(obj) {
    return obj && typeof obj === 'object' && !Array.isArray(obj) && Object.keys(obj).length === 0;
  }
  getAllUpdatedQuestions(): void {
    this.ngZone.run(() => {
      // this.loader.showLoading();
      this.loader.hideLoading();
      // debugger;
      if (this.selectedCategotyData !== 'Workforce') {
        let data = {};
        data["userId"] = this.applicantId ? this.applicantId : this.userMeta?._id
        data["role"] = this.userMeta?.role;
        data['financialYear'] = this.financialYear;
        this.isLoad = true;
        this.apiService.post('get-applicants-questionnaire', data).subscribe({
          next: (resp: any[]) => {
            // Questionnaire abhi bana hi nahi — applicant ne kuch bhara nahi hai.
            //
            // Backend is case me 404 NAHI deta: `getApplicantsQuestionnaire`
            // (ApiController.js:2887) tabhi 404 deta hai jab questionnaire AUR
            // workforce dono na mile. Sirf questionnaire missing ho to wo
            // 200 ke saath `data: null` bhejta hai.
            //
            // Iske aage ka code `resp['data']` ko object maankar padhta hai, to
            // yahan na ruke to `null['adminReasonMessage']` pe TypeError aata hai,
            // `isFinalSubmitted` set hi nahi hota, aur form ki jagah status page
            // khul jaata hai.
            //
            // Isliye yahin rukte hain aur 'draft' rakhte hain = khali form kholo.
            if (resp['data'] == null) {
              this.isLoad = false;
              this.isFinalSubmitted = 'draft';
              return;
            }

            let adminReasonMessage = resp['data']?.['adminReasonMessage'];

            this.isRequestInfo = !this.isObjectEmpty({ ...adminReasonMessage });

            // 🔹 Filter questions
            //  resp['data'].answers = resp['data'].answers.filter(
            //     (item) => item.questionId !== '684fb66c9826c9d2a6f3ff2f'   // yaha apna condition daalna hai
            //   );
            //       resp['data'].assessorResp = resp['data'].assessorResp.filter(
            //     (item) => item.questionId !== '684fb66c9826c9d2a6f3ff2f'   // yaha apna condition daalna hai
            //   );
            console.log(resp['data']);

            if (this.userMeta?.role == 'applicant' || this.userMeta?.role == 'vcp') {
              this.isFinalSubmitted = resp['data']?.['appli_submmited_status'];
            } else if (this.userMeta?.role == 'assessor') {
              this.isFinalSubmitted = resp['data']?.['assessor_submmited_status'];
            } else if (this.userMeta?.role == 'admin') {
              this.isFinalSubmitted = resp['data']?.['admin_submmited_status'];
            }

            resp['data'] = [...this.utilityService.filterQuestionaireMarks([resp['data']])];
              console.log((this.applicantQuestionForm.get('answers')));

            console.log(resp['data'], "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
            if (resp['status'] == 'success' && resp['data'][0]['answers']?.length > 0) {
              this.userQuestionnaire = resp['data'][0];
              this.savedQuestionnaireLength = resp['data'][0]['answers']?.length;
              this.finalSubmitStatus = (this.savedQuestionnaireLength == this.allCategoryCount) ? true : false;
              resp['data'][0]['answers']?.filter((item: any, index: number) => {
                console.log("UserMeta Data: ",this.userMeta);
                if (this.userMeta?.role == 'assessor') {
                  console.log("Index:  ", index,"  :  ",!item.assessorAnswer);
                  
                  if (!item.assessorAnswer) {
                    let assessorAns = item['answer']?.find((answer: any) => answer?.ansValue);
                    item.assessorAnswer = item.assessorResp?.find((answer: any) => {
                      if (answer?.answerLabel === assessorAns?.answerLabel) {
                        answer.ansValue = answer.answerLabel;
                        assessorAns.subanswar?.forEach((subans: any, index: number) => {
                          subans['assessorOption'] = answer.subanswar[index]?.assessorOption;
                        });
                        answer.subanswar = assessorAns.subanswar;
                        return true;
                      }
                      return false;
                    });
                  }

                }

              });

              // setTimeout(() => {

              //Logic for updated question...
              resp['data'][0]['answers']?.forEach((item: any, index: number) => {
                // let data = JSON.parse(JSON.stringify(item));
                let data = item;

                if (this.userMeta?.role == 'assessor') {
                  data['answer'] = item['assessorResp'];
                }
                if (this.userMeta?.role == 'admin') {
                  // console.log(item);
                  data['answer'] = item['adminResp']?.length > 0 ? item['adminResp'] : item['assessorResp'];
                }
                console.log(data['answer']);

                if (!item?.isAssessorChecked) {

                  let control = this.applicantQuestionForm.get('answers') as FormArray;
                  let indexOfUpperControl = control?.value?.findIndex((it: any) => it.questionId == item?.questionId);
                  let ind: number = index;
                  if (indexOfUpperControl !== (-1)) {
                    ind = indexOfUpperControl;
                  }
                   console.log(control);
                  const controlGroup = control.at(ind); // Get the form group at the current index
                  const answerArray = controlGroup?.get('answer')?.value;


                  if (Array.isArray(answerArray)) {
                    answerArray?.forEach((dt: any, upperInd: number) => {
                      data['answer'][upperInd] = data['answer'][upperInd] || {};

                      if (dt.assessorOption?.length > 0) {
                        data['answer'][upperInd]['assessorOption'] = dt.assessorOption || [];
                        data['answer'][upperInd]['assessorOptionType'] = dt.assessorOptionType || 'radio';
                        data['answer'][upperInd]['assessorGuidence'] = dt.assessorGuidence || '';
                      }

                      if (Array.isArray(dt.subanswar)) {
                        dt.subanswar?.forEach((tt: any, subIndi: number) => {
                          data['answer'][upperInd]['subanswar'] = data['answer'][upperInd]['subanswar'] || [];
                          data['answer'][upperInd]['subanswar'][subIndi] =
                            data['answer'][upperInd]['subanswar'][subIndi] || {};

                          data['answer'][upperInd]['subanswar'][subIndi]['assessorOption'] = tt.assessorOption || [];
                          data['answer'][upperInd]['subanswar'][subIndi]['assessorOptionType'] = tt.assessorOptionType || 'radio';
                          data['answer'][upperInd]['subanswar'][subIndi]['assessorGuidence'] = tt.assessorGuidence || '';

                          if (tt?.grid?.gridValue) {
                            data['answer'][upperInd]['subanswar'][subIndi]['grid'] =
                              data['answer'][upperInd]['subanswar'][subIndi]['grid'] || {};
                            data['answer'][upperInd]['subanswar'][subIndi]['grid']['gridValue'] =
                              data['answer'][upperInd]['subanswar'][subIndi]['grid']['gridValue'] || [];

                            tt.grid.gridValue?.forEach((gridItem: any, gridIndex: number) => {

                              data['answer'][upperInd]['subanswar'][subIndi]['grid']['gridValue'][gridIndex] =
                                data['answer'][upperInd]['subanswar'][subIndi]['grid']['gridValue'][gridIndex] || {};

                              data['answer'][upperInd]['subanswar'][subIndi]['grid']['gridValue'][gridIndex]['assessorOption'] =
                                gridItem.assessorOption;
                              data['answer'][upperInd]['subanswar'][subIndi]['grid']['gridValue'][gridIndex]['assessorOptionType'] =
                                gridItem.assessorOptionType;

                              data['answer'][upperInd]['subanswar'][subIndi]['grid']['gridValue'][gridIndex]['assessorGuidence'] =
                                gridItem.assessorGuidence || '';
                            });
                          }
                        });
                      }
                    });
                  }

                }


                if (item.category === this.selectedCategotyData && (item.questionIndex || item.questionIndex === 0)) {
                  // Retrieve the FormControl from the FormArray
                  const questionIndex = (this.applicantQuestionForm.get('answers') as FormArray)?.value?.findIndex((items: any) => items.questionId == item.questionId);
                  // console.log(item);
                  const formControl = (this.applicantQuestionForm.get('answers') as FormArray)
                    .at((questionIndex !== (-1)) ? questionIndex : item.questionIndex) as FormControl;
                  if (!formControl) {
                    return;
                  }

                  // Extract plain text from the old and new question content
                  const stripHtml = (html: string): string => {
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = html;
                    return tempDiv.textContent?.trim() || '';
                  };

                  const oldQuestion = stripHtml(formControl?.value?.question || '');
                  const newQuestion = stripHtml(item?.question || '');

                  // Compare the extracted text
                  // if (oldQuestion === newQuestion) {
                  console.log(questionIndex," : ",data);
                  // console.log(formControl," : formControl");
                  formControl.patchValue(data, { onlySelf: true });
                  let index = questionIndex !== (-1) ? questionIndex : item.questionIndex;
                  const answersArray = (this.applicantQuestionForm.get('answers') as FormArray)
                    .at(this.userMeta?.role == 'admin' ? item.questionIndex : index)
                    ?.get('answer')
                    ?.value;
                  // console.log(answersArray," :answersArray",item.questionIndex);
                  let isAnswerFound: any;
                  if (this.userMeta?.role == 'admin') {
                    isAnswerFound = answersArray?.find((answer: any) => answer?.ansValue === answer?.answerLabel);
                  } else {
                    isAnswerFound = answersArray?.find((answer: any) => answer?.ansValue === answer?.answerLabel);
                  }
                  // Add a class if the condition is met
                  if (isAnswerFound) {
                    if (this.userMeta?.role == 'admin') {
                      this.addClass(this.userMeta?.role == 'admin' ? item.questionIndex : index);
                    } else if (item?.isAssessorChecked && this.userMeta?.role == 'assessor') {
                      this.addClass(index);
                    } else if (this.userMeta?.role == 'applicant' || this.userMeta?.role == 'vcp') {
                      this.addClass(index);
                    }
                  }
                  // } else {

                  //   console.log(`Questions do not match at index: ${item.questionIndex}`);
                  // }
                }

              });

              console.log((this.applicantQuestionForm.get('answers')));
              //Detect changes after loading the answer
              if (this.selectedCategotyData == 'Decarbonization') {
                this.changeQuestion14StatusOfDecorbonization();
                this.changeQuestion19StatusOfDecorbonization();
              }
              this.loader.hideLoading();
              this.isLoad = false;
              // }, 2000);

            } else {
              this.isLoad = false;
              this.loader.hideLoading();
            }

          },
          error: (error: any) => {
            this.loader.hideLoading();
            this.isLoad = false;
          }
        });
      } else {
        this.isLoad = false;
        this.loader.hideLoading();
      }
    })
  }




  trackByFn(index: number, item: any): any {
    return item.id || index; // Return a unique identifier
  }

  // contacts


  deleteSingleQuestion(i: number, control: any): void {
    this.alertService.confirmDialog("Reset", 'Are you sure, you want to delete').subscribe({
      next: (status: boolean) => {
        this.loader.hideLoading();
        if (status) {
          this.loader.showLoading();
          let userRole: string = this.assessorId ? 'assessor' : 'applicant';
          let questionId: string = control.value?.questionId;
          let userId = this.applicantId ? this.applicantId : this.userMeta?._id;
          this.apiService.update('delete-single-question', { questionId: questionId, role: userRole }, userId).subscribe({
            next: (resp: any) => {
              this.loader.hideLoading();
              // gaurav.agrawal@kimbal.io
              if (resp['status'] == 'success') {
                this.alertService.successSnackBar("Question reset successfully", 'OK', 'top-right');
              }

              this.selectCategory(this.selectedCategotyData);
              //  (this.applicantQuestionForm.get('answers') as FormArray).at(i).reset();

            },
            error: (err: any) => {
              this.loader.hideLoading();
            }
          });
        }
      }
    });
  }



  updateEmissionFirstQuestion(data: any) {
    if (this.selectedCategotyData === 'Decarbonization') {
      let totalOf2021 = 0;
      let totalOf2022 = 0;
      let totalOf2023 = 0;

      let total2Of2021 = 0;
      let total2Of2022 = 0;
      let total2Of2023 = 0;
      const formArray = this.applicantQuestionForm.get('answers') as FormArray;
      const subAnswerControl = formArray.at(1).get('answer') as FormArray;
      let lableVal = (subAnswerControl.at(0)).get('answerLabel').value;

      const subAnswerControl1 = formArray.at(2).get('answer') as FormArray;
      let lableVal1 = (subAnswerControl1.at(0)).get('answerLabel').value;
      if (lableVal) {
        data?.answers?.forEach((item: any) => {
          item['answer']?.forEach((answer: any) => {
            if (answer.subanswar?.length > 0) {
              ;
              let isFlagPass: any = null;
              let isFound = data.answers[0].answer?.[1]?.subanswar?.[0]?.flag === "emission1"; //1
              if (isFound) {
                isFlagPass = data.answers[0].answer?.[1]?.subanswar?.[0]; //1
              }

              // if (isFlagPass) {
              if (isFlagPass?.ansValue) {
                console.log("isFlagPass:  ", isFlagPass);
                // Safely access ansValue with fallback defaults
                totalOf2021 = isFlagPass?.ansValue?.['2022']?.scope1?.totalOfFirst ?? '';
                totalOf2022 = isFlagPass?.ansValue?.['2023']?.scope1?.totalOfFirst ?? '';
                totalOf2023 = isFlagPass?.ansValue?.['2024']?.scope1?.totalOfFirst ?? '';


                // dummyOfEmission.forEach((item) => {
                const group = new FormGroup({
                  "00": new FormControl('Unit'),
                  "01": new FormGroup({
                    val: new FormControl('FY 2022–23'),
                    type: new FormControl('text')
                  }),
                  "02": new FormGroup({
                    val: new FormControl('FY 2023–24'),
                    type: new FormControl('text')
                  }),
                  "03": new FormGroup({
                    val: new FormControl('FY 2024–25'),
                    type: new FormControl('text')
                  }),


                });
                console.log("total2Of2022:  ", total2Of2022);
                console.log("total2Of2023:  ", total2Of2023);

                const group2 = new FormGroup({
                  "10": new FormGroup({
                    val: new FormControl('(MT CO2e)'),
                    type: new FormControl('text')
                  }),
                  "11": new FormGroup({
                    val: new FormControl(totalOf2021),
                    type: new FormControl('text')
                  }),
                  "12": new FormGroup({
                    val: new FormControl(totalOf2022),
                    type: new FormControl('text')
                  }),
                  "13": new FormGroup({
                    val: new FormControl(totalOf2023),
                    type: new FormControl('text')
                  })
                });


                (subAnswerControl.at(0)).get('ansValue').patchValue(lableVal);
                (subAnswerControl.at(1)).get('ansValue').patchValue(false);
                (subAnswerControl.at(2)).get('ansValue').patchValue(false);
                const subAnswerForm = subAnswerControl.at(0).get('subanswar') as FormArray;
                (subAnswerForm.at(0)).get('ansValue').patchValue(true);
                (subAnswerForm.at(1)).get('ansValue').patchValue(false);
                (subAnswerForm.at(0)).get('subAnswerLabel').patchValue(true);
                const gridForm = (subAnswerForm.at(0).get('grid').get('gridValue') as FormArray);
                gridForm.clear();
                gridForm.push(group);
                gridForm.push(group2);

                // Patch the value to the form control
                // gridForm.patchValue([group, group2]);
                this.changeFormValue = of(gridForm.controls);

                // this.cd.detectChanges();

                total2Of2021 = isFlagPass?.ansValue?.['2022']?.scope2?.purchaseTotal ?? '';
                total2Of2022 = isFlagPass?.ansValue?.['2023']?.scope2?.purchaseTotal ?? '';
                total2Of2023 = isFlagPass?.ansValue?.['2024']?.scope2?.purchaseTotal ?? '';



                // dummyOfEmission.forEach((item) => {
                const groupS1 = new FormGroup({
                  "00": new FormControl('Unit'),
                  "01": new FormGroup({
                    val: new FormControl('FY 2022–23'),
                    type: new FormControl('text')
                  }),
                  "02": new FormGroup({
                    val: new FormControl('FY 2023–24'),
                    type: new FormControl('text')
                  }),
                  "03": new FormGroup({
                    val: new FormControl('FY 2024–25'),
                    type: new FormControl('text')
                  }),


                });
                const groupS2 = new FormGroup({
                  "10": new FormGroup({
                    val: new FormControl('(MT CO2e)'),
                    type: new FormControl('text')
                  }),
                  "11": new FormGroup({
                    val: new FormControl(total2Of2021),
                    type: new FormControl('text')
                  }),
                  "12": new FormGroup({
                    val: new FormControl(total2Of2022),
                    type: new FormControl('text')
                  }),
                  "13": new FormGroup({
                    val: new FormControl(total2Of2023),
                    type: new FormControl('text')
                  })
                });

                (subAnswerControl1.at(0)).get('ansValue').patchValue(lableVal1);
                (subAnswerControl1.at(1)).get('ansValue').patchValue(false);
                const subAnswerForm1 = subAnswerControl1.at(0).get('subanswar') as FormArray;
                (subAnswerForm1.at(0)).get('ansValue').patchValue(true);
                (subAnswerForm1.at(1)).get('ansValue').patchValue(false);

                (subAnswerForm.at(0)).get('subAnswerLabel').patchValue(true);
                const gridForm1 = (subAnswerForm1.at(0).get('grid').get('gridValue') as FormArray);
                gridForm1.clear();
                console.log("Done");
                gridForm1.push(groupS1);
                gridForm1.push(groupS2);
                this.changeFormValue = of(gridForm1.controls);
                // this.cd.detectChanges();

                this.addClass(1);
                this.addClass(2);

              }

            }
          });
        });
      }
    }
  }

  setSubSubAnsFile(e: any, i: number, j: number, k: number) {
    this.imageUploaderService.uploadFiles(e).subscribe({
      next: (files: any) => {
        if (files?.file !== undefined) {
          this.fileUploader(files.file, i, j, k);
        }
      }
    });
  }

  setSubSubSubAnsFile(e: any, i: number, j: number, k: number) {
    this.imageUploaderService.uploadFiles(e).subscribe({
      next: (files: any) => {
        if (files?.file !== undefined) {
          this.fileUploader(files.file, i, j, k);
        }
      }
    });
  }


  addClass(index: number) {
    let control: any;
    if (this.userMeta?.role == 'admin') {
      control = (this.applicantQuestionForm.get('answers') as FormArray).at(index).get('isAdminChecked');
    } else {
      control = (this.applicantQuestionForm.get('answers') as FormArray).at(index).get('isAssessorChecked');
    }
    // console.log(control.value);
    if ((this.userMeta?.role == 'applicant' || this.userMeta?.role == 'vcp') || (this.userMeta?.role == 'assessor' || (this.userMeta?.role == 'admin') && control.value)) {

      let selectedCategoryItem = this.categoryData.find((item: any) => item.category == this.selectedCategotyData);
      if (selectedCategoryItem) {
        let updatedString = selectedCategoryItem.id.replace('-tab', '');
        // setTimeout(()=>{
        // Get the element by ID
        let categoryId = document.getElementById(updatedString);

        if (categoryId) {
          let tabIndexes = categoryId.getElementsByClassName('mat-step-icon-content');
          if (tabIndexes.length > 0) {
            tabIndexes[index].classList.add('checked-tab');
          } else {
            console.log("No elements with class 'mat-step-icon-content' found inside categoryId.");
          }
        } else {
          console.log("Element with id 'pills-decarbonization-tab' not found.");
        }
        // },500);
      }
    }
  }



  clearAssessment() {
    let userId = this.applicantId ? this.applicantId : this.userMeta?._id;
    this.alertService.confirmDialog("Clear Assessment", "Are you sure you want to clear your assessment?").subscribe({
      next: (status: boolean) => {
        if (status) {
          this.loader.showLoading();
          this.apiService.post('clearAssessment', { applicant_id: userId }).subscribe({
            next: (resp: any) => {
              this.loader.hideLoading();
              window.location.reload();
            },
            error: (err: any) => {
              this.loader.hideLoading();
              window.location.reload();
              console.log(err);
            }
          });
        }
      }
    });

  }


  selectedIndex: number = 0;



  saveAsNext(i: number): void {
    this.selectedIndex = i;
    let control: any = (this.applicantQuestionForm.get('answers') as FormArray).at(i);
    // let nextControl:any = (this.applicantQuestionForm.get('answers') as FormArray).at(i+1);

    if (this.checkValidation(control)) {
      let data = this.applicantQuestionForm.value?.answers[i];

      let isSelected = this.answer(i).value.some((option: any) => option?.ansValue);
      console.log(this.applicantQuestionForm.value, "  :  ", isSelected);
      if (this.applicantQuestionForm.value?.answers?.length > 0) {
        if (isSelected) {
          this.applicantQuestionForm.value.answers[i]['status'] = true;
          this.applicantQuestionForm.value.answers[i]['questionIndex'] = i;
          let userId = this.applicantId ? this.applicantId : this.userMeta?._id;
          let body = { questionId: data?.questionId, applicant_id: userId, role: this.userMeta?.role };

          console.log(this.applicantQuestionForm.value.answers[i], "  Check");
          if (this.userMeta.role == 'assessor') {
            this.applicantQuestionForm.value.answers[i]['assessorResp'] = this.applicantQuestionForm.value.answers[i]?.answer || [];

            control.get('isAssessorChecked').patchValue(true);
            console.log(control.get('isAssessorChecked')?.value);
            body['assessorResp'] = this.applicantQuestionForm.value.answers[i];
            this.addClass(i);
          } else if (this.userMeta.role == 'admin') {
            this.applicantQuestionForm.value.answers[i]['adminResp'] = this.applicantQuestionForm.value.answers[i]?.answer || [];
            control.get('isAdminChecked').patchValue(true);
            body['adminResp'] = this.applicantQuestionForm.value.answers[i];
          } else {
            body['answers'] = this.applicantQuestionForm.value.answers[i];
          }

          let dummyData = {
            answers: [
              { answer: data.answer }
            ]
          };
          console.log(data?.answer?.[1]?.subanswar);
          if (data?.answer?.[1]?.subanswar?.[0]?.flag === "emission1") {
            this.updateEmissionFirstQuestion(dummyData);
          }
          body['financialYear'] = this.financialYear;
          console.log(body);
          this.apiService.post('createApplicantQuestionnaires', body).subscribe({
            next: (resp: any) => {
              this.loader.hideLoading();
              if (resp['status'] == 'success') {
                this.getDetailOfAttemptQuestions();
                // this.logicForLinkingQuestions(data?.questionId);
                this.cd.detectChanges();
                setTimeout(() => {
                  this.logicForLinkingQuestions(data, i);
                }, 1000);

              }
            },
            error: (err: any) => {
              this.loader.hideLoading();
            }
          });
        }
      }

    }


  }



  logicForLinkingQuestions(data: any, i: number) {
    console.log(data);
    if (i == 9 && this.selectedCategotyData == 'Decarbonization') {
      let answers = this.applicantQuestionForm.get('answers') as FormArray;
      //  let question10= (((answers.at(9).get('answer') as FormArray).at(0).get('subanswar') as FormArray).at(0).get('grid').get('gridValue') as FormArray);
      let question10 = data['answer'][0]['subanswar'][0]['grid']['gridValue'];
      console.log(question10);
      console.log(question10[6]);
      console.log(question10[6]["64"]);
      console.log(question10[6]["64"]['val']);


      let valueOf64Index = question10[6]["64"]['val'];
      let valueOf74Index = question10[7]["74"]['val'];
      console.log(valueOf64Index);
      console.log(valueOf74Index);
      let calcOfQuestion10 = (Number(valueOf64Index) / Number(valueOf74Index)) * 100;
      console.log(calcOfQuestion10);
      //get control of 11th question
      if (calcOfQuestion10) {
        let question11 = ((answers.at(10).get('answer') as FormArray));
        console.log(question11);
        let lableValue = (question11.at(0) as FormArray).get('answerLabel')?.value;
        (question11.at(0) as FormArray).get('ansValue')?.patchValue(lableValue);

        let subAnsLable = ((question11.at(0) as FormArray).get('subanswar') as FormArray).at(0).get('subAnswerLabel')?.value;
        ((question11.at(0) as FormArray).get('subanswar') as FormArray).at(0).get('ansValue')?.patchValue(subAnsLable);
        ((question11.at(0) as FormArray).get('subanswar') as FormArray).at(0).get('textTypeVal')?.patchValue(subAnsLable);


        ((question11.at(0) as FormArray).get('subanswar') as FormArray).at(0).get('numericTypeVal').patchValue(calcOfQuestion10.toFixed(2))

      }


    }
  }






  openUploadDocumentsPage() {
    console.log(this.userMeta?.role);
    let userId = this.applicantId ? this.applicantId : this.userMeta?._id;
    this.dialog.open(DocumentListComponent, {
      width: '1100px',
      data: { applicant_id: userId, role: this.userMeta?.role, isSubmit: this.finalSubmitStatus, applicantRole: this.statusList?.standAs }
    });
  }

  openAssessorUploadDocumentsPage(isView: boolean) {
    // this.ngZone.runOutsideAngular(()=>{
    let userId = this.applicantId ? this.applicantId : this.userMeta?._id;
    let body: any = { applicant_id: userId, role: this.userMeta?.role, isSubmit: this.finalSubmitStatus, applicantRole: this.statusList?.standAs };
    body['isView'] = isView ? true : false;
    this.dialog.open(AssessorUploadDocumentComponent, {
      width: '1100px',
      data: body
    });
  }

  fileUploader(file: any, i: number, j: number, k: number): void {
    let formData: FormData = new FormData();
    formData.append('file', file);
    this.loader.showLoading();
    this.apiService.post('/fileUploader', formData).subscribe({
      next: (resp: any) => {
        this.loader.hideLoading();

        (((this.applicantQuestionForm.get('answers') as FormArray).at(i).get('answer') as FormArray).at(j).get('subanswar') as FormArray).at(k).get('uploadTypeVal').patchValue(resp?.fileUrl);

      },
      error: (err: any) => {
        this.loader.hideLoading();
      }
    });

  }

  nextStep(i: number, stepper: MatStepper): any {
    let control: any = (this.applicantQuestionForm.get('answers') as FormArray).at(i);
    if (this.checkValidation(control)) {
      this.controlIndexesFlow(i, stepper);
    } else {
      this.alertService.errorSnackBar("Please enter detail...", 'OK', 'top-right');
    }
  }


  getControl(i: number): boolean {
    let control: any = (this.applicantQuestionForm.get('answers') as FormArray).at(i);
    return this.checkValidation(control);
  }

  checkValidation(control: any) {
    return this.controlSubQuestionnaireValidator(control) && this.controlQuestionnaireValidator(control);
  }

  controlQuestionnaireValidator(control: FormGroup): boolean {
    let answerControl = control.get('answer') as FormArray;
    let validStatus: boolean = false;

    let answerIndex = answerControl.value.findIndex((item: any) => item.ansValue);
    if (answerIndex !== -1) {
      validStatus = true;

      let selectedAnswer = answerControl.at(answerIndex) as FormGroup;
      let subanswerControl = selectedAnswer.get('subanswar') as FormArray;
      if (subanswerControl?.value?.length > 0) {

        let subanswerIndex = subanswerControl.value.findIndex((item: any) => item.ansValue);


        if (subanswerControl.value[subanswerIndex]?.subAnswerTypes !== 'Grid') {
          if (subanswerIndex !== -1) {
            validStatus = true;
          } else {
            validStatus = false;
          }
        } else {
          validStatus = true;
        }

      }

    } else {
      validStatus = false;
    }
    // console.log(validStatus);
    return validStatus; // Return validStatus, which reflects the overall state
  }


  controlSubQuestionnaireValidator(control: FormGroup): Boolean | null {
    const answerControl = control.get('answer') as FormArray;
    let isValid: boolean = false;
    if (!answerControl || !Array.isArray(answerControl.value)) return isValid;

    for (let i = 0; i < answerControl.length; i++) {
      const mainAnswerGroup = answerControl.at(i) as FormGroup;

      if (mainAnswerGroup.get('ansValue')?.value) {
        const subAnswerArray = mainAnswerGroup.get('subanswar') as FormArray;

        if (subAnswerArray && subAnswerArray.length > 0) {
          for (let j = 0; j < subAnswerArray.length; j++) {
            const subAnswer = subAnswerArray.at(j) as FormGroup;

            const isChecked = subAnswer.get('ansValue')?.value;
            const type = subAnswer.get('subAnswerTypes')?.value;
            const textVal = subAnswer.get('textTypeVal')?.value;
            const numericTypeVal = subAnswer.get('numericTypeVal')?.value;
            const subAnswerLabel = subAnswer.get('subAnswerLabel')?.value;
            const isTypeNumericText = subAnswer.get('isTypeNumericText')?.value;
            const isTypeText = subAnswer.get('isTypeText')?.value;


            if (isChecked && type === 'CheckBox' && (isTypeText) && (!textVal)) {
              isValid = false;
              return isValid;  // Validation fails
            }

            if (isChecked && type === 'CheckBox' && (isTypeNumericText) && (numericTypeVal == "")) {
              isValid = false;
              return isValid;  // Validation fails
            }
            // && (!textVal || !numericTypeVal)
            else if (isChecked && type === "RadioButton" && (!subAnswerLabel) && (numericTypeVal == "")) {
              isValid = false;
              return isValid;  // Validation fails
            }

          }
        }
      } else {
        isValid = true;
      }
    }

    return isValid;  // All good
  }



  // let subanswerIndexData = subanswerControl.value.find((item: any) => item.ansValue);
  //     console.log(subanswerIndex," : ",subanswerIndexData);
  //     if(subanswerControl?.value[subanswerIndex]?.subAnswerTypes =="CheckBox" && !subanswerIndexData?.textTypeVal){
  //        return false;
  //     }






  selectCategory(category_name: string): void {
    this.loader.showLoading();
    this.selectedCategotyData = category_name;
    // this.allChangeDetectionCompleted();
    if (category_name == 'Decarbonization') {
      this.getParticularQuestion();
    }


    this.ngZone.run(() => {
      let applicant_id = this.applicantId ? this.applicantId : this.userMeta?._id;
      this.apiService.post(`getQuestionnariesByCategoryName/${category_name}`, { type: this.type, financialYear: this.financialYear,applicant_id:applicant_id }).subscribe({
        next: (resp: any) => {
          if (resp['status'] == 'success') {
            this.questionnarie = resp['data'];
            let control = this.applicantQuestionForm.get('answers') as FormArray;
            control.clear();
            if (resp['data']?.length > 0) {


              resp['data'].forEach((item: any, index: number) => {
                console.log("Item: ","Index: ",index,"  :  ",item);
                control.push(
                  this._formBuilder.group({
                    questionId: [item._id],
                    type: [item.type],
                    assignmentYear: [item.assignmentYear],
                    category: [item.category],
                    section: [item.section],
                    subSection: [item.subSection],
                    status: [false],
                    assessorComment: [item.assessorComment],
                    adminComment: [item.adminComment],
                    appli_obtendOption: [''],
                    obtendMark: [''],
                    isMarks: [item.isMarks],
                    isText: [item.isText],
                    isUpload: [item.isUpload],
                    questionOrderNo: [item.questionOrderNo],
                    applicantAnswer: [item.applicantAnswer || {}],
                    assessorAnswer: [item.assessorAnswer || {}],
                    adminAnswer: [item.adminAnswer || {}],

                    assessorResp: [item.assessorResp],
                    adminResp: [item.adminResp],

                    maxMark: [item.maxMark],
                    standardAlignment: [item.standardAlignment],
                    question: [item.question],
                    questionIndex: [item.questionIndex],
                    description: [item.description],
                    answerType: [item.answerType],
                    position: [item.position],
                    assessorSelecedResp: [item.assessorSelecedResp || null],
                    adminSelecedResp: [item.adminSelecedResp || null],

                    tooltip: [item.tooltip],
                    isAssessorChecked: [item.isAssessorChecked || false],
                    isAdminChecked: [item.isAdminChecked || false],


                    answer: this._formBuilder.array(
                      (item.answer || []).map((question: any, ii: number) => this._formBuilder.group({
                        answerLabel: [question.answerLabel],
                        ansValue: [null, Validators.required],
                        sortOrder: [question.sortOrder],
                        score: [question.score],
                        assessorSelecedResp: [item.assessorSelecedResp || null],
                        adminSelecedResp: [item.adminSelecedResp || null],

                        // assessorOption: [question.assessorOption || []],
                        assessorGuidence: [question.assessorGuidence || ''],
                        assessorOption: [question.assessorOption || []],
                        assessorOptionType: [question.assessorOptionType],
                        subAnswer: [question.subAnswer],
                        subAnswerType: [question.subAnswerType],
                        subanswar: this._formBuilder.array(
                          (question.subanswar || []).map((subQuestion: any, i: number) => this._formBuilder.group({
                            subAnswerLabel: [subQuestion.subAnswerLabel],
                            subscore: [subQuestion.subscore],
                            gridLabel: [subQuestion.gridLabel],
                            // assessorOption: [subQuestion.assessorOption || []],
                            assessorGuidence: [subQuestion.assessorGuidence || ''],
                            assessorOption: [subQuestion.assessorOption || []],

                            assessorOptionType: [subQuestion.assessorOptionType],
                            subAnswerTypes: [subQuestion.subAnswerTypes],
                            ansValue: [subQuestion.ansValue],
                            flag: [subQuestion?.flag ? subQuestion?.flag : false],
                            textTypeVal: [subQuestion.textType],
                            numericTypeVal: [subQuestion.numericTypeVal],
                            uploadTypeVal: [subQuestion.uploadTypeVal],
                            isTypeText: [subQuestion.isTypeText],
                            isTypeNumericText: [subQuestion.isTypeNumericText],
                            isUploadText: [subQuestion.isUploadText],
                            // Admin ke banaye grid formulas. Iske bina ye form rebuild
                            // me gir jaate the, `getGridFormulas()` khali array deta tha,
                            // aur applicant ke type karne pe kuch calculate hi nahi hota tha.
                            gridFormulas: [subQuestion.gridFormulas || []],
                            // isDisabled:[subQuestion.isDisabled],
                            grid: subQuestion?.subAnswerTypes === 'Grid' ? this._formBuilder.group({
                              gridValue: this._formBuilder.array(
                                (Array.isArray(subQuestion?.[i.toString()]) ? subQuestion[i.toString()] : []).map((row: any) => {
                                  const assessorOption = Array.isArray(row.assessorOption) ? row.assessorOption : [];
                                  return this._formBuilder.group({
                                    ...Object.keys(row).reduce((controls, key) => {
                                      if (key !== 'assessorOption') {
                                        controls[key] = [row[key]];
                                      }
                                      return controls;
                                    }, {} as any),
                                    assessorOption: [assessorOption || []],
                                    // assessorGuidence: [subQuestion.assessorGuidence || ''],
                                    // assessorOption: this._formBuilder.array(
                                    //   assessorOption.map((option: any) =>
                                    //     this._formBuilder.group({
                                    //       option: [option.option ?? null],
                                    //       isSelected: [option.isSelected ?? false],
                                    //       marksnotapplicable: [option.marksnotapplicable ?? false],
                                    //       marks: [option.marks ?? null],
                                    //       id: [option.id ?? null],
                                    //     })
                                    //   )
                                    // ),
                                  });
                                }

                                )
                              )
                            }) : null

                          })) || []
                        )
                      }))
                    )
                  })
                );
              });
            }

            console.log("=====================================", this.applicantQuestionForm.value);
            if (this.isView) {
              this.applicantQuestionForm.disable();
            }
            this.getAllUpdatedQuestions();
          }


        },
        error: (err: any) => {
          this.loader.hideLoading();
        }
      });
    });
  }




  changeQuestion14StatusOfDecorbonization() {
    const answersArray = this.applicantQuestionForm.get('answers') as FormArray;
    console.log(answersArray?.value);
    if (answersArray) {
      let index = answersArray.value.findIndex((item: any) => item.questionId == '682c4abb485482741b9ce9f6' || item.questionId == '6a76abba03c3b2c50d2cd58f' || item.questionId == '6a76abba03c3b2c50d2cd58e' || item.questionId == '6a76abba03c3b2c50d2cd58d' || item.questionId == '6a76abba03c3b2c50d2cd58c' || item.questionId == '682c4abb485482741b9ce9f6');
      if (index !== (-1)) {
        const answerGroup = answersArray.at(index) as FormGroup;  //13

        if (answerGroup) {
          const answerArray = answerGroup.get('answer') as FormArray;

          if (answerArray) {
            const subAnswerArray = answerArray.at(0)?.get('subanswar') as FormArray;

            if (subAnswerArray) {
              const numericTypeValControl = subAnswerArray.at(0)?.get('numericTypeVal');
              console.log(numericTypeValControl.value);

              if (numericTypeValControl) {
                console.log(numericTypeValControl.value, ":Checking");
                numericTypeValControl.valueChanges.subscribe({
                  next: (resp: any) => {
                    console.log(resp, ":resp");
                    console.log(this.selectedCategotyData, ":this.selectedCategotyData");
                    if (this.selectedCategotyData === 'Decarbonization') {
                      this.event.updateQuestion(resp);
                    }
                  }
                });
              } else {
                console.error('numericTypeValControl not found.');
              }
            } else {
              console.error('subAnswerArray not found.');
            }
          } else {
            console.error('answerArray not found.');
          }
        } else {
          console.error('answerGroup at index 13 not found.');
        }
      }

    }

  }

  changeQuestion19StatusOfDecorbonization() {
    const answersArray = this.applicantQuestionForm.get('answers') as FormArray;
    let index = (this.applicantQuestionForm.get('answers') as FormArray)?.value.findIndex((item: any) => item?.questionId == '682c565e485482741b9cfde7');
    if (index !== (-1)) {
      if (answersArray) {
        const answerGroup = answersArray.at(index) as FormGroup;
        // console.log('answerGroup at index 18:', answerGroup); // Debug log

        if (answerGroup) {
          const answerArray = answerGroup.get('answer') as FormArray;
          if (answerArray) {
            const subAnswerArray = answerArray.at(0)?.get('subanswar') as FormArray;
            if (subAnswerArray) {
              const numericTypeValControl1 = subAnswerArray.at(0)?.get('numericTypeVal');
              const numericTypeValControl2 = subAnswerArray.at(1)?.get('numericTypeVal');

              if (numericTypeValControl1 && numericTypeValControl2) {
                // Combine the value changes of both controls
                combineLatest([
                  numericTypeValControl1.valueChanges,
                  numericTypeValControl2.valueChanges
                ]).subscribe({
                  next: ([value1, value2]) => {
                    if (this.selectedCategotyData === 'Decarbonization') {
                      console.log(numericTypeValControl1?.value, ":numericTypeValControl1");
                      console.log(numericTypeValControl2?.value, ":numericTypeValControl2");
                      console.log(value1, value2, ":resp");
                      const combinedValue = (Number(value1 ?? 0)) + (Number(value2 ?? 0));// Add or process the values
                      this.event.updateQuestion191(combinedValue);
                    }
                  }
                });
              } else {
                if (!numericTypeValControl1) {
                  console.warn('numericTypeValControl1 not found.');
                }
                if (!numericTypeValControl2) {
                  console.warn('numericTypeValControl2 not found.');
                }
              }

            } else {
              console.error('subAnswerArray not found.');
            }

          } else {
            console.error('answerArray not found.');
          }
        } else {
          console.error('answerGroup at index 13 not found.');
        }
      }
    }

  }




  getAllCategoryCount(): void {
    this.ngZone.run(() => {
      this.loader.showLoading();
      this.apiService.post('getCategoryCount', { type: this.type, financialYear: this.financialYear }).subscribe({
        next: (resp: any) => {
          this.loader.hideLoading();
          if (resp['status'] == 'success') {
            this.categoryCount = resp['data'];
            //  this.categoryCount= this.staticQuestionService.replaceWithQuestionCount(resp['data'],this.statusList?.sector);
            this.cd.detectChanges();
            if (this.categoryCount?.length > 0) {
              this.categoryCount.forEach((item: any) => {
                //Check

                // if(item._id!=='Automobile Sector' && this.statusList?.sector!=='Automobile'){
                this.allCategoryCount += item.count;
                // }

              });
            }
          }
        },
        error: (err: any) => {
          this.loader.hideLoading();
        }
      });
    })
  }

  getCategory(itemId: string, arr: any[]): number {
    return arr.findIndex((item: any) => item._id === itemId);
  }


  controlIndexesFlow(i: number, stepper: MatStepper): any {
    let data = this.applicantQuestionForm.value['answers'];
    if (this.helperFun(i).status) {
      let nextIndex = i;
      let found = false;

      data.some((ov: any, j: number) => {
        if (j > i && ov.status === false) {
          nextIndex = j;
          found = true;
          return true; // Exit the loop early
        }
        return false; // Continue iterating
      });

      if (found) {

        stepper.selectedIndex = nextIndex;
      } else {
        stepper.selectedIndex = nextIndex + 1;
      }


    } else {
      console.log("Else Block:  ", data, i);
      // if (data?.length > (i + 1)) {
      //   stepper.next();
      //   console.log("Entering control index:  ",stepper)
      //   // return stepper.selectedIndex = i + 1;

      // }

    }
  }



  helperFun(i: number): any {

    let data = this.applicantQuestionForm.value['answers'];
    // let findIndex = this.categoryData.findIndex(ind => this.selectedCategotyData == ind.category);
    if (data[i + 1]?.status == undefined) {
      let findIndex = this.categoryData.findIndex(ind => this.selectedCategotyData == ind.category);
      let btns = document.getElementById(this.categoryData[findIndex + 1].id);
      btns.click();

      setTimeout(() => {
        this.getAllUpdatedQuestions();
        this.selectedCategotyData = this.categoryData[findIndex + 1].category;
      }, 2000);

    }
    if (data[i + 1]?.status == true) {
      return { status: true, index: i + 1 };
    } else {
      return { status: false, index: i + 1 };
    }


  }


  goToViewPage(): void {
    this.router.navigate(['/dashboard/questionnaire-view']);
  }

  async finalSubmit(): Promise<void> {
    this.getDetailOfAttemptQuestions();

    const dialogRef = this.dialog.open(DialogOverviewExampleDialog, {
      width: '900px',
      data: {
        detail: this.attemptQuestionDetails || [],
        role: this.userMeta?.role,
        isSubmit: this.finalSubmitStatus,
        sector: this.statusList?.sector
      }
    });
    console.log(this.attemptQuestionDetails);

    const result = await dialogRef.afterClosed().toPromise(); // Wait for the dialog to close

    if (result) {
      if (!result?.category_name) {
        await this.updateQuestionnaireStatus(); // Ensure async handling
      } else if (result?.category_name) {
        const findIndex = this.categoryData.findIndex(ind => result?.category_name == ind.category);
        const btns = document.getElementById(this.categoryData[findIndex].id);

        if (btns) {
          btns.click();
          await new Promise(resolve => setTimeout(resolve, 2000)); // Wait before fetching new data
          await this.getAllUpdatedQuestions();
        }
      }
    }
  }



  calculateEmission(i: number, j: number, k: number): void {
    let data = (((this.applicantQuestionForm.get('answers') as FormArray).at(i).get('answer') as FormArray).at(j).get('subanswar') as FormArray).at(k).get('ansValue').value;
    console.log(data);
    let dialogRef = this.dialog.open(ScopeEmissionsComponent, {
      width: '1500px',
      maxHeight: '100vh',
      data: { detail: data, role: 'applicant', isSubmit: this.finalSubmitStatus }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        (((this.applicantQuestionForm.get('answers') as FormArray).at(i).get('answer') as FormArray).at(j).get('subanswar') as FormArray).at(k).get('ansValue').patchValue(result);
        console.log((((this.applicantQuestionForm.get('answers') as FormArray).at(i).get('answer') as FormArray).at(j).get('subanswar') as FormArray).at(k).get('ansValue')?.value);
      }
    })
  }

  updateQuestionnaireStatus(): void {
    this.alertService.confirmDialog('Final Submission', 'Are you sure you want to submit').subscribe({
      next: (status: boolean) => {
        if (status === true) {
          this.loader.showLoading();
          if (this.userMeta?.role == 'assessor') {
            this.completeAssisment(this.applicantId, this.assessorId);
          }
          let body: any = {};
          if ((this.userMeta?.role == 'applicant' || this.userMeta?.role == 'vcp') && this.userMeta) {
            body = { appli_submmited_status: 'submitted', role: this.userMeta?.role };
          } else if (this.userMeta?.role == 'admin' && this.userMeta) {
            body = { admin_submmited_status: 'submitted', role: this.userMeta?.role };
          } else if (this.userMeta?.role == 'assessor' && this.userMeta) {
            body = { assessor_submmited_status: 'submitted', role: this.userMeta?.role };
          }
          body['isRequestInfo'] = this.isRequestInfo;
          let userId = this.applicantId ? this.applicantId : this.userMeta?._id;
          body['financialYear'] = this.financialYear;
          body['id'] = userId;
          this.apiService.post(`updateQuestionnaireStatus`, body).subscribe({
            next: (resp: any) => {
              this.loader.hideLoading();

              if (resp['status'] === 'success') {
                if ((this.userMeta?.role == 'applicant' || this.userMeta?.role == 'vcp') && this.userMeta) {
                  this.isFinalSubmitted = resp['data']?.['appli_submmited_status'];
                } else if (this.userMeta?.role == 'admin' && this.userMeta) {
                  this.isFinalSubmitted = resp['data']?.['assessor_submmited_status'];
                } else if (this.userMeta?.role == 'assessor' && this.userMeta) {
                  this.isFinalSubmitted = resp['data']?.['admin_submmited_status'];
                }

                this.alertService.successSnackBar(resp['message'], 'OK', 'top-right');
              }
            },
            error: (err: any) => {
              this.loader.hideLoading();
            }
          });
        }
      }
    });
  }

  openTooltip(value: string): void {
    if (value) {
      let dialogRef = this.dialog.open(TooltipDialog, {
        width: '900px',
        data: { tooltip_value: value },
        enterAnimationDuration: '800ms',
        exitAnimationDuration: '1000ms',
      });
      dialogRef.afterClosed().subscribe(result => {
      });
    }
  }

  changeEvent(event: any, i: number, j: number, applicantQuestionForm: any) {

    let formControlData = this.utilityService.changeEvent(event, i, j, applicantQuestionForm);
    console.log("Okay", formControlData);
    let ans = formControlData.find((ans: any) => ans?.ansValue != null);
    //  assessorAnswer
    this.answer(i).value.forEach((answer: any) => {
      answer.ansValue = answer?.answerLabel === ans?.answerLabel ? answer?.answerLabel : null;
    });
    this.cd.detectChanges();
    let isAnsFound = (this.applicantQuestionForm.get('answers') as FormArray)?.at(i)?.get('answer')?.value.find((answer: any) => answer?.ansValue == answer?.answerLabel);
    if (isAnsFound) {
      this.addClass(i);
    }
    // if(this.userMeta?.role=='assessor'){
    //   this.answer(i).at(j).get('assessorSelecedResp')?.patchValue(event.value);
    //   this.selectedData[i] = this.answer(i).value?.find((answer: any) => answer?.answerLabel == ans?.answerLabel);
    // }else if(this.userMeta?.role == 'admin'){
    //   this.answer(i).at(j).get('adminSelecedResp')?.patchValue(event.value);
    //   this.adminSelectedData[i] = this.answer(i).value?.find((answer: any) => answer?.answerLabel == ans?.answerLabel);
    // }


    this.cd.detectChanges();
  }

  checkClick(event: any, subanswer: any, i: number, j: number, applicantQuestionForm: FormGroup) {
    const formControlData = this.utilityService.changeRadioButtonEvent(event, i, j, applicantQuestionForm);
    const selectedAnswer = formControlData.value.find((ans: any) => ans?.ansValue);
    console.log(this.answer(i).value);
    console.log(((this.answer(i).at(j) as FormArray).get('subanswar') as FormArray).value);
    // Get the subanswer FormArray
    const subansArray = (this.answer(i).at(j) as FormArray).get('subanswar') as FormArray;


    console.log(subansArray);
    subansArray.controls.forEach((control: AbstractControl) => {
      const label = control.get('subAnswerLabel')?.value;
      if (selectedAnswer && label && control.value.ansValue) {
        control.patchValue({ ansValue: true });
      } else {
        control.patchValue({ ansValue: null });
      }
    });


    this.cd.detectChanges();
  }



  // chengeMark(data:any,i:number,j:number,e:any,k?:number,type?:string,indi?:number,optionIndex?:number){
  //   console.log("i: ",i," j: ",j," indi: ",indi," optionIndex: ",optionIndex);
  //   let option:any;
  //   let subans=this.answer(i).at(j) as any;
  //   console.log("subans: ",subans);
  //   if(type){
  //     console.log("In");
  //    option= (((subans.get('subanswar') as FormArray).at(j).get('grid').get(('gridValue'))) as FormArray).at(indi).get('assessorOption').value[optionIndex];

  //    let mark=option?.marks;
  //    let isMoarFound=option?.marksnotapplicable;
  //    let isFound=this.questionnarie.find((item:any)=>item._id==data?.value?.questionId);
  //    option.isSelected=!option.isSelected
  //    if(isMoarFound){
  //      data.get('isMarks').patchValue(!isMoarFound,{onlySelf: true});
  //      data.get('maxMark').patchValue(0,{onlySelf: true});
  //    }else{
  //      subans.get('score').patchValue(mark,{onlySelf: true});
  //      if(isFound){
  //        data.get('maxMark').patchValue(isFound?.maxMark,{onlySelf: true});
  //        data.get('isMarks').patchValue(isMoarFound,{onlySelf: true});
  //      }

  //    }

  //   let options= (((subans.get('subanswar') as FormArray).at(j).get('grid').get(('gridValue'))) as FormArray).at(indi).get('assessorOption').value
  //   options.forEach((item:any)=>{
  //     if(option?.id!==item.id){
  //       item.isSelected=false;
  //     }
  //   });
  //   }else{
  //     option=(subans.get('assessorOption')).value[k];
  //     let mark=option?.marks;
  //     let isMoarFound=option?.marksnotapplicable;
  //     let isFound=this.questionnarie.find((item:any)=>item._id==data?.value?.questionId);
  //     option.isSelected=!option.isSelected;
  //     if(isMoarFound){
  //       data.get('isMarks').patchValue(!isMoarFound,{onlySelf: true});
  //       data.get('maxMark').patchValue(0,{onlySelf: true});
  //     }else{
  //       subans.get('score').patchValue(mark,{onlySelf: true});
  //       if(isFound){
  //         data.get('maxMark').patchValue(isFound?.maxMark,{onlySelf: true});
  //         data.get('isMarks').patchValue(isMoarFound,{onlySelf: true});
  //       }

  //     }

  //       subans.get('assessorOption').value.forEach((item:any)=>{
  //         if(option?.id!==item.id){
  //           item.isSelected=false;
  //         }
  //       });
  //   }

  // }

  getRowNameOfGrid(data: any, control?: any): any {
    let firstObject: any = Object.values(data)[0];
    firstObject['val'] = firstObject?.val.split("-")[0] ? firstObject?.val.split("-")[0] : firstObject?.val;
    if (control?.value['questionId'] == '66adf30760984362943d5f78') {
      firstObject['val'] = '';
    }
    return firstObject;
  }

  // chengeMark(
  //   inputType:string,
  //   data: any,
  //   i: number,
  //   j: number,
  //   e: any,
  //   k?: number,
  //   type?: string,
  //   gridRowIndex?: number,
  //   optionIndex?: number
  // ): void {
  //   // console.log(data);

  //   const subans = this.answer(i).at(j) as any;
  //   if(data?.value?.questionId=='66cd5de02702eefa574c5086'){
  //     j=3;
  //    }
  //   let indexOfSubanswer:number = k?k:j;
  //   const gridValuePath = (indi: number) =>
  //     (((subans.get('subanswar') as FormArray)
  //       .at(indexOfSubanswer)
  //       .get('grid')
  //       .get('gridValue')) as FormArray)
  //       .at(indi)
  //       .get('assessorOption')
  //       .value;



  //   let option = type
  //   ? gridValuePath(gridRowIndex!)[optionIndex!]
  //   : subans.get('assessorOption').value[k!];
  //     // console.log(option);

  //   if (!option) return;

  //   let mark:number;
  //   if(inputType=='checkbox'){
  //     // console.log(Number(subans.get('score')?.value)," : ",Number(option?.marks));
  //     if(e?.checked){
  //       mark =  Number(subans.get('score')?.value)+Number(option?.marks);
  //     }else{
  //       mark =  Number(subans.get('score')?.value)-Number(option?.marks);
  //     }
  //   }else{
  //     mark= option?.marks;
  //   }
  //   const isMorkFound = option?.marksnotapplicable;
  //   const isFound = this.questionnarie.find(
  //     (item: any) => item._id === data?.value?.questionId
  //   );
  //   // console.log(isFound);

  //   // Toggle selection state
  //   option.isSelected = !option.isSelected;
  //   // console.log(data.get('isMarks')?.value,"  : ",isMorkFound);
  //   if (isMorkFound && data.get('isMarks')?.value==true) {
  //     data.get('isMarks').patchValue(!isMorkFound,{onlySelf: true});
  //     data.get('maxMark').patchValue(0,{onlySelf: true});
  //   } else {
  //     subans.get('score').patchValue(mark,{onlySelf: true});

  //     if (isFound) {
  //       data.get('maxMark').patchValue(isFound?.maxMark,{onlySelf: true});
  //       data.get('isMarks').patchValue(isMorkFound,{onlySelf: true});
  //     }
  //   }

  //   const deselectOtherOptions = (options: any[], selectedId: any) => {
  //     // console.log(selectedId);
  //     if(inputType ==='radio'){
  //       options.forEach((item: any) => {
  //         // console.log(item.id !== selectedId);
  //         if (item.id !== selectedId) {
  //           item.isSelected = false;
  //         }
  //       });
  //     }
  //     // else if(inputType ==='checkbox'){
  //     //    options.forEach((item: any) => {
  //     //     // console.log(item.id !== selectedId);
  //     //     if (item.id !== selectedId) {
  //     //       item.isSelected = false;
  //     //     }
  //     //   });
  //     // }

  //   };

  //   if (type) {
  //     const gridOptions = gridValuePath(gridRowIndex!);
  //     // console.log(gridOptions);
  //     deselectOtherOptions(gridOptions, option.id);
  //   } else {
  //     const assessorOptions = subans.get('assessorOption').value;
  //     deselectOtherOptions(assessorOptions, option.id);
  //   }
  //   // console.log(subans.get('score')?.value);
  //   // console.log(subans)
  // }



  // changeSubAnswerMark(options:any,subanswer:any,selectedValue?:any,type?:string,arrData?:any,i?:number,j?:number,k?:number,l?:number,control?:any){
  //   let isMoarFound=options?.marksnotapplicable;

  //   let isFound=this.questionnarie.find((item:any)=>item._id==control.value.questionId);

  //   if(isMoarFound){
  //     control.get('isMarks').patchValue(!isMoarFound);
  //     control.get('maxMark').patchValue(0);
  //   }else{
  //     if(isFound){
  //     control.get('isMarks').patchValue(isFound.isMarks);
  //     control.get('maxMark').patchValue(isFound?.maxMark);
  //     }

  //   }
  //     subanswer['subscore']=options?.marks;
  //   let subans=this.subanswar(i,j).at(k) as FormGroup;
  //   let option = subans.get('assessorOption').value;
  //   console.log(option);

  //  options.isSelected=!selectedValue;
  //   if(type){
  //     arrData.forEach((item:any)=>{
  //       if(options?.id!==item.id){
  //         item.isSelected=false;
  //       }
  //     })
  //   }
  // }

  chengeMark(
    inputType: string,
    data: any,
    i: number,
    j: number,
    e: any,
    k?: number,
    type?: string,
    gridRowIndex?: number,
    optionIndex?: number
  ): void {
    const subans = this.answer(i).at(j) as any;
    if (data?.value?.questionId == '66cd5de02702eefa574c5086') {
      j = 3;
    }

    let indexOfSubanswer: number = k ? k : j;

    const gridValuePath = (indi: number) =>
      (((subans.get('subanswar') as FormArray)
        .at(indexOfSubanswer)
        .get('grid')
        .get('gridValue')) as FormArray)
        .at(indi)
        .get('assessorOption')
        .value;

    let option = type
      ? gridValuePath(gridRowIndex!)[optionIndex!]
      : subans.get('assessorOption').value[k!];

    if (!option) return;

    let mark: number;
    if (inputType == 'checkbox') {
      if (e?.checked) {
        mark = Number(subans.get('score')?.value) + Number(option?.marks);
      } else {
        mark = Number(subans.get('score')?.value) - Number(option?.marks);

        // 🔹 FIX: Uncheck all child radios if parent checkbox unchecked
        if (option.subOption?.length) {
          option.subOption.forEach((child: any) => {
            child.isSelected = false;
            child.subscore = 0;
          });
        }
      }
    } else {
      mark = option?.marks;
    }

    const isMorkFound = option?.marksnotapplicable;
    const isFound = this.questionnarie.find(
      (item: any) => item._id === data?.value?.questionId
    );

    option.isSelected = !option.isSelected;

    if (isMorkFound && data.get('isMarks')?.value == true) {
      data.get('isMarks').patchValue(!isMorkFound, { onlySelf: true });
      data.get('maxMark').patchValue(0, { onlySelf: true });
    } else {
      subans.get('score').patchValue(mark, { onlySelf: true });

      if (isFound) {
        data.get('maxMark').patchValue(isFound?.maxMark, { onlySelf: true });
        data.get('isMarks').patchValue(isMorkFound, { onlySelf: true });
      }
    }

    const deselectOtherOptions = (options: any[], selectedId: any) => {
      if (inputType === 'radio') {
        options.forEach((item: any) => {
          if (item.id !== selectedId) {
            item.isSelected = false;
          }
        });
      }
    };

    if (type) {
      const gridOptions = gridValuePath(gridRowIndex!);
      deselectOtherOptions(gridOptions, option.id);
    } else {
      const assessorOptions = subans.get('assessorOption').value;
      deselectOtherOptions(assessorOptions, option.id);
    }
  }


  changeSubAnswerMark(
    options: any,
    subanswer: any,
    selectedValue?: any,
    type?: string,
    arrData?: any,
    i?: number,
    j?: number,
    k?: number,
    l?: number,
    control?: any
  ) {
    let isMoarFound = options?.marksnotapplicable;
    let isFound = this.questionnarie.find((item: any) => item._id == control.value.questionId);
    console.log(isFound);
    let subscore = isFound.answer[j]['subanswar'][k]['subscore'];
    if (isMoarFound) {
      control.get('isMarks').patchValue(!isMoarFound);
      control.get('maxMark').patchValue(0);
    } else {
      if (isFound) {
        control.get('isMarks').patchValue(isFound.isMarks);
        control.get('maxMark').patchValue(isFound?.maxMark);
      }
    }

    // assign marks by default
    subanswer['subscore'] = options?.marks;

    let subans = this.subanswar(i, j).at(k) as FormGroup;
    console.log(subans);

    let optionList = subans.get('assessorOption').value;

    // 🔹 Toggle selection
    options.isSelected = !selectedValue;

    // 🔹 If it's radio, unselect others
    if (type) {
      arrData.forEach((item: any) => {
        if (options?.id !== item.id) {
          item.isSelected = false;
        }
      });
    }

    // 🔹 If parent checkbox is unselected → unselect child radios also
    if (!options.isSelected && options.subOption?.length) {
      options.subOption.forEach((child: any) => {
        child.isSelected = false;
        child.subscore = 0; // reset score if needed
      });
    }

    // 🔹 New Fix: If all options are unselected → reset subscore
    const anySelected = optionList.some((opt: any) => opt.isSelected);
    if (!anySelected) {
      subanswer['subscore'] = subscore; // or null if you prefer
    }

    console.log("Final subanswer:", subanswer);
  }



  changeSubOptionAnswerMark(subOptions: any, options: any, selectedValue?: any, type?: string) {
    options.isSelected = !selectedValue;
    if (type) {
      // subOption
      subOptions?.forEach((item: any) => {
        console.log(item);
        if (options?.id !== item.id) {
          item.isSelected = false;

        }
      })
    }
  }

  assessorRes: any;
  adminRes: any;
  onStepInteracted(event: any): void {
    let questionId = (this.applicantQuestionForm.get('answers') as FormArray).at(event.selectedIndex).get('questionId').value;
    if (this.userMeta?.role == 'admin') {
      this.adminRes = (this.applicantQuestionForm.get('answers') as FormArray).at(event.selectedIndex)?.value.adminResp;
    } else if (this.userMeta?.role == 'assessor') {
      this.assessorRes = (this.applicantQuestionForm.get('answers') as FormArray).at(event.selectedIndex)?.value.assessorResp;
    }
    if (questionId) {
      console.log((this.applicantQuestionForm.get('answers') as FormArray).at(event.selectedIndex)?.value);
      // this.cd.detach();
      this.assessorStaticValidations(questionId, event.selectedIndex);
    }
  }



  completeAssisment(applicantId: string, assessorId: string) {
    let body: any = {
      applicant_id: applicantId,
      assigned_assessor: assessorId,
      assessorStatus: 'completed',
      message: 'Assignment completed successfully'
    };

    this.loader.showLoading();
    this.apiService.post('change-status-of-assessment', body).subscribe({
      next: (resp: any) => {
        this.loader.hideLoading();
        if (resp['status'] == 'success') {
          this.alertService.successSnackBar('Assessment completed successfully', 'OK', 'top-right');
        }
      },
      error: (err: any) => {
        this.loader.hideLoading();
      }
    })

  }


  // ==========================================================================
  // ADMIN KA BANAYA HUA TREND RULE
  //
  // Ye hardcoded blocks ki JAGAH nahi leta — unse PEHLE chalta hai. Jis
  // question pe admin ne rule banaya hai wahan naya rasta, baaki har jagah
  // purana code jaisa ka taisa. Isliye rule banaye bina kisi ka score nahi
  // hilta, aur migration ek-ek question karke, verify karte hue ho sakti hai.
  // ==========================================================================

  /** Denominator question ka applicant data — baar-baar API na maare. */
  private denominatorCache: { [questionId: string]: any } = {};

  /**
   * @returns true agar authored rule chal gaya (to purana code skip ho jaye)
   */
  private applyAuthoredTrendRules(questionId: string, questionIndex: number): boolean {
    const answers = this.applicantQuestionForm.get('answers') as FormArray;
    const question = answers?.at(questionIndex);
    if (!question) return false;

    const subanswar = (question.get('answer') as FormArray)?.at(0)?.get('subanswar') as FormArray;
    if (!subanswar || !subanswar.length) return false;

    let ranAny = false;

    for (let j = 0; j < subanswar.length; j += 1) {
      const sub: any = subanswar.at(j);
      const rule = sub?.get('trendRule')?.value;
      if (!rule || !rule.numerator || !rule.denominator?.questionId) continue;

      const denQid = String(rule.denominator.questionId);
      const denData = this.denominatorCache[denQid];

      if (denData === undefined) {
        // Pehli baar — data mangao aur aane pe dobara chala do.
        this.fetchDenominatorQuestion(denQid, () => {
          this.assessorStaticValidations(questionId, questionIndex);
        });
        // Data aane tak purana code bhi mat chalao, warna ek hi cheez do baar
        // patch hogi aur aakhri jeetega — jo confusing hai.
        return true;
      }

      const numGrid = this.gridRowsOf(sub);
      const denGrid = this.gridRowsOfResponse(denData);
      const out = evaluateTrendRule(rule, numGrid, denGrid);

      this.patchTrendResult(sub, rule, out);
      ranAny = true;
    }

    return ranAny;
  }

  /** Ek sub-answer ke grid ki rows (jo bhi shape me padi ho). */
  private gridRowsOf(sub: any): any[] {
    const g = sub?.get('grid');
    const rows = g?.get('gridValue');
    if (rows?.controls?.length) return rows.controls.map((c: any) => c.value);
    if (Array.isArray(rows?.value)) return rows.value;
    if (Array.isArray(sub?.value?.grid?.gridValue)) return sub.value.grid.gridValue;
    return [];
  }

  /**
   * Denominator question ke response se grid rows.
   *
   * Purana code jaisa hi rasta: role ke hisaab se admin -> assessor -> answer.
   * Ek hi jagah rakha hai taaki dono jagah alag na ho jaye.
   */
  private gridRowsOfResponse(data: any): any[] {
    if (!data) return [];
    let subs: any[] = [];
    if (this.userMeta?.role === 'admin') {
      subs = (data.isAdminChecked ? data.adminResp?.[0]?.subanswar : data.assessorResp?.[0]?.subanswar) || [];
    } else if (this.userMeta?.role === 'assessor') {
      subs = (data.isAssessorChecked ? data.assessorResp?.[0]?.subanswar : data.answer?.[0]?.subanswar) || [];
    } else {
      subs = data.answer?.[0]?.subanswar || [];
    }
    const idx = Number.isInteger(subs?.length) && subs.length > 0 ? 0 : -1;
    if (idx < 0) return [];
    return subs[0]?.grid?.gridValue || [];
  }

  /** Rule ka nateeja grid row pe assessorOption ki tarah lagao. */
  private patchTrendResult(sub: any, rule: any, out: any): void {
    const rows = sub?.get('grid')?.get('gridValue') as FormArray;
    // Jis row ka data padha, zaroori nahi ki option usi row pe dikhe. Purane
    // code me energy row 7 padhta hai par option row 1 pe lagata hai.
    const target = (rule.targetRow === undefined || rule.targetRow === null)
      ? rule.numerator.row : rule.targetRow;
    const row = rows?.at?.(target);
    if (!row) return;

    if (out.skipped || !out.band) {
      // Data adhoora — kuch select mat karo. Purana code yahan bhi kabhi-kabhi
      // chup-chaap purana selection chhod deta tha; hum saaf karte hain.
      row.get('assessorOption')?.patchValue([]);
      row.get('assessorOptionType')?.patchValue('');
      if (out.warnings?.length) {
        console.warn('[trend rule] skipped:', out.warnings.join(' | '));
      }
      return;
    }

    row.get('assessorOption')?.patchValue([{
      option: out.band.option,
      isSelected: true,
      marksnotapplicable: false,
      marks: Number(out.band.marks),
      // Admin ne override allow nahi kiya to assessor badal na sake.
      disabled: !rule.allowOverride,
      id: `trend-${rule.numerator.row}-${String(out.band.option).replace(/\s+/g, '-')}`,
    }]);
    row.get('assessorOptionType')?.patchValue('radio');
  }

  /** Denominator question ka applicant data laao, phir callback chalao. */
  private fetchDenominatorQuestion(questionId: string, done: () => void): void {
    this.denominatorCache[questionId] = null;   // "maang liya hai" ka nishaan
    const userId = this.applicantId ? this.applicantId : this.userMeta?._id;
    this.apiService.post('get-particular-question', { questionId, applicant_id: userId }).subscribe({
      next: (resp: any) => {
        this.denominatorCache[questionId] = resp?.status === 'success' ? resp.data : null;
        done();
      },
      error: () => { this.denominatorCache[questionId] = null; done(); },
    });
  }

  assessorStaticValidations(questionId: string, questionIndex: number): any {
    // Admin ka banaya rule pehle. Mila to purana hardcoded rasta chalta hi nahi.
    if (this.applyAuthoredTrendRules(questionId, questionIndex)) return;

    if (questionId === '682c1eb8485482741b9ce7d3') {
      //Percentage = score
      let question = (this.applicantQuestionForm.get('answers') as FormArray).at(questionIndex);
      let subanswar = (question.get('answer') as FormArray).at(0).get('subanswar') as FormArray;
      let mark = subanswar.at(0).get('numericTypeVal') as FormControl;
      subanswar.at(0).get('subscore').patchValue(Number(mark.value));
      console.log((this.applicantQuestionForm.get('answers') as FormArray).at(questionIndex).value);

    } else if (questionId === '682c253c485482741b9ce8ae') {
      let question = (this.applicantQuestionForm.get('answers') as FormArray).at(questionIndex);
      console.log(question.value);
      let subanswar = (question.get('answer') as FormArray).at(0).get('subanswar') as FormArray;
      let grid = subanswar.at(0).get('grid') as FormControl;
      let gridValue = (grid.get('gridValue') as FormArray);
      let one = gridValue.at(1).get('11') as FormControl;
      let two = gridValue.at(2).get('21') as FormControl;
      let three = gridValue.at(3).get('31') as FormControl;
      let four = gridValue.at(4).get('41') as FormControl;

      let oneVal = Number(one.value?.val);
      let twoVal = Number(two.value?.val);
      let threeVal = Number(three.value?.val);
      let fourVal = Number(four.value?.val);
      let mark: number = 0;
      if (oneVal >= 80) {
        mark += 25;
      } else if (oneVal >= 50 && oneVal <= 79) {
        mark += 15;
      } else if (oneVal >= 20 && oneVal <= 49) {
        mark += 5;
      } else if (oneVal >= 0 && oneVal <= 20) {
        mark += 0;
      }

      if (twoVal >= 80) {
        mark += 25;
      } else if (twoVal >= 50 && twoVal <= 79) {
        mark += 15;
      } else if (twoVal >= 20 && twoVal <= 49) {
        mark += 5;
      } else if (twoVal >= 0 && twoVal <= 20) {
        mark += 0;
      }

      if (threeVal >= 80) {
        mark += 25;
      } else if (threeVal >= 50 && threeVal <= 79) {
        mark += 15;
      } else if (threeVal >= 20 && threeVal <= 49) {
        mark += 5;
      } else if (threeVal >= 0 && threeVal <= 20) {
        mark += 0;
      }

      if (fourVal >= 80) {
        mark += 25;
      } else if (fourVal >= 50 && fourVal <= 79) {
        mark += 15;
      } else if (fourVal >= 20 && fourVal <= 49) {
        mark += 5;
      } else if (fourVal >= 0 && fourVal <= 20) {
        mark += 0;
      }

      (question.get('answer') as FormArray).at(0).get('score').patchValue(mark);
      console.log(mark);
    }
    else if (questionId == '682c347f485482741b9ce913') {  //Decarbonization 7
      let question = (this.applicantQuestionForm.get('answers') as FormArray).at(questionIndex);
      let subanswar = (question.get('answer') as FormArray).at(0).get('subanswar') as FormArray;
      if (this.generalQuestion25['isQuestionValid']) {
        let firstYear2: any;
        let secondYear2: any;
        let thirdYear2: any;
        //  let productionQuestion =  (this.applicantQuestionForm.get('answers') as FormArray).at(productionQuestionIndex);
        let subanswar1: any[] = [];
        if (this.userMeta?.role == 'admin') {
          if (!this.generalQuestion25?.isAdminChecked) {
            subanswar1 = (this.generalQuestion25?.assessorResp)[0]?.subanswar;
          } else {
            subanswar1 = (this.generalQuestion25?.adminResp)[0]?.subanswar;
          }
        } else if (this.userMeta?.role == 'assessor') {
          if (!this.generalQuestion25?.isAssessorChecked) {
            subanswar1 = (this.generalQuestion25?.answer)[0]?.subanswar;
          } else {
            subanswar1 = (this.generalQuestion25?.assessorResp)[0]?.subanswar;
          }
        }
        let gridGeneral = subanswar1[0]?.grid;
        let gridValueGeneral = (gridGeneral?.gridValue);
        console.log("this.generalQuestion25:  ", gridValueGeneral);

        firstYear2 = gridValueGeneral[1]['11']['val'] ? gridValueGeneral[1]['11']['val'] : gridValueGeneral[4]['41']['val'];
        secondYear2 = gridValueGeneral[1]['12']['val'] ? gridValueGeneral[1]['12']['val'] : gridValueGeneral[4]['42']['val'];
        thirdYear2 = gridValueGeneral[1]['13']['val'] ? gridValueGeneral[1]['13']['val'] : gridValueGeneral[4]['43']['val'];

        let grid = subanswar.at(0).get('grid') as FormControl;
        let gridValue = (grid.get('gridValue') as FormArray);
        subanswar.at(0).get('subscore')?.patchValue(0);
        subanswar.at(1).get('assessorOption')?.patchValue([]);

        gridValue.at(1).get('assessorOption')?.patchValue([]);
        gridValue.at(1).get('assessorOptionType')?.patchValue('');

        gridValue.at(2).get('assessorOption')?.patchValue([]);
        gridValue.at(2).get('assessorOptionType')?.patchValue('');

        gridValue.at(3).get('assessorOption')?.patchValue([]);
        gridValue.at(3).get('assessorOptionType')?.patchValue('');

        gridValue.at(4).get('assessorOption')?.patchValue([]);
        gridValue.at(4).get('assessorOptionType')?.patchValue('');

        gridValue.at(5).get('assessorOption')?.patchValue([]);
        gridValue.at(5).get('assessorOptionType')?.patchValue('');

        gridValue.at(6).get('assessorOption')?.patchValue([]);
        gridValue.at(6).get('assessorOptionType')?.patchValue('');

        gridValue.at(7).get('assessorOption')?.patchValue([]);
        gridValue.at(7).get('assessorOptionType')?.patchValue('');
        console.log('firstYear2: ', firstYear2, " secondYear2: ", secondYear2, " thirdYear': ", thirdYear2);
        console.log(gridValue.value);
        let scope2021 = this.safeDivide(Number(gridValue.at(1).get('12').value?.val)
          || Number(gridValue.at(1).get('13').value?.val), firstYear2);
        let scope2022 = this.safeDivide(Number(gridValue.at(1).get('13').value?.val), secondYear2);
        let scope2023 = this.safeDivide(Number(gridValue.at(1).get('14').value?.val), thirdYear2);

        let financialYearData = 0;
        let val1 = Number(gridValue.at(1).get('12').value?.val);
        let val2 = Number(gridValue.at(1).get('13').value?.val);
        console.log(val1, " : ", val2);
        if (val1) {
          financialYearData = this.safeDivide(val1, firstYear2);
        } else if (val2) {
          financialYearData = this.safeDivide(val2, secondYear2);
        }

        console.log(financialYearData);
        if ((scope2021 || scope2022) && scope2023) {
          let getPercentage = ((scope2023 - financialYearData) / financialYearData) * 100;
          let incSelection: boolean = ((Number(getPercentage) > 5) && (Number(getPercentage)) > 0);
          let flatSelection: boolean = (Number(getPercentage) > (-5) && Number(getPercentage) < 5);
          let mainMark: number = 0;
          console.log("getPercentage: ", getPercentage);
          let decSelection: boolean = Number(getPercentage) < (-5) && (Number(getPercentage)) < 0;
          if (incSelection) {
            mainMark += 0;
          } else if (flatSelection) {
            mainMark += 10;
          } else if (decSelection) {
            mainMark += 20;
          }

          // console.log(subanswar?.value);
          let assessorOptions1 = [
            {
              "option": "Increasing trend",
              "isSelected": incSelection ? true : false,
              "marksnotapplicable": false,
              "marks": 0,
              "disabled": true,
              "id": 173553922982344
            }];
          let assessorOptions11 = [
            {
              "option": "Flat trend",
              "isSelected": flatSelection,
              "marksnotapplicable": false,
              "marks": 10,
              "disabled": true,
              "id": 173553923025697   //
            }];
          let assessorOptions12 = [
            {
              "option": "Decreasing trend",
              "isSelected": decSelection,
              "marksnotapplicable": false,
              "marks": 20,
              "disabled": true,
              "id": 173563909230256
            }
          ];

          if (incSelection) {
            // subanswar.at(0).get('assessorGuidence').patchValue('Increasing trend');
            gridValue.at(1).get('assessorOption')?.patchValue(assessorOptions1);
            gridValue.at(1).get('assessorOptionType')?.patchValue('radio');
          } else if (flatSelection) {
            gridValue.at(1).get('assessorOption')?.patchValue(assessorOptions11);
            gridValue.at(1).get('assessorOptionType')?.patchValue('radio');
          } else if (decSelection) {
            gridValue.at(1).get('assessorOption')?.patchValue(assessorOptions12);
            gridValue.at(1).get('assessorOptionType')?.patchValue('radio');
          }

        }



        // gridValue.at(1).get('assessorOption').patchValue([]);
        // gridValue.at(1).get('assessorOptionType').patchValue('');


        //SOx

        let sox2021 = (Number(gridValue.at(2).get('22').value?.val) ? Number(gridValue.at(2).get('22').value?.val) : Number(gridValue.at(2).get('23').value?.val)) / firstYear2;
        let sox2022 = (Number(gridValue.at(2).get('23').value?.val) / secondYear2);
        let sox2023 = (Number(gridValue.at(2).get('24').value?.val) / thirdYear2);

        let financialYearData1 = 0;
        let val3 = Number(gridValue.at(2).get('22').value?.val);
        let val4 = Number(gridValue.at(2).get('23').value?.val);
        console.log(val3, " : ", val4);
        if (val3) {
          financialYearData1 = this.safeDivide(val3, firstYear2);
        } else if (val4) {
          financialYearData1 = this.safeDivide(val4, secondYear2);
        }


        let mainMark: number = 0;
        if ((sox2021 || sox2022) && sox2023) {
          let getPercentage1 = ((sox2023 - financialYearData1) / financialYearData1) * 100;
          let incSelection1: boolean = ((Number(getPercentage1) > 5) && (Number(getPercentage1)) > 0);
          let flatSelection1: boolean = (Number(getPercentage1) > (-5) && Number(getPercentage1) < 5);
          // let flatSelection1:boolean = (Number(getPercentage1) ==5);
          console.log("getPercentage:2 ", getPercentage1);

          let decSelection1: boolean = Number(getPercentage1) < (-5) && (Number(getPercentage1)) < 0;
          if (incSelection1) {
            mainMark += 0;
          } else if (flatSelection1) {
            mainMark += 10;
          } else if (decSelection1) {
            mainMark += 20;
          }
          let assessorOptions2 = [
            {
              "option": "Increasing trend",
              "isSelected": incSelection1 ? true : false,
              "marksnotapplicable": false,
              "marks": 0,
              "disabled": true,
              "id": 173553922679823
            }];
          let assessorOptions21 = [

            {
              "option": "Flat trend",
              "isSelected": flatSelection1,
              "marksnotapplicable": false,
              "marks": 10,
              "disabled": true,
              "id": 173553923340256   //
            }];
          let assessorOptions22 = [
            {
              "option": "Decreasing trend",
              "isSelected": decSelection1,
              "marksnotapplicable": false,
              "marks": 20,
              "disabled": true,
              "id": 173563219230256
            }
          ];

          if (incSelection1) {
            // subanswar.at(0).get('assessorGuidence').patchValue('Increasing trend');
            gridValue.at(2).get('assessorOption')?.patchValue(assessorOptions2);
            gridValue.at(2).get('assessorOptionType')?.patchValue('radio');
          } else if (flatSelection1) {
            gridValue.at(2).get('assessorOption')?.patchValue(assessorOptions21);
            gridValue.at(2).get('assessorOptionType')?.patchValue('radio');
          } else if (decSelection1) {
            gridValue.at(2).get('assessorOption')?.patchValue(assessorOptions22);
            gridValue.at(2).get('assessorOptionType')?.patchValue('radio');
          }

        }


        // gridValue.at(2).get('assessorOption').patchValue([]);
        // gridValue.at(2).get('assessorOptionType').patchValue('');

        //pm10

        let pm102021 = (Number(gridValue.at(3).get('32').value?.val) ? Number(gridValue.at(3).get('32').value?.val) : Number(gridValue.at(3).get('33').value?.val)) / firstYear2;
        let pm102022 = (Number(gridValue.at(3).get('33').value?.val) / secondYear2);
        let pm102023 = (Number(gridValue.at(3).get('34').value?.val) / thirdYear2);

        let financialYearData2 = 0;
        let val5 = Number(gridValue.at(3).get('32').value?.val)
        let val6 = Number(gridValue.at(3).get('33').value?.val)
        console.log(val5, " : ", val6);
        if (val5) {
          financialYearData2 = this.safeDivide(val5, firstYear2);
        } else if (val6) {
          financialYearData2 = this.safeDivide(val6, secondYear2);
        }


        if ((pm102021 || pm102022) && pm102023) {
          let getPercentage2 = ((pm102023 - financialYearData2) / financialYearData2) * 100;
          let incSelection2: boolean = ((Number(getPercentage2) > 5) && (Number(getPercentage2)) > 0);
          let flatSelection2: boolean = (Number(getPercentage2) > (-5) && Number(getPercentage2) < 5);
          // let flatSelection2:boolean = (Number(getPercentage2) ==5);
          console.log("getPercentage:3 ", getPercentage2);

          let decSelection2: boolean = Number(getPercentage2) < (-5) && (Number(getPercentage2)) < 0;
          if (incSelection2) {
            mainMark += 0;
          } else if (flatSelection2) {
            mainMark += 10;
          } else if (decSelection2) {
            mainMark += 20;
          }
          let assessorOptions3 = [
            {
              "option": "Increasing trend",
              "isSelected": incSelection2 ? true : false,
              "marksnotapplicable": false,
              "marks": 0,
              "disabled": true,
              "id": 173553923229823
            }];
          let assessorOptions31 = [
            {
              "option": "Flat trend",
              "isSelected": flatSelection2,
              "marksnotapplicable": false,
              "marks": 10,
              "disabled": true,
              "id": 173553954230256   //
            }];
          let assessorOptions32 = [
            {
              "option": "Decreasing trend",
              "isSelected": decSelection2,
              "marksnotapplicable": false,
              "marks": 20,
              "disabled": true,
              "id": 173563989230256
            }
          ];

          if (incSelection2) {
            // subanswar.at(0).get('assessorGuidence').patchValue('Increasing trend');
            gridValue.at(3).get('assessorOption')?.patchValue(assessorOptions3);
            gridValue.at(3).get('assessorOptionType')?.patchValue('radio');
          } else if (flatSelection2) {
            gridValue.at(3).get('assessorOption')?.patchValue(assessorOptions31);
            gridValue.at(3).get('assessorOptionType')?.patchValue('radio');
          } else if (decSelection2) {
            gridValue.at(3).get('assessorOption')?.patchValue(assessorOptions32);
            gridValue.at(3).get('assessorOptionType')?.patchValue('radio');
          }

        }


        //  gridValue.at(3).get('assessorOption').patchValue([]);
        //  gridValue.at(3).get('assessorOptionType').patchValue('');

        //pm2.5

        let pm22021 = (Number(gridValue.at(4).get('42').value?.val) ? Number(gridValue.at(4).get('42').value?.val) : Number(gridValue.at(4).get('43').value?.val)) / firstYear2;
        let pm22022 = (Number(gridValue.at(4).get('43').value?.val) / secondYear2);
        let pm22023 = Number(gridValue.at(4).get('44').value?.val) / thirdYear2;

        let financialYearData3 = 0;
        let val7 = Number(gridValue.at(4).get('42').value?.val);
        let val8 = Number(gridValue.at(4).get('43').value?.val);
        console.log(val7, " : ", val8);
        if (val7) {
          financialYearData3 = this.safeDivide(val7, firstYear2);
        } else if (val8) {
          financialYearData3 = this.safeDivide(val8, secondYear2);
        }

        if ((pm22021 || pm22022) && pm22023) {
          let getPercentage3 = ((pm22023 - financialYearData3) / financialYearData3) * 100;
          let incSelection3: boolean = ((Number(getPercentage3) > 5) && (Number(getPercentage3)) > 0);
          let flatSelection3: boolean = (Number(getPercentage3) > (-5) && Number(getPercentage3) < 5);
          // let flatSelection3:boolean = (Number(getPercentage3) ==5);
          let decSelection3: boolean = Number(getPercentage3) < (-5) && (Number(getPercentage3)) < 0;
          if (incSelection3) {
            mainMark += 0;
          } else if (flatSelection3) {
            mainMark += 10;
          } else if (decSelection3) {
            mainMark += 20;
          }
          let assessorOptions4 = [
            {
              "option": "Increasing trend",
              "isSelected": incSelection3 ? true : false,
              "marksnotapplicable": false,
              "marks": 0,
              "disabled": true,
              "id": 173553925729823
            }];
          let assessorOptions41 = [
            {
              "option": "Flat trend",
              "isSelected": flatSelection3,
              "marksnotapplicable": false,
              "marks": 10,
              "disabled": true,
              "id": 173553923340256   //
            }];
          let assessorOptions42 = [
            {
              "option": "3. Decreasing trend",
              "isSelected": decSelection3,
              "marksnotapplicable": false,
              "marks": 10,
              "disabled": true,
              "id": 173512639230256
            }
          ];

          if (incSelection3) {
            // subanswar.at(0).get('assessorGuidence').patchValue('Increasing trend');
            gridValue.at(4).get('assessorOption')?.patchValue(assessorOptions4);
            gridValue.at(4).get('assessorOptionType')?.patchValue('radio');
          } else if (flatSelection3) {
            gridValue.at(4).get('assessorOption')?.patchValue(assessorOptions41);
            gridValue.at(4).get('assessorOptionType')?.patchValue('radio');
          } else if (decSelection3) {
            gridValue.at(4).get('assessorOption')?.patchValue(assessorOptions42);
            gridValue.at(4).get('assessorOptionType')?.patchValue('radio');
          }

        }



        //  gridValue.at(4).get('assessorOption').patchValue([]);
        //  gridValue.at(4).get('assessorOptionType').patchValue('');



        //pollutants

        let pollutants2021 = (Number(gridValue.at(5).get('52').value?.val) ? Number(gridValue.at(5).get('52').value?.val) : Number(gridValue.at(5).get('53').value?.val)) / firstYear2;
        let pollutants2022 = Number(gridValue.at(5).get('53').value?.val) / secondYear2;
        let pollutants2023 = Number(gridValue.at(5).get('54').value?.val) / thirdYear2;

        let financialYearData4 = 0;
        let val9 = Number(gridValue.at(5).get('52').value?.val);
        let val10 = Number(gridValue.at(5).get('53').value?.val);
        console.log(val9, " : ", val10);
        if (val9) {
          financialYearData4 = this.safeDivide(val9, firstYear2);
        } else if (val10) {
          financialYearData4 = this.safeDivide(val10, secondYear2);
        }

        if ((pollutants2021 || pollutants2022) && (pollutants2023)) {
          let getPercentage4 = ((pollutants2023 - financialYearData4) / financialYearData4) * 100;
          let incSelection4: boolean = ((Number(getPercentage4) > 5) && (Number(getPercentage4)) > 0);
          let flatSelection4: boolean = (Number(getPercentage4) > (-5) && Number(getPercentage4) < 5);
          // let flatSelection4:boolean = (Number(getPercentage4) ==5);

          let decSelection4: boolean = Number(getPercentage4) < (-5) && (Number(getPercentage4)) < 0;
          if (incSelection4) {
            mainMark += 0;
          } else if (flatSelection4) {
            mainMark += 5;
          } else if (decSelection4) {
            mainMark += 10;
          }
          let assessorOptions5 = [
            {
              "option": "Increasing trend",
              "isSelected": incSelection4 ? true : false,
              "marksnotapplicable": false,
              "marks": 0,
              "disabled": true,
              "id": 173553922729823
            }];
          let assessorOptions51 = [
            {
              "option": "Flat trend",
              "isSelected": flatSelection4,
              "marksnotapplicable": false,
              "marks": 5,
              "disabled": true,
              "id": 173553249230256   //
            }];
          let assessorOptions52 = [
            {
              "option": "Decreasing trend",
              "isSelected": decSelection4,
              "marksnotapplicable": false,
              "marks": 10,
              "disabled": true,
              "id": 173563923025663
            }
          ];

          if (incSelection4) {
            // subanswar.at(0).get('assessorGuidence').patchValue('Increasing trend');
            gridValue.at(5).get('assessorOption')?.patchValue(assessorOptions5);
            gridValue.at(5).get('assessorOptionType')?.patchValue('radio');
          } else if (flatSelection4) {
            gridValue.at(5).get('assessorOption')?.patchValue(assessorOptions51);
            gridValue.at(5).get('assessorOptionType')?.patchValue('radio');
          } else if (decSelection4) {
            gridValue.at(5).get('assessorOption')?.patchValue(assessorOptions52);
            gridValue.at(5).get('assessorOptionType')?.patchValue('radio');
          }

        }



        //  gridValue.at(5).get('assessorOption').patchValue([]);
        //  gridValue.at(5).get('assessorOptionType').patchValue('');


        console.log(gridValue);
        //Components

        let components2021 = (Number(gridValue.at(6).get('62').value?.val) ? Number(gridValue.at(6).get('62').value?.val) : Number(gridValue.at(6).get('63').value?.val)) / firstYear2;
        let components2022 = (Number(gridValue.at(6).get('63').value?.val) / secondYear2);
        let components2023 = (Number(gridValue.at(6).get('64').value?.val) / thirdYear2);

        let financialYearData5 = 0;
        let val11 = Number(gridValue.at(6).get('62').value?.val);
        let val12 = Number(gridValue.at(6).get('63').value?.val);
        console.log(val11, " : ", val12);
        if (val11) {
          financialYearData5 = this.safeDivide(val11, firstYear2);
        } else if (val12) {
          financialYearData5 = this.safeDivide(val12, secondYear2);
        }

        if ((components2021 || components2022) && (components2023)) {
          let getPercentage5 = ((components2023 - financialYearData5) / financialYearData5) * 100;
          let incSelection5: boolean = ((Number(getPercentage5) > 5) && (Number(getPercentage5)) > 0);
          let flatSelection5: boolean = (Number(getPercentage5) > (-5) && Number(getPercentage5) < 5);
          // let flatSelection5:boolean = (Number(getPercentage5) ==5);

          let decSelection5: boolean = Number(getPercentage5) < (-5) && (Number(getPercentage5)) < 0;
          if (incSelection5) {
            mainMark += 0;
          } else if (flatSelection5) {
            mainMark += 5;
          } else if (decSelection5) {
            mainMark += 10;
          }
          let assessorOptions6 = [
            {
              "option": "Increasing trend",
              "isSelected": incSelection5 ? true : false,
              "marksnotapplicable": false,
              "marks": 0,
              "disabled": true,
              "id": 173552439229823
            }];
          let assessorOptions61 = [
            {
              "option": "Flat trend",
              "isSelected": flatSelection5,
              "marksnotapplicable": false,
              "marks": 5,
              "disabled": true,
              "id": 173553923670256   //
            }];
          let assessorOptions62 = [
            {
              "option": "Decreasing trend",
              "isSelected": decSelection5,
              "marksnotapplicable": false,
              "marks": 10,
              "disabled": true,
              "id": 173525639230256
            }
          ];

          if (incSelection5) {
            // subanswar.at(0).get('assessorGuidence').patchValue('Increasing trend');
            gridValue.at(6).get('assessorOption')?.patchValue(assessorOptions6);
            gridValue.at(6).get('assessorOptionType')?.patchValue('radio');
          } else if (flatSelection5) {
            gridValue.at(6).get('assessorOption')?.patchValue(assessorOptions61);
            gridValue.at(6).get('assessorOptionType')?.patchValue('radio');
          } else if (decSelection5) {
            gridValue.at(6).get('assessorOption')?.patchValue(assessorOptions62);
            gridValue.at(6).get('assessorOptionType')?.patchValue('radio');
          }

        }




        //  gridValue.at(6).get('assessorOption').patchValue([]);
        //  gridValue.at(6).get('assessorOptionType').patchValue('');



        //hap

        let hap2021 = (Number(gridValue.at(7).get('72').value?.val) ? Number(gridValue.at(7).get('72').value?.val) : Number(gridValue.at(7).get('73').value?.val)) / firstYear2;
        let hap2022 = Number(gridValue.at(7).get('73').value?.val) / secondYear2;
        let hap2023 = Number(gridValue.at(7).get('74').value?.val) / thirdYear2;

        let financialYearData6 = 0;
        let val13 = Number(gridValue.at(7).get('72').value?.val);
        let val14 = Number(gridValue.at(7).get('73').value?.val);
        console.log(val13, " : ", val14);
        if (val13) {
          financialYearData6 = this.safeDivide(val13, firstYear2);
        } else if (val14) {
          financialYearData6 = this.safeDivide(val14, secondYear2);
        }

        if ((hap2021 || hap2022) && hap2023) {
          let getPercentage6 = ((hap2023 - financialYearData6) / financialYearData6) * 100;
          let incSelection6: boolean = ((Number(getPercentage6) > 5) && (Number(getPercentage6)) > 0);
          let flatSelection6: boolean = (Number(getPercentage6) > (-5) && Number(getPercentage6) < 5);
          // let flatSelection6:boolean = (Number(getPercentage6) ==5);

          let decSelection6: boolean = Number(getPercentage6) < (-5) && (Number(getPercentage6)) < 0;
          if (incSelection6) {
            mainMark += 0;
          } else if (flatSelection6) {
            mainMark += 5;
          } else if (decSelection6) {
            mainMark += 10;
          }
          let assessorOptions7 = [
            {
              "option": "Increasing trend",
              "isSelected": incSelection6 ? true : false,
              "marksnotapplicable": false,
              "marks": 0,
              "disabled": true,
              "id": 173355539229823
            }];
          let assessorOptions71 = [
            {
              "option": "Flat trend",
              "isSelected": flatSelection6,
              "marksnotapplicable": false,
              "marks": 5,
              "disabled": true,
              "id": 173553923630256   //
            }];
          let assessorOptions72 = [
            {
              "option": "Decreasing trend",
              "isSelected": decSelection6,
              "marksnotapplicable": false,
              "marks": 10,
              "disabled": true,
              "id": 173563923260256
            }
          ];


          if (incSelection6) {
            // subanswar.at(0).get('assessorGuidence').patchValue('Increasing trend');
            gridValue.at(7).get('assessorOption')?.patchValue(assessorOptions7);
            gridValue.at(7).get('assessorOptionType')?.patchValue('radio');
          } else if (flatSelection6) {
            gridValue.at(7).get('assessorOption')?.patchValue(assessorOptions71);
            gridValue.at(7).get('assessorOptionType')?.patchValue('radio');
          } else if (decSelection6) {
            gridValue.at(7).get('assessorOption')?.patchValue(assessorOptions72);
            gridValue.at(7).get('assessorOptionType')?.patchValue('radio');
          }




          //  gridValue.at(7).get('assessorOption').patchValue([]);
          //  gridValue.at(7).get('assessorOptionType').patchValue('');
          //  console.log(mainMark);
          //  let subans = ((this.applicantQuestionForm.get('answers') as FormArray).at(questionIndex).get('answer') as FormArray).at(0).get('score');
          //  subans.patchValue(mainMark);
          //  (question.get('answer') as FormArray).at(0).get('assessorOption').patchValue([]);
          //  console.log(((this.applicantQuestionForm.get('answers') as FormArray).at(questionIndex)?.value));

        }

        subanswar.at(0).get('subscore')?.patchValue(mainMark);
        console.log(((this.applicantQuestionForm.get('answers') as FormArray).at(questionIndex)?.value));


      } else {
        let option = (question.get('answer') as FormArray)
        subanswar.at(0).get('subscore')?.patchValue(0);
        option.get('score')?.patchValue(0);
      }

      console.log(subanswar.value);
      console.log(question.value);

    }
    else if (questionId == '682c45b9485482741b9ce9cd') {  //Decorbonization Qn. 10
      let question = (this.applicantQuestionForm.get('answers') as FormArray).at(questionIndex);
      let subanswar = (question.get('answer') as FormArray).at(0).get('subanswar') as FormArray;

      let firstYear2: any;
      let secondYear2: any;
      let thirdYear2: any;

      if (this.generalQuestion25['isQuestionValid']) {
        //  let productionQuestion =  (this.applicantQuestionForm.get('answers') as FormArray).at(productionQuestionIndex);
        let subanswar1: any[] = [];
        if (this.userMeta?.role == 'admin') {
          if (!this.generalQuestion25?.isAdminChecked) {
            subanswar1 = (this.generalQuestion25?.assessorResp)[0]?.subanswar;
          } else {
            subanswar1 = (this.generalQuestion25?.adminResp)[0]?.subanswar;
          }
        } else if (this.userMeta?.role == 'assessor') {
          if (!this.generalQuestion25?.isAssessorChecked) {
            subanswar1 = (this.generalQuestion25?.answer)[0]?.subanswar;
          } else {
            subanswar1 = (this.generalQuestion25?.assessorResp)[0]?.subanswar;
          }
        }

        let gridGeneral = subanswar1[0]?.grid;
        let gridValueGeneral = (gridGeneral?.gridValue);

        //   firstYear2 = gridValueGeneral[2]['22']['val']?gridValueGeneral[2]['22']['val']:gridValueGeneral[1]['12']['val'];
        // secondYear2 = gridValueGeneral[2]['23']['val']?gridValueGeneral[2]['23']['val']:gridValueGeneral[1]['13']['val'];
        // thirdYear2 = gridValueGeneral[2]['24']['val']?gridValueGeneral[2]['24']['val']:gridValueGeneral[1]['14']['val'];
        // console.log(gridValueGeneral);
        firstYear2 = gridValueGeneral[1]['11']['val'] ? gridValueGeneral[1]['11']['val'] : gridValueGeneral[4]['41']['val'];
        secondYear2 = gridValueGeneral[1]['12']['val'] ? gridValueGeneral[1]['12']['val'] : gridValueGeneral[4]['42']['val'];
        thirdYear2 = gridValueGeneral[1]['13']['val'] ? gridValueGeneral[1]['13']['val'] : gridValueGeneral[4]['43']['val'];

        let grid = subanswar.at(0).get('grid') as FormControl;
        let gridValue = (grid.get('gridValue') as FormArray);

        let scope2021 = (Number(gridValue.at(7).get('72').value?.val) ? Number(gridValue.at(7).get('72').value?.val) : Number(gridValue.at(7).get('73').value?.val)) / firstYear2;
        let scope2022 = (Number(gridValue.at(7).get('73').value?.val) / secondYear2);
        let scope2023 = (Number(gridValue.at(7).get('74').value?.val) / thirdYear2);


        let financialYearData6 = 0;
        let val13 = Number(gridValue.at(7).get('72').value?.val);
        let val14 = Number(gridValue.at(7).get('74').value?.val);
        console.log(val13, " : ", val14);
        if (val13) {
          financialYearData6 = this.safeDivide(val13, firstYear2);
        } else if (val14) {
          financialYearData6 = this.safeDivide(val14, secondYear2);
        }

        let getPercentage = ((scope2023 - financialYearData6) / financialYearData6) * 100;
        let incSelection: boolean = ((Number(getPercentage) > 5) && (Number(getPercentage)) > 0);
        let flatSelection: boolean = (Number(getPercentage) > (-5) && Number(getPercentage) < 5);
        // let flatSelection:boolean = (Number(getPercentage) ==5);

        let decSelection: boolean = Number(getPercentage) < (-5) && (Number(getPercentage)) < 0;
        console.log(incSelection, " : ", flatSelection, " : ", decSelection);
        console.log(scope2022, " : ", scope2021, " : ", scope2023);
        if ((scope2022 || scope2021) && scope2023) {
          let mainMark: number = 0;
          if (incSelection) {
            mainMark += 0;
          } else if (flatSelection) {
            mainMark += 40;
          } else if (decSelection) {
            mainMark += 80;
          }
          let assessorOptions1 = [
            {
              "option": "Increasing trend",
              "isSelected": incSelection ? true : false,
              "marksnotapplicable": false,
              "marks": 0,
              "id": 173553922982332
            }];
          let assessorOptions11 = [

            {
              "option": "Flat trend",
              "isSelected": flatSelection,
              "marksnotapplicable": false,
              "marks": 40,
              "id": 173553924530256   //
            }];
          let assessorOptions12 = [
            {
              "option": "Decreasing trend",
              "isSelected": decSelection,
              "marksnotapplicable": false,
              "marks": 80,
              "id": 173563923025623
            }
          ];

          if (incSelection) {
            // subanswar.at(0).get('assessorGuidence').patchValue('Increasing trend');
            gridValue.at(1).get('assessorOptionType')?.patchValue('radio');
            gridValue.at(1).get('assessorOption')?.patchValue(assessorOptions1);
          } else if (flatSelection) {
            gridValue.at(1).get('assessorOption')?.patchValue(assessorOptions11);
            gridValue.at(1).get('assessorOptionType')?.patchValue('radio');
          } else if (decSelection) {
            gridValue.at(1).get('assessorOption')?.patchValue(assessorOptions12);
            gridValue.at(1).get('assessorOptionType')?.patchValue('radio');
          }

          // console.log(gridValue.at(1).value);
          // subanswar.at(0).get('assessorOption').patchValue([]);
          subanswar.at(0).get('subscore').patchValue(mainMark);
          console.log(subanswar.value);
          // let subans = ((this.applicantQuestionForm.get('answers') as FormArray).at(questionIndex).get('answer') as FormArray).at(0).get('score');
          // subans.patchValue(mainMark);
          // (question.get('answer') as FormArray).at(0).get('assessorOption').patchValue([]);

        } else {
          subanswar.at(0).get('subscore')?.patchValue(0);
        }

      } else {
        // let subanswar = (question.get('answer') as FormArray).at(0).get('subanswar') as FormArray;
        subanswar.at(0).get('subscore').patchValue(0);
      }



      //  9
      let questions = (this.applicantQuestionForm.get('answers') as FormArray).at(questionIndex);
      let question10 = (((questions.get('answer') as FormArray).at(0).get('subanswar') as FormArray).at(0).get('grid').get('gridValue') as FormArray);
      let valueOf64Index = question10.at(6).get("64")?.value?.val;
      let valueOf74Index = question10.at(7).get("74")?.value?.val;

      //get control of 11th question
      if (valueOf64Index && valueOf74Index) {
        let calcOfQuestion10 = (Number(valueOf64Index) / Number(valueOf74Index)) * 100;

        //  10
        let question1 = (this.applicantQuestionForm.get('answers') as FormArray).at(questionIndex + 1);

        let question11 = ((question1.get('answer') as FormArray));
        let lableValue = (question11.at(0) as FormArray).get('answerLabel')?.value;
        (question11.at(0) as FormArray).get('ansValue')?.patchValue(lableValue);

        let subAnsLable = ((question11.at(0) as FormArray).get('subanswar') as FormArray).at(0).get('subAnswerLabel')?.value;
        ((question11.at(0) as FormArray).get('subanswar') as FormArray).at(0).get('ansValue')?.patchValue(subAnsLable);
        ((question11.at(0) as FormArray).get('subanswar') as FormArray).at(0).get('textTypeVal')?.patchValue(subAnsLable);
        ((question11.at(0) as FormArray).get('subanswar') as FormArray).at(0).get('subscore').patchValue(calcOfQuestion10.toFixed(2));
        ((question11.at(0) as FormArray).get('subanswar') as FormArray).at(0).get('numericTypeVal').patchValue(calcOfQuestion10.toFixed(2))

      }

    }
    else if (questionId == '682c46b1485482741b9ce9de') {  //Decarbonization 11
      console.log(questionIndex);

      let question = (this.applicantQuestionForm.get('answers') as FormArray).at(questionIndex);
      let question10 = (this.applicantQuestionForm.get('answers') as FormArray).at(questionIndex - 1);
      console.log(question10);
      let values = question10.value;
      let val1 = values.answer[0]?.subanswar[0]?.grid?.gridValue[6]?.['64']?.val;
      let val2 = values.answer[0]?.subanswar[0]?.grid?.gridValue[7]?.['74']?.val;
      let final = ((Number(val1) / Number(val2)) * 100).toFixed(2);
      console.log(final);



      let subanswar = (question.get('answer') as FormArray).at(0).get('subanswar') as FormArray;
      // console.log("Subanswar:  ",subanswar);
      if (final) {
        subanswar.at(0).get('numericTypeVal')?.patchValue(final);
      }
      if (subanswar.at(0).get('ansValue').value) {
        let roundValue = Math.round(Number(subanswar.at(0).get('numericTypeVal').value));
        subanswar.at(0).get('subscore').patchValue(roundValue);
        //  console.log(subanswar.at(0)?.value);
      }
    }
    else if (questionId == '682c565e485482741b9cfde7') {  //decarbonization 19
      let question = (this.applicantQuestionForm.get('answers') as FormArray).at(questionIndex);
      let subanswar = (question.get('answer') as FormArray).at(0).get('subanswar') as FormArray;
      console.log(subanswar.value);
      let grid1 = subanswar.at(2).get('grid') as FormControl;
      let gridValue1 = (grid1.get('gridValue') as FormArray);

      let percentage: number = Number(gridValue1.at(3).get('34').value?.val) || 0;
      console.log(percentage);
      if (percentage >= 25) {
        subanswar.at(2).get('subscore').patchValue(100);
      } else if (percentage >= 10 && percentage <= 24) {
        subanswar.at(2).get('subscore').patchValue(80);
      } else if (percentage >= 5 && percentage <= 9) {
        subanswar.at(2).get('subscore').patchValue(60);
      } else if (percentage > 0 && percentage <= 5) {
        subanswar.at(2).get('subscore').patchValue(40);
      } else {
        subanswar.at(2).get('subscore').patchValue(0);
      }
    }
    else if (questionId === '682d7ae92a6c6172273cde2a') {
      let question = (this.applicantQuestionForm.get('answers') as FormArray).at(questionIndex);

      // question.valueChanges.subscribe((value) => {
      //   let subanswar = (question.get('answer') as FormArray).at(0).get('subanswar') as FormArray;
      //   console.log(subanswar.value);
      //   let numericValue1 = subanswar.at(0).get('numericTypeVal') as FormControl;
      //   let numericValue2 = subanswar.at(1).get('numericTypeVal') as FormControl;
      //   let mark:number=0;
      //   if(Number(numericValue1?.value)>0){
      //     subanswar.at(0).get('subscore').patchValue(50);
      //   }else{
      //     subanswar.at(0).get('subscore').patchValue(0);
      //   }

      //   if(Number(numericValue2?.value)>0){
      //     subanswar.at(1).get('subscore').patchValue(50);
      //   }else{
      //     subanswar.at(1).get('subscore').patchValue(0);
      //   }



      // });

      question.valueChanges.pipe(
        debounceTime(500),
        takeUntil(this.destroy$)
      ).subscribe((value) => {
        let subanswar = (question.get('answer') as FormArray).at(0).get('subanswar') as FormArray;
        let numericValue1 = subanswar.at(0).get('numericTypeVal') as FormControl;
        let numericValue2 = subanswar.at(1).get('numericTypeVal') as FormControl;

        if (Number(numericValue1?.value) > 0) {
          subanswar.at(0).get('subscore').patchValue(50, { emitEvent: false });
        } else {
          subanswar.at(0).get('subscore').patchValue(0, { emitEvent: false });
        }

        if (Number(numericValue2?.value) > 0) {
          subanswar.at(1).get('subscore').patchValue(50, { emitEvent: false });
        } else {
          subanswar.at(1).get('subscore').patchValue(0, { emitEvent: false });
        }
      });

    }else if (
      questionId == '682d7c5d2a6c6172273ce0cb' ||
      questionId == '682d7d8b2a6c6172273ce75e' ||
      questionId == '682d7ec12a6c6172273ce883' ||
      questionId == '682d803f2a6c6172273ceae9'
    ) {
      // Helth & Sefty Question 7,8,9,10
      let question = (this.applicantQuestionForm.get('answers') as FormArray).at(questionIndex);
      console.log("Question:", question?.value);

      let subanswar = (question.get('answer') as FormArray).at(0).get('subanswar') as FormArray;

      if (!subanswar) {
        console.error("❌ subanswar not found");
        return;
      }

      // ✅ grid fetch
      let grid = subanswar.at(0).get('grid') as FormGroup;
      let gridValue = grid.get('gridValue') as FormArray;

      if (!gridValue) {
        console.error("❌ gridValue not found");
        return;
      }

      // ✅ default options
      let orgValue = [
        {
          "assessorOptionType": "radio",
          "assessorGuidence": "",
          "option": "a. Increasing trend",
          "isSelected": false,
          "marksnotapplicable": false,
          "marks": 0,
          "id": 1756199101901,
          "subOption": []
        },
        {
          "assessorOptionType": "radio",
          "assessorGuidence": "",
          "option": "b. Flat trend",
          "isSelected": false,
          "marksnotapplicable": false,
          "marks": 20,
          "id": 1756199150585,
          "subOption": []
        },
        {
          "assessorOptionType": "radio",
          "assessorGuidence": "",
          "option": "c. Decreasing trend",
          "isSelected": false,
          "marksnotapplicable": false,
          "marks": 40,
          "id": 1756199221485,
          "subOption": []
        }
      ];

      let orgValue1 = [
        {
          "assessorOptionType": "radio",
          "assessorGuidence": "",
          "option": "a. Increasing trend",
          "isSelected": false,
          "marksnotapplicable": false,
          "marks": 0,
          "id": 17561991743901,
          "subOption": []
        },
        {
          "assessorOptionType": "radio",
          "assessorGuidence": "",
          "option": "b. Flat trend",
          "isSelected": false,
          "marksnotapplicable": false,
          "marks": 20,
          "id": 1756199298485,
          "subOption": []
        },
        {
          "assessorOptionType": "radio",
          "assessorGuidence": "",
          "option": "c. Decreasing trend",
          "isSelected": false,
          "marksnotapplicable": false,
          "marks": 40,
          "id": 17561921041485,
          "subOption": []
        }
      ];

      // patch safely
      if (gridValue.length > 1) {
        let clonedOrgValue = JSON.parse(JSON.stringify(orgValue));
        this.checkassessorValidationEmpty(gridValue.at(1).get('assessorOption'), clonedOrgValue, 'radio');
      }

      if (gridValue.length > 2) {
        let clonedOrgValue1 = JSON.parse(JSON.stringify(orgValue1));
        this.checkassessorValidationEmpty(gridValue.at(2).get('assessorOption'), clonedOrgValue1, 'radio');
      }


      console.log("GridValue After Patch:", gridValue.value);
    }

    else if (questionId == '682c4abb485482741b9ce9f6') { //Decarbonization 14
      let question = (this.applicantQuestionForm.get('answers') as FormArray).at(questionIndex);
      let subanswar = (question.get('answer') as FormArray).at(0).get('subanswar') as FormArray;

      let firstYear2: any;
      let secondYear2: any;
      let thirdYear2: any;
      console.log(this.generalQuestion25);
      if (this.generalQuestion25['isQuestionValid']) {
        //  let productionQuestion =  (this.applicantQuestionForm.get('answers') as FormArray).at(productionQuestionIndex);
        let subanswar1: any[] = [];
        if (this.userMeta?.role == 'admin') {
          if (!this.generalQuestion25?.isAdminChecked) {
            subanswar1 = (this.generalQuestion25?.assessorResp)[0]?.subanswar;
          } else {
            subanswar1 = (this.generalQuestion25?.adminResp)[0]?.subanswar;
          }
        } else if (this.userMeta?.role == 'assessor') {
          if (!this.generalQuestion25?.isAssessorChecked) {
            subanswar1 = (this.generalQuestion25?.answer)[0]?.subanswar;
          } else {
            subanswar1 = (this.generalQuestion25?.assessorResp)[0]?.subanswar;
          }
        }

        let gridGeneral = subanswar1[0]?.grid;
        let gridValueGeneral = (gridGeneral?.gridValue);

        //   firstYear2 = gridValueGeneral[2]['22']['val']?gridValueGeneral[2]['22']['val']:gridValueGeneral[1]['12']['val'];
        // secondYear2 = gridValueGeneral[2]['23']['val']?gridValueGeneral[2]['23']['val']:gridValueGeneral[1]['13']['val'];
        // thirdYear2 = gridValueGeneral[2]['24']['val']?gridValueGeneral[2]['24']['val']:gridValueGeneral[1]['14']['val'];
        console.log(gridValueGeneral);
        firstYear2 = gridValueGeneral[1]['11']['val'] ? gridValueGeneral[1]['11']['val'] : gridValueGeneral[4]['41']['val'];
        secondYear2 = gridValueGeneral[1]['12']['val'] ? gridValueGeneral[1]['12']['val'] : gridValueGeneral[4]['42']['val'];
        thirdYear2 = gridValueGeneral[1]['13']['val'] ? gridValueGeneral[1]['13']['val'] : gridValueGeneral[4]['43']['val'];


        let grid = subanswar.at(3).get('grid') as FormControl;
        let gridValue = (grid.get('gridValue') as FormArray);

        let scope2021 = (Number(gridValue.at(5).get('51')?.value?.val) ? Number(gridValue.at(5).get('52').value?.val) : Number(gridValue.at(5).get('53').value?.val)) / firstYear2;
        let scope2022 = Number(gridValue.at(5).get('52')?.value?.val) / secondYear2;
        let scope2023 = Number(gridValue.at(5).get('53')?.value?.val) / thirdYear2;

        let financialYearData6 = 0;
        let val13 = Number(gridValue.at(5).get('51')?.value?.val);
        let val14 = Number(gridValue.at(5).get('52')?.value?.val);
        console.log(val13, " : ", val14);
        if (val13) {
          financialYearData6 = this.safeDivide(val13, firstYear2);
        } else if (val14) {
          financialYearData6 = this.safeDivide(val14, secondYear2);
        }

        if ((scope2021 || scope2022) && scope2023) {
          let mainMark: number = 0;

          let getPercentage = ((scope2023 - financialYearData6) / financialYearData6) * 100;
          let incSelection: boolean = ((Number(getPercentage) > 5) && (Number(getPercentage)) > 0);
          let flatSelection: boolean = (Number(getPercentage) > (-5) && Number(getPercentage) < 5);
          // let flatSelection:boolean = (Number(getPercentage) ==5);

          let decSelection: boolean = Number(getPercentage) < (-5) && (Number(getPercentage)) < 0;

          if (incSelection) {
            mainMark += 0;
          } else if (flatSelection) {
            mainMark += 40;
          } else if (decSelection) {
            mainMark += 80;
          }
          let assessorOptions1 = [
            {
              "option": "Increasing trend",
              "isSelected": true,
              "marksnotapplicable": false,
              "marks": 0,
              "id": 173553922983323
            }];
          let assessorOptions11 = [
            {
              "option": "Flat trend",
              "isSelected": true,
              "marksnotapplicable": false,
              "marks": 40,
              "id": 173553449230256   //
            }];
          let assessorOptions12 = [
            {
              "option": "Decreasing trend ",
              "isSelected": true,
              "marksnotapplicable": false,
              "marks": 80,
              "id": 173335639230256
            }
          ];
          console.log(gridValue.at(3).get('assessorOption')?.value);
          // if(incSelection){
          //   // subanswar.at(0).get('assessorGuidence').patchValue('Increasing trend');
          //   gridValue.at(3).get('assessorOption').setValue(assessorOptions1);
          //   gridValue.at(3).get('assessorOptionType').setValue('radio');
          // }else if(flatSelection){
          //   gridValue.at(3).get('assessorOption').setValue(assessorOptions11);
          //   gridValue.at(3).get('assessorOptionType').setValue('radio');
          // }else if(decSelection){
          //   gridValue.at(3).get('assessorOption').setValue(assessorOptions12);
          //   gridValue.at(3).get('assessorOptionType').setValue('radio');
          // }

          const control = gridValue.at(3);

          if (!control) {
            console.log('Control at index 3 does not exist.');
          } else {
            if (incSelection) {
              control.get('assessorOption')?.patchValue(assessorOptions1);
              control.get('assessorOptionType')?.patchValue('radio');
            } else if (flatSelection) {
              control.get('assessorOption')?.patchValue(assessorOptions11);
              control.get('assessorOptionType')?.patchValue('radio');
            } else if (decSelection) {
              control.get('assessorOption')?.patchValue(assessorOptions12);
              control.get('assessorOptionType')?.patchValue('radio');
            } else {
              console.log('No selection is active.');
            }

          }


          console.log(gridValue.at(3).get('assessorOption')?.value);

          (question.get('answer') as FormArray).at(0).get('assessorOption').patchValue([]);
          console.log(gridValue.value);

        } else {
          subanswar.at(0).get('subscore').patchValue(0);
          (question.get('answer') as FormArray).at(0).get('assessorOption').patchValue([]);
        }

      } else {
        subanswar.at(0).get('subscore')?.patchValue(0);
      }


    }
    else if (questionId == '682d81292a6c6172273ceb9f') {    //Helth & Sefty 11
      let question = (this.applicantQuestionForm.get('answers') as FormArray).at(questionIndex);
      let subanswar = (question.get('answer') as FormArray).at(0).get('subanswar') as FormArray;
      console.log(subanswar.value);
      let textTypeVa1 = subanswar.at(0).get('textTypeVal') as FormControl;
      let zerothMark: number = 0;
      if (textTypeVa1?.value != null && Number(textTypeVa1?.value) > 0) {
        zerothMark = 0;
      } else {
        zerothMark = 50;
      }

      let textTypeVa2 = subanswar.at(1).get('textTypeVal') as FormControl;
      let oneMark: number = 0;
      if (textTypeVa2?.value != null && Number(textTypeVa2?.value) > 0) {
        oneMark = 0;
      } else {
        oneMark = 50;
      }

      subanswar.at(1).get('subscore')?.patchValue(oneMark);
      subanswar.at(0).get('subscore')?.patchValue(zerothMark);

      subanswar.at(1).get('assessorOption')?.patchValue([]);
      subanswar.at(0).get('assessorOption')?.patchValue([]);

    }
    else if (questionId === '682da3932a6c6172273d0768') {
      let question = (this.applicantQuestionForm.get('answers') as FormArray).at(questionIndex);
      let subanswar = (question.get('answer') as FormArray).at(0).get('subanswar') as FormArray;
      console.log(subanswar.value);
      let option = subanswar.at(0).get('assessorOption').value?.length == 0;
      let assessorOpt = [
        {
          "assessorOptionType": "checkbox",
          "assessorGuidence": "",
          "option": "a) Process describes and covers:",
          "isSelected": false,
          "marksnotapplicable": false,
          "marks": 100,
          "id": 1756270334674,
          "subOption": [
            {
              "option": "1. Identification of actual and potential human rights impacts in different areas of operations",
              "isSelected": false,
              "marksnotapplicable": false,
              "marks": 20,
              "id": 1756270423360
            },
            {
              "option": "2. Integrating and acting on the findings",
              "isSelected": false,
              "marksnotapplicable": false,
              "marks": 20,
              "id": 1756270465240
            },
            {
              "option": "3. Tracking responses",
              "isSelected": false,
              "marksnotapplicable": false,
              "marks": 20,
              "id": 1756270479200
            },
            {
              "option": "4. Communicating about how impacts are addressed",
              "isSelected": false,
              "marksnotapplicable": false,
              "marks": 20,
              "id": 1756270496192
            },
            {
              "option": "5. Process covers value chain partners",
              "isSelected": false,
              "marksnotapplicable": false,
              "marks": 20,
              "id": 1756270507288
            }
          ]
        },
        {
          "assessorOptionType": "radio",
          "assessorGuidence": "",
          "option": "b) Ad hoc process in place",
          "isSelected": false,
          "marksnotapplicable": false,
          "marks": 25,
          "id": 1756270519921,
          "subOption": []
        },
        {
          "assessorOptionType": "radio",
          "assessorGuidence": "",
          "option": "c) No process in place",
          "isSelected": false,
          "marksnotapplicable": false,
          "marks": 0,
          "id": 1756270542640,
          "subOption": []
        }
      ];

      if (option) {
        let clonedOrgValue = JSON.parse(JSON.stringify(assessorOpt));
        this.checkassessorValidationEmpty(subanswar.at(0).get('assessorOption'), clonedOrgValue, 'radio');
      }
      // if(option){
      //   subanswar.at(0).get('assessorOption').patchValue(assessorOpt);
      //   subanswar.at(0).get('assessorOptionType').patchValue('radio');
      // }

    }

    else if (questionId == '682d829a2a6c6172273cebab') {
      let question = (this.applicantQuestionForm.get('answers') as FormArray).at(questionIndex);
      let subanswar = (question.get('answer') as FormArray).at(0).get('subanswar') as FormArray;
      console.log(subanswar.value);
      let textTypeVa1 = subanswar.at(0).get('numericTypeVal') as FormControl;
      // console.log();
      (question.get('answer') as FormArray).at(0).get('assessorOption')?.patchValue([]);


      let mark: number = 0;
      if (Number(textTypeVa1?.value) >= 80) {
        mark = 100;
      } else if (Number(textTypeVa1?.value) < 80 && Number(textTypeVa1?.value) >= 50) {
        mark = 70;
      } else if (Number(textTypeVa1?.value) < 50 && Number(textTypeVa1?.value) >= 20) {
        mark = 40;
      } else if (Number(textTypeVa1?.value) < 20 && Number(textTypeVa1?.value) > 0) {
        mark = 20;
      }

      if (mark !== 0) {
        subanswar.at(0).get('subscore')?.patchValue(mark);
      }
      console.log(subanswar?.value);

    }

    else if (questionId == '682d85b62a6c6172273ced1d') {
      let question = (this.applicantQuestionForm.get('answers') as FormArray).at(questionIndex);
      let subanswar = (question.get('answer') as FormArray).at(0).get('subanswar') as FormArray;
      console.log(subanswar.value);
      subanswar.at(0).get('assessorOption').patchValue([]);
      subanswar.at(1).get('assessorOption').patchValue([]);
      subanswar.at(2).get('assessorOption').patchValue([]);

      let num1: number = Number(subanswar.at(0).get('numericTypeVal').value);
      let num2: number = Number(subanswar.at(1).get('numericTypeVal').value);
      let num3: number = Number(subanswar.at(2).get('numericTypeVal').value);
      let mark: number = 0;
      if (num1 && num2 && num3) {
        mark += 10;
      }
      if (num1 >= 75) {
        mark += 30;
      }
      if (num1 <= 74 && num1 >= 50) {
        mark += 20;
      }
      if (num1 <= 49 && num1 >= 25) {
        mark += 10;
      }
      if (num1 <= 24 && num1 >= 1) {
        mark += 5;
      }
      subanswar.at(0).get('subscore').patchValue(mark);

      let mark1: number = 0;

      if (num2 >= 75) {
        mark1 += 30;
      }
      if (num2 <= 74 && num2 >= 50) {
        mark1 += 20;
      }
      if (num2 <= 49 && num2 >= 25) {
        mark1 += 10;
      }
      if (num2 <= 24 && num2 >= 1) {
        mark1 += 5;
      }
      subanswar.at(1).get('subscore').patchValue(mark1);

      let mark2: number = 0;

      if (num3 >= 75) {
        mark2 += 30;
      }
      if (num3 <= 74 && num3 >= 50) {
        mark2 += 20;
      }
      if (num3 <= 49 && num3 >= 25) {
        mark2 += 10;
      }
      if (num3 <= 24 && num3 >= 1) {
        mark2 += 5;
      }
      subanswar.at(2).get('subscore').patchValue(mark2);

      console.log(subanswar?.value);

    }

    else if (questionId == '682d863f2a6c6172273cedb4') {
      let question = (this.applicantQuestionForm.get('answers') as FormArray).at(questionIndex);
      let subanswar = (question.get('answer') as FormArray).at(0).get('subanswar') as FormArray;
      console.log(subanswar.value);
      subanswar.at(0).get('assessorOption').patchValue([]);
      subanswar.at(1).get('assessorOption').patchValue([]);
      // subanswar.at(2).get('assessorOption').patchValue([]);

      let num1: number = Number(subanswar.at(0).get('numericTypeVal').value);
      let num2: number = Number(subanswar.at(1).get('numericTypeVal').value);
      // let num3: number = Number(subanswar.at(2).get('textTypeVal').value);
      let mark: number = 0;

      if (num1 >= 75) {
        mark += 30;
      }
      if (num1 <= 75 && num1 >= 50) {
        mark += 20;
      }
      if (num1 <= 50 && num1 >= 25) {
        mark += 10;
      }
      // if(num1<5){
      if (num1 <= 25 && num1 >= 0) {
        mark += 5;
      }
      subanswar.at(0).get('subscore').patchValue(mark);

      let mark1: number = 0;

      if (num2 >= 75) {
        mark1 += 30;
      }
      if (num2 <= 75 && num2 >= 50) {
        mark1 += 20;
      }
      if (num2 <= 50 && num2 >= 25) {
        mark1 += 10;
      }
      // if(num1<5){
      if (num2 <= 25 && num2 >= 0) {
        mark1 += 5;
      }
      subanswar.at(1).get('subscore').patchValue(mark1);

      // let mark2:number = 0;

      // if(num3>=40){
      //   mark2 += 40;
      // }
      // if(num3<=40 && num3>=20){
      //   mark2 += 15;
      // }
      // if(num3<=20 && num3>=5){
      //   mark2 += 5;
      // }
      // if(num3<5){
      //   mark2 += 0;
      // }
      // subanswar.at(2).get('subscore').patchValue(mark2);

      console.log(subanswar?.value);
    }

    else if (questionId == '682d876c2a6c6172273cee6f') {
      let question = (this.applicantQuestionForm.get('answers') as FormArray).at(questionIndex);
      let subanswar = (question.get('answer') as FormArray).at(0).get('subanswar') as FormArray;
      console.log(subanswar.value);
      subanswar.at(0).get('assessorOption').patchValue([]);
      subanswar.at(1).get('assessorOption').patchValue([]);
      subanswar.at(2).get('assessorOption').patchValue([]);

      let num1: number = Number(subanswar.at(0).get('numericTypeVal').value);
      let num2: number = Number(subanswar.at(1).get('numericTypeVal').value);
      let num3: number = Number(subanswar.at(2).get('numericTypeVal').value);
      let mark: number = 0;

      if (num1 >= 40) {
        mark += 40;
      }
      if (num1 <= 40 && num1 >= 20) {
        mark += 20;
      }
      if (num1 <= 20 && num1 >= 5) {
        mark += 10;
      }
      if (num1 < 5) {
        mark += 0;
      }
      subanswar.at(0).get('subscore').patchValue(mark);

      let mark1: number = 0;

      if (num2 >= 40) {
        mark1 += 30;
      }
      if (num2 <= 40 && num2 >= 20) {
        mark1 += 15;
      }
      if (num2 <= 20 && num2 >= 5) {
        mark1 += 5;
      }
      if (num2 < 5) {
        mark1 += 0;
      }
      subanswar.at(1).get('subscore').patchValue(mark1);

      let mark2: number = 0;

      if (num3 >= 40) {
        mark2 += 30;
      }
      if (num3 <= 40 && num3 >= 20) {
        mark2 += 15;
      }
      if (num3 <= 20 && num3 >= 5) {
        mark2 += 5;
      }
      if (num3 < 5) {
        mark2 += 0;
      }
      subanswar.at(2).get('subscore').patchValue(mark2);

      console.log(subanswar?.value);
    }

    else if (questionId == '682d9f3b2a6c6172273d02a4') {  //human rights 11
      let question = (this.applicantQuestionForm.get('answers') as FormArray).at(questionIndex);
      let subanswar = (question.get('answer') as FormArray).at(0).get('subanswar') as FormArray;
      console.log(subanswar.value);
      let grid1 = subanswar.at(0).get('grid') as FormControl;
      let gridValue1 = (grid1.get('gridValue') as FormArray);

      // let grid2 = subanswar.at(1).get('grid') as FormControl;
      // let gridValue2 = (grid2.get('gridValue') as FormArray);

      // let grid3 = subanswar.at(2).get('grid') as FormControl;
      // let gridValue3 = (grid3.get('gridValue') as FormArray);

      // let grid4 = subanswar.at(3).get('grid') as FormControl;
      // let gridValue4 = (grid4.get('gridValue') as FormArray);

      // let grid5 = subanswar.at(4).get('grid') as FormControl;
      // let gridValue5 = (grid5.get('gridValue') as FormArray);




      let scope1 = Number(gridValue1.at(1).get('13').value?.val);
      let scope2 = Number(gridValue1.at(2).get('23').value?.val);
      let scope3 = Number(gridValue1.at(3).get('33').value?.val);
      let scope31 = Number(gridValue1.at(4).get('43').value?.val);

      let scope4 = Number(gridValue1.at(5).get('53').value?.val);
      let scope5 = Number(gridValue1.at(6).get('63').value?.val);

      // if =0, then 0, else 20
      let assessorOptions1 = [
        {
          "option": "1. Data Available",
          "isSelected": false,
          "marksnotapplicable": false,
          "marks": scope1 > 0 ? 20 : 0,
          "id": 173345539229823
        },
        {
          "option": "2. No Cases",
          "isSelected": false,
          "marksnotapplicable": false,
          "marks": 20,
          "id": 172335539230256   //
        },
        {
          "option": "3. No information available",
          "isSelected": false,
          "marksnotapplicable": false,
          "marks": 0,
          "id": 173563923034256
        }
      ];

      gridValue1.at(1).get('assessorOption').patchValue(assessorOptions1);
      // gridValue1.at(1).get('assessorOptionType').patchValue('radio');

      let assessorOptions2 = [
        {
          "option": "1. Data Available",
          "isSelected": false,
          "marksnotapplicable": false,
          "marks": scope2 > 0 ? 20 : 0,
          "id": 173553922922823
        },
        {
          "option": "2. No Cases",
          "isSelected": false,
          "marksnotapplicable": false,
          "marks": 20,
          "id": 173553923090256   //
        },
        {
          "option": "3. No information available",
          "isSelected": false,
          "marksnotapplicable": false,
          "marks": 0,
          "id": 17356393530256
        }
      ];

      gridValue1.at(2).get('assessorOption').patchValue(assessorOptions2);
      // gridValue2.at(1).get('assessorOptionType').patchValue('radio');

      //3

      let assessorOptions3 = [
        {
          "option": "1. Data Available",
          "isSelected": false,
          "marksnotapplicable": false,
          "marks": (scope3 + scope31) > 0 ? 20 : 0,
          "id": 173553922976823
        },
        {
          "option": "2. No Cases",
          "isSelected": false,
          "marksnotapplicable": false,
          "marks": 20,
          "id": 1735539230256   //
        },
        {
          "option": "3. No information available",
          "isSelected": false,
          "marksnotapplicable": false,
          "marks": 0,
          "id": 173563921330256
        }
      ];

      gridValue1.at(3).get('assessorOption').patchValue(assessorOptions3);
      // gridValue3.at(1).get('assessorOptionType').patchValue('radio');

      //4

      let assessorOptions4 = [
        {
          "option": "1. Data Available",
          "isSelected": false,
          "marksnotapplicable": false,
          "marks": scope4 > 0 ? 20 : 0,
          "id": 173553928729823
        },
        {
          "option": "2. No Cases",
          "isSelected": false,
          "marksnotapplicable": false,
          "marks": 20,
          "id": 173553924230256   //
        },
        {
          "option": "3. No information available",
          "isSelected": false,
          "marksnotapplicable": false,
          "marks": 0,
          "id": 173563926730256
        }
      ];

      gridValue1.at(5).get('assessorOption').patchValue(assessorOptions4);
      // gridValue4.at(1).get('assessorOptionType').patchValue('radio');


      //5

      let assessorOptions5 = [
        {
          "option": "1. Data Available",
          "isSelected": false,
          "marksnotapplicable": false,
          "marks": scope5 > 0 ? 20 : 0,
          "id": 17355391229823
        },
        {
          "option": "2. No Cases",
          "isSelected": false,
          "marksnotapplicable": false,
          "marks": 20,
          "id": 173553922330256   //
        },
        {
          "option": "3. No information available",
          "isSelected": false,
          "marksnotapplicable": false,
          "marks": 0,
          "id": 1735637376230256
        }
      ];

      gridValue1.at(6).get('assessorOption').patchValue(assessorOptions5);
      // gridValue5.at(1).get('assessorOptionType').patchValue('radio');
      console.log(subanswar.value);

    }
    else if (questionId == '682c2e9b485482741b9ce8d3' || questionId == '682c2f37485482741b9ce8db') {  //Decorbonization Qn. 2 & 3
      let question = (this.applicantQuestionForm.get('answers') as FormArray).at(questionIndex);
      //Production id 66cf0f245cc94a789a59da92

      let firstYear2: any;
      let secondYear2: any;
      let thirdYear2: any;
      console.log(this.generalQuestion25, " :generalQuestion25");
      if (this.generalQuestion25['isQuestionValid']) {
        //  let productionQuestion =  (this.applicantQuestionForm.get('answers') as FormArray).at(productionQuestionIndex);
        let subanswar1: any[] = [];
        if (this.userMeta?.role == 'assessor') {
          if (!this.generalQuestion25?.isAssessorChecked) {
            subanswar1 = (this.generalQuestion25?.answer)[0]?.subanswar;
          } else {
            subanswar1 = (this.generalQuestion25?.assessorResp)[0]?.subanswar;
            console.log(subanswar1, " : assessorResp");
          }
        } else if (this.userMeta?.role == 'admin') {
          if (!this.generalQuestion25?.isAdminChecked) {
            subanswar1 = (this.generalQuestion25?.assessorResp)[0]?.subanswar;
          } else {
            subanswar1 = (this.generalQuestion25?.adminResp)[0]?.subanswar;
          }
        }

        let gridGeneral = subanswar1[0]?.grid;
        let gridValueGeneral = (gridGeneral?.gridValue);
        console.log(gridValueGeneral, " : gridValueGeneral");
        firstYear2 = gridValueGeneral[1]['11']['val'] ? gridValueGeneral[1]['11']['val'] : gridValueGeneral[4]['41']['val'];
        secondYear2 = gridValueGeneral[1]['12']['val'] ? gridValueGeneral[1]['12']['val'] : gridValueGeneral[4]['42']['val'];
        thirdYear2 = gridValueGeneral[1]['13']['val'] ? gridValueGeneral[1]['13']['val'] : gridValueGeneral[4]['43']['val'];
        console.log(firstYear2, " : ", secondYear2, " : ", thirdYear2);
        let subanswar = (question.get('answer') as FormArray).at(0).get('subanswar') as FormArray;
        let grid = subanswar.at(0).get('grid') as FormControl;
        let gridValue = (grid.get('gridValue') as FormArray);
        console.log(gridValue);
        console.log(Number(gridValue.at(1).get('11').value?.val), "  :  ",
          Number(gridValue.at(1).get('12').value?.val), "  :  ", Number(gridValue.at(1).get('13').value?.val));
        // let scope2021 = (Number(gridValue.at(1).get('11').value?.val)?Number(gridValue.at(1).get('11').value?.val):Number(gridValue.at(1).get('12').value?.val))/Number(firstYear2);
        // let scope2022 = Number(gridValue.at(1).get('12').value?.val)/(Number(secondYear2));
        // let scope2023 = Number(gridValue.at(1).get('13').value?.val)/(Number(thirdYear2));

        let scope2021 = this.safeDivide(
          Number(gridValue.at(1).get('11').value?.val) || Number(gridValue.at(1).get('12').value?.val),
          firstYear2
        );

        let scope2022 = this.safeDivide(
          gridValue.at(1).get('12').value?.val,
          secondYear2
        );

        let scope2023 = this.safeDivide(
          gridValue.at(1).get('13').value?.val,
          thirdYear2
        );

        let financialYearData6 = 0;
        let val13 = Number(gridValue.at(1).get('11').value?.val);
        let val14 = Number(gridValue.at(1).get('12').value?.val);
        console.log(val13, " : ", val14);
        if (val13) {
          financialYearData6 = this.safeDivide(val13, firstYear2);
        } else if (val14) {
          financialYearData6 = this.safeDivide(val14, secondYear2);
        }

        console.log(scope2021, "  :  ", scope2022, "  :  ", scope2023);
        subanswar.at(0).get('assessorOption')?.patchValue([]);
        if ((scope2022 || scope2021) && scope2023) {
          let mainMark: number = 0;
          subanswar.at(0).get('assessorOption').patchValue([]);

          let getPercentage = ((scope2023 - financialYearData6) / financialYearData6) * 100;
          console.log(getPercentage);
          let incSelection: boolean = ((Number(getPercentage) > 5));

          let flatSelection: boolean = (Number(getPercentage) > (-5) && Number(getPercentage) < 5);
          let decSelection: boolean = Number(getPercentage) < (-5) && (Number(getPercentage)) < 0;

          let instructions: any[] = [];
          if (incSelection) {
            mainMark += 0;
          } else if (flatSelection) {
            mainMark += 40;
          } else if (decSelection) {
            mainMark += 80;
          }
          let assessorOptions1 =
          {
            "option": "Increasing trend",
            "isSelected": true,
            "marksnotapplicable": false,
            "marks": 0,
            "id": 145735539229823
          }
          let assessorOptions11 =
          {
            "option": "Flat trend",
            "isSelected": true,
            "marksnotapplicable": false,
            "marks": 40,
            "id": 451735539230256   //
          }
          let assessorOptions12 =
          {
            "option": "Decreasing trend",
            "isSelected": true,
            "marksnotapplicable": false,
            "marks": 80,
            "id": 1735639230256123
          }


          if (incSelection) {
            instructions.push(assessorOptions1);
          } else if (flatSelection) {
            instructions.push(assessorOptions11);
          } else if (decSelection) {
            instructions.push(assessorOptions12);
          }
          console.log(incSelection);
          console.log(flatSelection);
          console.log(decSelection);

          subanswar.at(0).get('assessorOption').patchValue(instructions);
          subanswar.at(0).get('assessorOptionType').patchValue('radio');
          subanswar.at(0).get('subscore').patchValue(mainMark);

        } else {
          subanswar.at(0).get('subscore').patchValue(0);
        }

        console.log(subanswar.value);


      } else {
        let subanswar = (question.get('answer') as FormArray).at(0).get('subanswar') as FormArray;
        subanswar.at(0).get('subscore').patchValue(0);
      }



    } else if (questionId === '684fb0bc9826c9d2a6f3fda6') {  // Automobile Qn. 2

      let question = (this.applicantQuestionForm.get('answers') as FormArray).at(questionIndex);
      let subanswar = (question.get('answer') as FormArray).at(0).get('subanswar') as FormArray;
      const numericControl = subanswar.at(1).get('numericTypeVal');

      // Initial patch on load (if value already exists)
      const updateScore = (value: number) => {
        let obtendMarks = 0;
        if (value >= 25) {
          obtendMarks = 100;
        } else if (value >= 10) {
          obtendMarks = 50;
        } else if (value >= 5) {
          obtendMarks = 30;
        } else {
          obtendMarks = 0;
        }

        subanswar.at(1).get('subscore')?.patchValue(obtendMarks);
        console.log(`${value} → ${obtendMarks} : Updated subscore`);
      };

      // Apply once on initial value
      const initialValue = Number(numericControl?.value) || 0;
      updateScore(initialValue);

      // Listen to value changes dynamically
      numericControl?.valueChanges.subscribe((val: any) => {
        const value = Number(val) || 0;
        updateScore(value);
      });
    } else if (questionId === '682da4432a6c6172273d0821') {
      console.log(questionId)
      let question = (this.applicantQuestionForm.get('answers') as FormArray).at(questionIndex);
      let subanswar = (question.get('answer') as FormArray).at(0).get('subanswar') as FormArray;
      console.log(subanswar.value);


      let assessorOptions1 =
        [
          {
            "assessorOptionType": "checkbox",
            "assessorGuidence": "",
            "option": "Grievance system in place ",
            "isSelected": false,
            "marksnotapplicable": false,
            "marks": 60,
            "id": 1755976074009,
            "subOption": []
          },
          {
            "assessorOptionType": "checkbox",
            "assessorGuidence": "",
            "option": "Reporting Authority specified ",
            "isSelected": false,
            "marksnotapplicable": false,
            "marks": 20,
            "id": 1755976087236,
            "subOption": []
          },
          {
            "assessorOptionType": "checkbox",
            "assessorGuidence": "",
            "option": "Timeline for grievance resolution",
            "isSelected": false,
            "marksnotapplicable": false,
            "marks": 10,
            "id": 1755976107976,
            "subOption": []
          },
          {
            "assessorOptionType": "checkbox",
            "assessorGuidence": "",
            "option": "Community informed of actions taken",
            "isSelected": false,
            "marksnotapplicable": false,
            "marks": 10,
            "id": 1755976123400,
            "subOption": []
          }
        ];

      subanswar.at(0).get('assessorOption').patchValue(assessorOptions1);
      subanswar.at(0).get('assessorOptionType').patchValue('checkbox');

    } else if (questionId === '682c152d485482741b9ce771') {
      console.log(questionId)
      let question = (this.applicantQuestionForm.get('answers') as FormArray).at(questionIndex);
      let subanswar = (question.get('answer') as FormArray).at(0).get('subanswar') as FormArray;
      console.log(subanswar.value);
      let textTypeVa1 = (subanswar.at(0).get('grid') as FormControl).get('gridValue') as FormArray;
      console.log(textTypeVa1);
      // let a = textTypeVa1.at(1).get('assessorOption') as FormControl;
      // console.log(a);
      // let option = a.value[0]['subOption'].find((item:any)=>item.option =='d. R&D');
      // if(!option){
      //   a.value[0]['subOption'][3] = {
      //     "assessorOptionType": "checkbox",
      //     "assessorGuidence": "",
      //     "option": "d. R&D",
      //     "isSelected": false,
      //     "marksnotapplicable": false,
      //     "marks": 5,
      //     "id": 1755976123200,
      //     "subOption": []
      //   };
      // }

      let a = textTypeVa1.at(1).get('assessorOption') as FormControl;
      console.log(a.value); // this is just the JS object/array snapshot

      // Make a shallow copy so we don't mutate directly
      let controlValue = JSON.parse(JSON.stringify(a.value));

      // Check if "d. R&D" already exists
      let option = controlValue[0].subOption.find((item: any) => item.option === 'd. R&D');

      if (!option) {
        controlValue[0].subOption.push({
          assessorOptionType: "checkbox",
          assessorGuidence: "",
          option: "d. R&D",
          isSelected: false,
          marksnotapplicable: false,
          marks: 5,
          id: Date.now(), // generate unique id
          subOption: []
        });

        // ✅ Properly tell Angular the FormControl value has changed
        a.setValue(controlValue);
      }


    }

  }





  calculatePercentage(arrayVal: any[]): any[] {
    let totalSum = arrayVal.reduce((sum, num) => sum + num, 0);
    return arrayVal.map(num => ((num / totalSum) * 100).toFixed(2));
  }

  getCalculationEmmitionData(): any {
    let data = (this.applicantQuestionForm.get('answers') as FormArray).value.find((item: any) => item.questionId == '66b5e085abd1f86901c3f013');
    // console.log(data?.answer[1]);
    let body: any = {};
    if (data?.answer[1]?.ansValue == data?.answer[1]?.answerLabel) {
      data?.answer[1]?.subanswar[0]?.ansValue;
      // console.log(data?.answer[1]?.subanswar[0]?.ansValue);
      let vals = data?.answer[1]?.subanswar[0]?.ansValue;
      if (vals['2022']) {
        body['firstYear'] = { scope1: vals['2022']?.scope1?.totalOfFirst, scope2: vals['2022']?.scope2?.purchaseTotal };

      }
      if (vals['2023']) {
        body['secondYear'] = { scope1: vals['2023']?.scope1?.totalOfFirst, scope2: vals['2023']?.scope2?.purchaseTotal }

      }
      if (vals['2024']) {
        body['thirdYear'] = { scope1: vals['2024']?.scope1?.totalOfFirst, scope2: vals['2024']?.scope2?.purchaseTotal }

      }

    }
    return body;
  }


  getNameOfGridRow(control: any) {
    let name: string = control?.grid?.gridValue[1]['10']['val'];
    return name;
  }




  checkGridType(array: any[]): boolean {
    let indexOfItem = array?.findIndex((item: any) => item?.subAnswerTypes == 'Grid');
    if (indexOfItem !== (-1)) {
      return true;
    } else {
      return false;
    }
  }

  generalQuestion25: any;
  getParticularQuestion() {
    this.loader.showLoading();
    let userId = this.applicantId ? this.applicantId : this.userMeta?._id
    this.apiService.post('get-particular-question', {
      questionId: '682c268b485482741b9ce8b7',
      applicant_id: userId
    }).subscribe({
      next: (resp: any) => {
        this.loader.hideLoading();
        if (resp['status'] === 'success') {
          this.generalQuestion25 = resp['data'];
          console.log(this.generalQuestion25, '  :generalQuestion25');

          // Agar assessorResp hai to uska ansValue, warna answer ka ansValue uthaye
          let ansValue: any;
          // resp?.data?.assessorResp?.[0]?.ansValue ??
          // resp?.data?.answer?.[0]?.ansValue;

          if (resp?.data?.adminResp?.[0]?.ansValue) {
            ansValue = resp?.data?.adminResp?.[0]?.ansValue
          } else if (resp?.data?.assessorResp?.[0]?.ansValue) {
            ansValue = resp?.data?.assessorResp?.[0]?.ansValue
          } else {
            ansValue = resp?.data?.answer?.[0]?.ansValue
          }

          this.generalQuestion25['isQuestionValid'] = !!ansValue;
          this.generalQuestion25['finalAnsValue'] = ansValue; // optional, agar aapko final value use karni ho to
        }
      },
      error: (err: any) => {
        this.loader.hideLoading();
      }
    });

  }


  private observer: MutationObserver;

  onMutations(mutations: MutationRecord[]) {
    // Perform change detection
    // this.cd.detectChanges();

  }

  safeDivide(numerator: any, denominator: any): number {
    const num = Number(numerator);
    const den = Number(denominator);

    if (!den || isNaN(den)) {
      return 0; // or null if you prefer
    }
    return isNaN(num) ? 0 : num / den;
  }

  logFun(data: any) {
    console.log(data, "  :FunData");
  }

  checkassessorValidationEmpty = (control: AbstractControl | null, value: any, type: string) => {
    if (control && (!control.value || control.value.length === 0)) {
      control.patchValue(value);
      (control.parent?.get('assessorOptionType'))?.patchValue(type);
    }
  };

}
