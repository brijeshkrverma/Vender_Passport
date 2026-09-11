import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { WorkforceoardComponent } from '../../workforceoard/workforceoard.component';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { AbstractControl, FormArray, FormBuilder, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { FormGridComponent } from '../add-questionnaire/form-type-components/form-grid/form-grid.component';
import { MatCardModule } from '@angular/material/card';
import { MatRadioModule } from '@angular/material/radio';
import { ApiService } from '../../../services/api.service';
import { LoaderService } from '../../../services/utility/loader.service';
import { UtilityService } from '../../../services/utility/utility.service';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertService } from '../../../services/alert.service';
import { MatDialog } from '@angular/material/dialog';
import { DialogOverviewExampleDialog } from '../questionnaire-form/dialog/dialog-overview-example.component';
import { MaxWordLengthDirective } from '../../../directive/max-word-length.directive';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { StorageService } from '../../../services/utility/storage.service';
import { filter, finalize, switchMap } from 'rxjs';
import {MatExpansionModule} from '@angular/material/expansion';
import { InnerDropdownComponent } from '../../applicant/list-applicant/inner-dropdown/inner-dropdown.component';

@Component({
  selector: 'app-assessor-questionnaire-view',
  standalone: true,
  imports: [CommonModule, WorkforceoardComponent, MatChipsModule, MatDividerModule,
    MatCheckboxModule,
    InnerDropdownComponent,
     ReactiveFormsModule, FormGridComponent, MatCardModule, MatRadioModule,MatExpansionModule,
     MatTooltipModule,
    MaxWordLengthDirective],
  templateUrl: './assessor-questionnaire-view.component.html',
  styleUrl: './assessor-questionnaire-view.component.css'
})
export class AssessorQuestionnaireViewComponent implements OnInit {
  questionnaireListView: any[] = [];
  questionnaireLists: any[] = [];
  dataHolder: any[] = [];
  dataForMarkCounter: any[] = [];
  applicantQuestionForm: FormGroup;
  isDisabled: boolean = true;
  selectedCatecory: string = 'Workforce';
  applicant_id: string = "";
  totalObtendMark: number = 0;
  attemptQuestionDetails: any[] = [];
  isWorkforce: boolean = true;
  filteredData: any[] = [];
  allBrsrData: any[] = [];
  isAssessorFinalSubmit:string='draft';
  selectedData: any[] = [];
  publeshedStatus: boolean =false;
  isDocuments: boolean = false;
  statusList: any = {};
  isFromAdmin:string='';
  financialYear:string= new Date().getFullYear().toString();
  constructor(private apiService: ApiService,
    private loaderService: LoaderService,
    private _formBuilder: FormBuilder,
    public utilityService: UtilityService,
    private actRoute: ActivatedRoute,
    private alertService: AlertService,
    private router: Router,
    public dialog: MatDialog,
    private storageService:StorageService
  ) {
    this.applicant_id = this.actRoute.snapshot.paramMap.get('id');
    this.applicantQuestionForm = this._formBuilder.group({
      answers: this._formBuilder.array([]),
    });
  }
  get answers(): FormArray {
    return this.applicantQuestionForm.get('answers') as FormArray;
  }
  questionnaireList: any[] = [];
  documentsData: any[] = [];

  userMeta:any;
  ngOnInit(): void {
    this.storageService.getStorage('EcoUser').subscribe({
      next: (user: any) => {
        if (user !== null) {
          this.userMeta = user;
        }
      }
    });

       this.storageService.getStorage('financialYear').subscribe({
      next:(year:any)=>{
        console.log(year);
        if(year){
          this.financialYear=year;
        }
      }
     })

    this.getQuestionnaireSeries();
    this.getApplicantData();
    this.getAllQuestionnaire();
    this.getDetailOfAttemptQuestions();
    this.getAllBRSRMasterData();
    this.getApplicantDocumentFiles(this.applicant_id);
    // this.getAllAdminQuestionnaire();
  }

