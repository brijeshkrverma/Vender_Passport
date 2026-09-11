
import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, NgZone, OnDestroy, OnInit } from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { MatStepper } from '@angular/material/stepper';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { combineLatest, Observable, of, Subject } from 'rxjs';
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

import { MatExpansionModule } from '@angular/material/expansion';
import { SkeletonDirective } from '../../../directive/skeleton.directive';
import { ExtractTextPipe } from '../../../extract-text.pipe';
import { Events } from '../../../services/utility/events';
import { ScientificCalculatorComponent } from '../scientific-calculator/scientific-calculator.component';

import { MutationObserverDirective } from '../../../directive/mutation-observer.directive';
import { FindOnePipe } from '../../../pipes/find-one.pipe';
import { AssessorUploadDocumentComponent } from '../../assessor/assessor-upload-document/assessor-upload-document.component';
import { DialogOverviewExampleDialog } from '../questionnaire-form/dialog/dialog-overview-example.component';

@Component({
  selector: 'app-assessor-assessment-detail',
  standalone: true,
  imports: [
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
    ScopeEmissionsComponent,
    MatExpansionModule,
    FindOnePipe,
    RouterModule,
  ],
  templateUrl: './assessor-assessment-detail.component.html',
  styleUrl: './assessor-assessment-detail.component.css'
  // changeDetection: ChangeDetectionStrategy.OnPush,

})


export class AssessorAssessmentDetailComponent implements OnInit, OnDestroy {
  panelOpenState: boolean = false;
  animal: string;
  name: string;
  questionLength: number = 0;
  financialYear: string = new Date().getFullYear().toString();
  isFinalSubmitted: string = 'draft';
  userQuestionnaire: any = {};
selectedValue = "1";
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

  isFinal: boolean = false;
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
      this.isFinal = params['status'] === 'final' ? true : false;

      console.log(this.isFinal, "isFinal");
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

  openDialog(): void {
    let dialogRef = this.dialog.open(DialogOverviewExampleDialog, {
      width: '900px',
      data: { detail: this.attemptQuestionDetails, role: 'assessor' }
    });

    dialogRef.afterClosed().subscribe(result => { });
  }

  // openDialog(isView:boolean): void {
  //   this.getDetailOfAttemptQuestions();
  //   let dialogRef = this.dialog.open(DialogOverviewExampleDialog, {
  //     width: '900px',
  //     data: { detail: this.attemptQuestionDetails,isView:isView?true:false },
  //     enterAnimationDuration: '800ms',
  //     exitAnimationDuration: '1000ms',
  //   });

  //   dialogRef.afterClosed().subscribe(result => {

  //   });
  // }



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
    console.log(standeredAlign);

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
        this.getAllQuestionnaire();
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
  isLoad: boolean = true

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
            if (resp['data'] == null) {
              this.isLoad = false;
            }
            //  resp['data'].forEach((item: any) => {
            //     const matchedAnswer = this.alldata[0].answers.find((ans: any) => ans.questionId === item.questionId);
            //     console.log(matchedAnswer);

            //     if (matchedAnswer) {
            //       item.obtendMark = matchedAnswer.obtendMark;
            //       item.maxMark = matchedAnswer.maxMark;
            //     }
            //   });
            // 🔹 Filter questions
            //  resp['data'].answers = resp['data'].answers.filter(
            //     (item) => item.questionId !== '684fb66c9826c9d2a6f3ff2f'   // yaha apna condition daalna hai
            //   );
            //       resp['data'].assessorResp = resp['data'].assessorResp.filter(
            //     (item) => item.questionId !== '684fb66c9826c9d2a6f3ff2f'   // yaha apna condition daalna hai
            //   );
            console.log(resp['data']);

            if (this.userMeta?.role == 'applicant' || this.userMeta?.role == 'vcp') {
              this.isFinalSubmitted = resp['data']['appli_submmited_status'];
            } else if (this.userMeta?.role == 'assessor') {
              this.isFinalSubmitted = resp['data']['assessor_submmited_status'];
            } else if (this.userMeta?.role == 'admin') {
              this.isFinalSubmitted = resp['data']['admin_submmited_status'];
            }

            resp['data'] = [...this.utilityService.filterQuestionaireMarks([resp['data']])];