  changePublishedStatusOfScoreCard() {
    let publishedStatus:string=!this.publeshedStatus?'publish':'unpublish';
    this.alertService.confirmDialog('', `Are you sure you want to ${publishedStatus} the score card?`)
      .pipe(
        filter(status => status), // proceed only if confirmed
        switchMap(() => {
          this.loaderService.showLoading();
          return this.apiService.post('change-status-of-scorecard', {isPublishedScoreCard:!this.publeshedStatus,applicant_id:this.applicant_id}).pipe(
            finalize(() => this.loaderService.hideLoading())
          );
        })
      )
      .subscribe({
        next: (resp: any) => {
          if (resp['status'] === 'success') {
            this.publeshedStatus= resp['data'];
            this.alertService.successSnackBar(`Score card ${publishedStatus}ed successfully.`,'OK','top-right');
            // Handle success case
          }
        },
        error: (err: any) => {
          console.log(err);
          // Handle error case
        }
      });
  }
  
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

  getBrsrBySA(standeredAlign: any): string[] {
    let brsrData: any[] = [];
    if(standeredAlign?.length>0){
      standeredAlign.forEach((item: any) => {
        let d = this.allBrsrData.find(o => o._id === item);
        brsrData.push(d?.brsrType);
      });
    }

    return brsrData || [];
  }
  
  filterByBrsrType(e: any): void {
    const selectedValue = e.target.value;
    if (selectedValue) {
      const typedBRSR = this.allBrsrData.filter((item: any) => item.brsrType === selectedValue);
      const standardAlignments = typedBRSR.map((item: any) => item._id).flat();
      const filtered_data = this.questionnaireList[0]?.answers.filter((questionnaire: any) =>

        questionnaire?.standardAlignment?.some((alignment: any) => standardAlignments.includes(alignment))
      );

      this.filteredData = filtered_data;
      this.filterFormData([{ answers: filtered_data }]);
    } else {
      this.filteredData = this.dataHolder;
      this.filterData(this.selectedCatecory);
    }

  }


  answer(i: number): FormArray {
    return (this.applicantQuestionForm.get('answers') as FormArray).at(i).get("answer") as FormArray;
  }

  subanswar(i: number, j: number): FormArray {
    return this.answer(i).at(j).get("subanswar") as FormArray;
  }

  changeGridValue(data: any): void {
    let gridValue = (((this.applicantQuestionForm.get('answers') as FormArray).at(data.formIndex).get('answer') as FormArray).at(data.gridIndex).get('subanswar') as FormArray).at(data.k).get('grid');
    gridValue.value['gridValue'] = data.data;
  }

  gridArray(i: number, j: number, k: number): FormArray {
    const formArray = this.subanswar(i, j).at(k).get('grid').get('gridValue') as FormArray;
    return formArray;
  }

  openDialog(): void {
    let dialogRef = this.dialog.open(DialogOverviewExampleDialog, {
      width: '900px',
      data: { detail: this.attemptQuestionDetails,role:'assessor' }
    });

    dialogRef.afterClosed().subscribe(result => { });
  }

  getDetailOfAttemptQuestions(): void {
    this.loaderService.showLoading();
    setTimeout(()=>{
      this.apiService.post(`getQuestionsDetailsByApplicantID/${this.applicant_id}`, { type: ['OEM', 'Upstream', 'DownStream'],financialYear:this.financialYear }).subscribe({
        next: (resp: any) => {
          this.loaderService.hideLoading();
          if (resp['status'] === 'success') {
          
  
      let generalCategoryCountIndex=resp['data']?.findIndex((countElementData:any)=>countElementData?.category=="General");
      if(this.statusList?.sector!=='Automobile' && this.statusList?.sector!=='Auto-components'){
       let automobileCategoryCount=resp['data']?.find((countElementData:any)=>countElementData?.category=="Automobile Sector");
  
       resp['allQuestionCount']= resp['allQuestionCount']-automobileCategoryCount?.total_count;
       if(this.statusList?.standAs=="Upstream"){
        resp['allQuestionCount']=resp['allQuestionCount']- 19;
       }else if(this.statusList?.standAs=="DownStream"){
        resp['allQuestionCount']=resp['allQuestionCount']- 45;
       }else if(this.statusList?.standAs=="Upstream-Service"){
        resp['allQuestionCount']=resp['allQuestionCount']- 32;
       }
  
       
       resp['totals']['total_count']=resp['allQuestionCount'];
       let automobileCategoryCountIndex=resp['data']?.findIndex((countElementData:any)=>countElementData?.category=="Automobile Sector");
       resp['data'].splice(automobileCategoryCountIndex, 1);
     }
     resp['data'][generalCategoryCountIndex].total_count= resp['data'][generalCategoryCountIndex].total_count-1;
           resp['data'].filter((item:any)=>{
             item.total_count=item?.attempt_count;
             item.total_count=item?.attempt_count;
  
             return item;
           })
           this.attemptQuestionDetails=resp;
          //FilterBy Category
  
   let totalObtendMarks:number=0;
  
   setTimeout(()=>{
    const updatedData = resp['data'].map((real: any) => {
      let totalMaxMark:number=0;
      let obtainedMarks = 0;
      if(this.dataForMarkCounter?.length>0){
        this.dataForMarkCounter[0].answers.map((item:any)=>{
          // console.log(item.obtendMark);
        })
        this.dataForMarkCounter[0].answers.filter((item: any) => {
          if (item.category === real.category) {
            obtainedMarks += Number(item.obtendMark);
            totalObtendMarks += Number(item.obtendMark);
            totalMaxMark +=Number(item.maxMark);
            return true;
          }
          return false;
        });
      }
  
      // Return the updated item with the obtainedMarks
  
      return { ...real, obtainedMarks: obtainedMarks,totalMaxMark:totalMaxMark };
    });
  
    this.attemptQuestionDetails['data'] = updatedData;
    this.attemptQuestionDetails['totals']['totalObtained'] = totalObtendMarks;
    this.totalObtendMark = totalObtendMarks;
   },1000);
  
          }
        },
        error: (err: any) => {
          this.loaderService.hideLoading();
        }
      })
    },1000);
 
  }


 
  getApplicantData(): void {
    this.loaderService.showLoading();
    let userId = this.applicant_id;
    this.apiService.post('get-all-user', { applicant_id: userId, financialYear:this.financialYear }).subscribe({
      next: (resp: any) => {
        this.loaderService.hideLoading();
        if (resp['status'] === 'success') {
          if (resp['data']?.length > 0) {
            
            this.statusList = resp['data'][0];

          }
        }
      },
      error: (err: any) => {
        this.loaderService.hideLoading();
      },

    })
  }

  getAllBRSRMasterData(): void {
    this.loaderService.showLoading();
    this.apiService.get('getAllBrsrData').subscribe({
      next: (resp: any) => {
        if (resp['status'] === 'success') {
          this.allBrsrData = resp['data'];
        }
      },
      error: (err: any) => {
        // console.log(err);
      }
    })
  }

  assessment:string='';
  alldata:any[]=[];

  getAllQuestionnaire(): void {
    this.loaderService.showLoading();
    this.apiService.post(`get-questionnaire`,{id:this.applicant_id,financialYear:this.financialYear}).subscribe({
      next: (resp: any) => {
        this.loaderService.hideLoading();
        // console.log(resp);
        this.isAssessorFinalSubmit=resp['data']?.[0].assessor_submmited_status;
        this.publeshedStatus=resp['data'][0]?.isPublishedScoreCard || false;
        // let filteredData = this.utilityService.filterQuestionaireMarks(resp['data']);
        let filteredData = this.utilityService.filterQuestionaireMarksForAssessor(resp['data']);
        this.alldata=filteredData;
        filteredData[0].totalMarks =  filteredData[0].answers.reduce((acc, item) => acc + (item.maxMark || 0), 0);
        this.dataHolder = filteredData;
        this.dataForMarkCounter = filteredData;
        this.questionnaireList = filteredData;
        this.assessment = resp['assessment'];
        this.filteredData = filteredData;
        this.filterFormData(filteredData);
      },
      error: (err: any) => {
        this.loaderService.hideLoading();
      }
    });
  }

questionnaireSeriesList:any[]=[];
  getQuestionnaireSeries(): void{
    let data = {};
    data["userId"] = this.applicant_id ? this.applicant_id : this.userMeta?._id
    data["role"] = this.userMeta?.role;
    data['financialYear']=this.financialYear;
    this.apiService.post('get-applicants-questionnaire', data).subscribe({
      next:(resp:any)=>{
        // console.log(resp);
        this.questionnaireSeriesList=resp['data']['assessorResp'];
      },
      error:(err:any)=>{
        console.log(err);
      }
    });
  }