            console.log(resp['data'], "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
            if (resp['status'] == 'success' && resp['data'][0]['answers']?.length > 0) {
              this.userQuestionnaire = resp['data'][0];
              this.savedQuestionnaireLength = resp['data'][0]['answers']?.length;
              this.finalSubmitStatus = (this.savedQuestionnaireLength == this.allCategoryCount) ? true : false;
              resp['data'][0]['answers']?.filter((item: any, index: number) => {

                if (this.userMeta?.role == 'assessor') {
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
                if (this.userMeta?.role == 'admin' || this.isFinal) {
                  // console.log(item);
                  data['answer'] = item['adminResp']?.length > 0 ? item['adminResp'] : item['assessorResp'];
                }

                if (!item?.isAssessorChecked) {

                  let control = this.applicantQuestionForm.get('answers') as FormArray;
                  let indexOfUpperControl = control?.value?.findIndex((it: any) => it.questionId == item?.questionId);
                  let ind: number = index;
                  if (indexOfUpperControl !== (-1)) {
                    ind = indexOfUpperControl;
                  }
                  //  console.log(control);
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
                  // console.log(questionIndex," : ",data);
                  // console.log(formControl," : formControl");
                  const { obtendMark, ...rest } = data;
                  formControl.patchValue(rest, { onlySelf: true });

                  // formControl.patchValue(data,{onlySelf:true});
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

    if (this.controlQuestionnaireValidator(control)) {
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
    if (this.controlQuestionnaireValidator(control)) {
      this.controlIndexesFlow(i, stepper);
    } else {
      this.alertService.errorSnackBar("Please enter detail...", 'OK', 'top-right');
    }
  }


  getControl(i: number): boolean {
    let control: any = (this.applicantQuestionForm.get('answers') as FormArray).at(i);
    return this.controlQuestionnaireValidator(control);
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


  safeParsing(data: any): any {
    return JSON.parse(JSON.stringify(data));
  }

  isAssessorFinalSubmit: string = 'draft';
  publeshedStatus: boolean = false;
  totalObtainedeMark: number = 0;
  alldata: any[] = [];
  getAllQuestionnaire(): void {
    this.loader.showLoading();
    this.apiService.post(`get-questionnaire`, { id: this.applicantId, financialYear: this.financialYear }).subscribe({
      next: (resp: any) => {
        this.loader.hideLoading();
        console.log(resp);
        this.isAssessorFinalSubmit = resp['data']?.[0].assessor_submmited_status;
        this.publeshedStatus = resp['data'][0]?.isPublishedScoreCard || false;
        // let filteredData = this.utilityService.filterQuestionaireMarks(resp['data']);
        // let filteredData = this.utilityService.filterQuestionaireMarksForAssessor(resp['data']);
        let filteredData: any;

        if (this.financialYear !== '2024') {
          filteredData = this.utilityService.filterQuestionaireMarksForAssessor(resp['data'])
        } else {
          filteredData = this.utilityService.filterQuestionaireMarksForAssessorYear2024(resp['data']);
        }
        const clonedData = this.safeParsing(filteredData);

        clonedData.forEach((section: any) => {
          section.answers = section.answers.map((item: any) => {
            if (item.isMarks) {
              return { ...item, maxMark: 100 };
            }
            return item;
          });
        });

        filteredData = clonedData;
        this.totalObtainedeMark = filteredData[0]['answers'].reduce((acc, item) => acc + (item.obtendMark || 0), 0);

        filteredData[0].totalMarks = filteredData[0].answers.reduce((acc, item) => acc + (item.maxMark || 0), 0);
        console.log(filteredData);
        filteredData[0]['answers'].filter((item: any) => {
          return item.category == this.selectedCategotyData
        })

        this.alldata = filteredData;

        filteredData[0].totalMarks = filteredData[0].answers.reduce((acc, item) => acc + (item.maxMark || 0), 0);

      }
    })
  }
  // isWorkforce:boolean =

  //    filterData(category: string) {
  //         this.isWorkforce = false;
  //       this.isDocuments = false;
  // if(category == 'Workforce'){
  //       this.isWorkforce = true;
  //       this.isDocuments = false;
  //       this.selectedCatecory = category;
  //     }else if(category == 'Document'){
  //       this.isWorkforce=false;
  //       this.isDocuments = true;
  //       this.selectedCatecory = category;
  //     }
  //    }



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
              if (resp?.data && Array.isArray(this.alldata?.[0]?.answers)) {
                console.log(this.alldata);
                console.log(resp.data);


                resp.data.forEach((item: any) => {
                  const matchedAnswer = this.alldata[0].answers.find((ans: any) => ans.questionId === item._id);
                  console.log(matchedAnswer);

                  if (matchedAnswer) {
                    item.obtendMark = matchedAnswer.obtendMark;
                    item.maxMark = matchedAnswer.maxMark;
                  }
                });
              }


              resp['data'].forEach((item: any, index: number) => {

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
                    obtendMark: [item.obtendMark],
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
      let index = answersArray.value.findIndex((item: any) => item.questionId == '682c4abb485482741b9ce9f6');
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





  getRowNameOfGrid(data: any, control?: any): any {
    let firstObject: any = Object.values(data)[0];
    firstObject['val'] = firstObject?.val.split("-")[0] ? firstObject?.val.split("-")[0] : firstObject?.val;
    if (control?.value['questionId'] == '66adf30760984362943d5f78') {
      firstObject['val'] = '';
    }
    return firstObject;
  }



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