  filterData(category: string) {
    if (category !== 'Workforce' && category !== 'Document') {
      this.isWorkforce = false;
      this.isDocuments = false;
      let filtered_data = this.questionnaireList[0]?.answers.filter((questionnaire: any) => questionnaire.category === category);

      filtered_data[0]['answers']?.filter((item: any, index: number) => {
        
        if (this.userMeta?.role == 'admin') {
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

   
  // 7318211262 //viraj verma
          });
          this.selectedCatecory = category;
      this.filteredData = filtered_data;
      this.filterFormData([{ answers: filtered_data }]);
    } else if(category == 'Workforce'){
      this.isWorkforce = true;
      this.isDocuments = false;
      this.selectedCatecory = category;
    }else if(category == 'Document'){
      this.isWorkforce=false;
      this.isDocuments = true;
      this.selectedCatecory = category;
    }
    
  }

  filterFormData(data: any[]): void {
    if (data?.length > 0) {
      let control = this.applicantQuestionForm.get('answers') as FormArray;
      control.clear(); // Clear existing form array
      let count:number = 0;
      let filteredData = [...data[0].answers]; // Creates a copy of the array, reverses it, and assigns it to 'a'
 
      // console.log(this.questionnaireSeriesList);
     let filteredAndSorted = this.questionnaireSeriesList
     .filter(q => q.category === this.selectedCatecory)
     .sort((a, b) => a.position - b.position);
     let dataHolder=[...filteredData,...filteredAndSorted];
      filteredAndSorted = Array.from(
        new Map(dataHolder.map(item => [item.questionId, item])).values()
      );
      
     filteredAndSorted.forEach((itm: any) => {
        let item= filteredData.find((items:any)=> itm.questionId ==items.questionId);

       if (item.answer && Array.isArray(item.assessorResp)) {
  item.type?.forEach((i: any) => {
    if (i == "Upstream-Service") {
      count = count + 1;
    }
  });

  control.push(
    this._formBuilder.group({
      type: [item.type],
      assignmentYear: [item.assignmentYear],
      category: [item.category],
      section: [item.section],
      subSection: [item.subSection],
      questionOrderNo: [item.questionOrderNo],
      maxMark: [item.maxMark],
      applicantResponse: [item.applicantResponse || ""],
      appli_obtendOption: [item.appli_obtendOption || ""],
      standardAlignment: [item.standardAlignment],
      question: [item.question],
      assessorResponse: [item.assessorResponse || ""],
      assessorComment: [item.assessorComment],
      applicantAnswer: [item.applicantAnswer || {}],
      assessorAnswer: [item.assessorAnswer || {}],
      adminComment: [item.adminComment],
      obtendMark: [item.obtendMark],
      description: [item.description],
      answerType: [item.answerType],

      answer: this._formBuilder.array(
        item.answer.map((question: any) =>
          this._formBuilder.group({
            answerLabel: [question.answerLabel],
            ansValue: [question.ansValue],
            sortOrder: [question.sortOrder],
            score: [question.score],
            assessorOption: [question.assessorOption || []],
            assessorOptionType: [question.assessorOptionType],
            subAnswer: [question.subAnswer],
            subAnswerType: [question.subAnswerType],

            subanswar: this._formBuilder.array(
              (question.subanswar && Array.isArray(question.subanswar)
                ? question.subanswar
                : []
              ).map((subQuestion: any) =>
                this._formBuilder.group({
                  subAnswerLabel: [subQuestion.subAnswerLabel],
                  subscore: [subQuestion.subscore],
                  gridLabel: [subQuestion.gridLabel],
                  assessorOption: [subQuestion.assessorOption || []],
                  assessorOptionType: [subQuestion.assessorOptionType],
                  subAnswerTypes: [subQuestion.subAnswerTypes],
                  ansValue: [subQuestion.ansValue],
                  textTypeVal: [subQuestion.textTypeVal],
                  uploadTypeVal: [subQuestion.uploadTypeVal],
                  isTypeNumericText: [subQuestion.isTypeNumericText],
                  numericTypeVal: [subQuestion.numericTypeVal],
                  isTypeText: [subQuestion.isTypeText],
                  isUploadText: [subQuestion.isUploadText],

                  // ✅ handle Grid safely
                  grid:
                    subQuestion?.subAnswerTypes === "Grid"
                      ? this._formBuilder.group({
                          gridValue: this._formBuilder.array(
                            (Array.isArray(subQuestion.grid?.gridValue)
                              ? subQuestion.grid.gridValue
                              : []
                            ).map((row: any) =>
                              this._formBuilder.group({
                                ...Object.keys(row).reduce((controls, key) => {
                                  if (key !== "assessorOption") {
                                    controls[key] = [row[key]];
                                  }
                                  return controls;
                                }, {} as any),
                                assessorOption: [
                                  Array.isArray(row.assessorOption)
                                    ? row.assessorOption
                                    : [],
                                ],
                              })
                            )
                          ),
                        })
                      : this._formBuilder.group({}),
                })
              )
            ),
          })
        )
      ),
    })
  );
} else {
  console.warn("item.answer is undefined or not an array", item);
}

       
     
      });
      console.log('Form value after adding items:', this.applicantQuestionForm.value);
    }
  }



  getApplicantDocumentFiles(id:string){
    // http://staging-ecoedge.evalue8.info:3000/uploads/1727763161129-5d3360a442f1c7b1fd9c9529c159b59a.pdf
    this.loaderService.showLoading();
    this.apiService.post('get-applicant-document',{id:id,financialYear:this.financialYear}).subscribe({
      next:(resp:any)=>{
        this.loaderService.hideLoading();
        if(resp['status'] =='success'){
          if(resp['data']?.length>0){
            // url.split(".")[url.split(".")?.length-1]
            let mappedData = resp['data']
            .filter((doc: any) => doc?.docFile) // Filter documents that have a `docFile`
            .map((doc: any) => {
              const fileExtension = doc.docFile.split(".").pop(); // Extract the file extension
              return {
                ...doc, // Keep the original file URL
                extension: fileExtension, // Include the file extension
                
              };
            });
            this.documentsData=mappedData;
           
          }
      
        }
        this.getAssessorDocumentFiles(id);
      },
      error:(err:any)=>{
       this.loaderService.hideLoading();
       this.getAssessorDocumentFiles(id);
      }
    })
  }

  getAssessorDocumentFiles(id:string){
    this.loaderService.showLoading();
    this.apiService.post('get-assessor-document',{applicant_id:id,financialYear:this.financialYear}).subscribe({
      next:(resp:any)=>{
        this.loaderService.hideLoading();
        if(resp['status'] =='success'){
            let mappedData = resp['data']
            .filter((doc: any) => doc?.docFile) // Filter documents that have a `docFile`
            .map((doc: any) => {
              const fileExtension = doc.docFile.split(".").pop(); // Extract the file extension
              return {
                ...doc, // Keep the original file URL
                extension: fileExtension, // Include the file extension
                
              };
            });
            this.documentsData=[...this.documentsData,...mappedData];
          }
      
        // }
      },
      error:(err:any)=>{
       this.loaderService.hideLoading();
      }
    })
  }


  changeQuestionnaireStatus(approval: string, appliStatus: string): void {
    if (approval == 'approve') {
      this.alertService.confirmDialog("Approval", "Are you sure, you want to approve.").subscribe({
        next: (status: boolean) => {
          if (status == true) {
            this.changeStatus({ admin_approval: 'approved', appli_submmited_status: appliStatus });
          }
        }
      });
    } else {
      this.alertService.passMessage("Request Info", "Information required from applicant.",this.applicant_id).subscribe({
        next: (isMessage: any) => {
          // if (isMessage?.textMessage) {
            if (isMessage) {
            this.changeStatus({ admin_approval: approval, appli_submmited_status: appliStatus, adminReasonMessage: isMessage?.textMessage });
          }
        }
      })
    }


  }

  getSelectedQuestion(control:any):any{
    let question=control.answer.find((item:any)=>item?.ansValue==item?.answerLabel);
    if(question){
      if(question?.assessorSelecedResp){
        return question.assessorSelecedResp;
      }else{
       return question.ansValue
      }
 
    }
  }


  changeStatus(data: any): void {
    this.loaderService.showLoading();
    data['id']=this.applicant_id;
    this.apiService.post('updateQuestionnaireApproval', data).subscribe({
      next: (resp: any) => {
        this.loaderService.hideLoading();
        if (resp['status'] === 'success') {
          this.alertService.successSnackBar(resp['message'], 'OK', 'top-right');
          // if (data.admin_approval === 'reject') {
            this.router.navigate(['/dashboard/applicant-list']);
          // }
        }
      },
      error: (err: any) => {
        this.loaderService.hideLoading();
      }
    });
  }

  getAssessorQuestion(controls:any):any{

    let question=controls.answer.find((item:any)=>item?.ansValue==item?.answerLabel);
    if(question){
      if(question?.assessorSelecedResp){
        return question.assessorSelecedResp;  

      }else{
        return question.ansValue
      }

  }
}
}

