import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../../services/api.service';
import { LoaderService } from '../../../services/utility/loader.service';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { FormGridComponent } from '../add-questionnaire/form-type-components/form-grid/form-grid.component';
import { MatRadioModule } from '@angular/material/radio';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { UtilityService } from '../../../services/utility/utility.service';
import { MatChipsModule } from '@angular/material/chips';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertService } from '../../../services/alert.service';
import { DialogOverviewExampleDialog } from '../questionnaire-form/dialog/dialog-overview-example.component';
import { MatDialog } from '@angular/material/dialog';
import { WorkforceoardComponent } from '../../workforceoard/workforceoard.component';
import { MaxWordLengthDirective } from '../../../directive/max-word-length.directive';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { filter, finalize, switchMap, firstValueFrom } from 'rxjs';
import { MatTableModule } from '@angular/material/table';
import { NumbersOnlyDirective } from '../../../directive/numbers-only.directive';
import { StorageService } from '../../../services/utility/storage.service';
import { InnerDropdownComponent } from '../../applicant/list-applicant/inner-dropdown/inner-dropdown.component';


@Component({
  selector: 'app-questionnaire-answer-view',
  standalone: true,
  imports: [CommonModule, WorkforceoardComponent, MatChipsModule, MatDividerModule, ReactiveFormsModule,
     FormGridComponent, MatCardModule, MatRadioModule,MatTooltipModule,MatCheckboxModule,InnerDropdownComponent,
    MaxWordLengthDirective,MatTableModule,NumbersOnlyDirective],
  templateUrl: './applicant-questionnaire-answer-view.component.html',
  styleUrl: './applicant-questionnaire-answer-view.component.css'
})
export class ApplicantQuestionnaireAnswerViewComponent implements OnInit {
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
  financialYear:string= new Date().getFullYear().toString();
  statusList: any = {};
  // isPublishedScoreCard
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
    // console.log(this.applicant_id);
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
          return this.apiService.post('change-status-of-scorecard', {isPublishedScoreCard:!this.publeshedStatus,applicant_id:this.applicant_id,financialYear:this.financialYear}).pipe(
            finalize(() => this.loaderService.hideLoading())
          );
        })
      )
      .subscribe({
        next: (resp: any) => {
          if (resp['status'] === 'success') {
            console.log(resp);
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
  

  getBrsrBySA(standeredAlign: any): string[] {
    let brsrData: any[] = [];
    if(standeredAlign?.length>0){
      standeredAlign.forEach((item: any) => {
        let d = this.allBrsrData.find(o => o._id === item);
        brsrData.push(d?.brsrType);
      });
    }


    return brsrData;
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
      console.log(filtered_data);
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
      data: { detail: this.attemptQuestionDetails,role:'applicant' }
    });

    dialogRef.afterClosed().subscribe(result => { });
  }

  getDetailOfAttemptQuestions(): void {
    this.loaderService.showLoading();
    // `getQuestionsDetailsByApplicantID/${userId}`,{type:this.type}
    setTimeout(()=>{
      this.apiService.post(`getQuestionsDetailsByApplicantID/${this.applicant_id}`, { type: ['OEM', 'Upstream', 'DownStream'], financialYear:this.financialYear}).subscribe({
        next: (resp: any) => {
          this.loaderService.hideLoading();
          if (resp['status'] === 'success') {
            console.log(resp);
            
  
      let generalCategoryCountIndex=resp['data']?.findIndex((countElementData:any)=>countElementData?.category=="General");
       console.log(this.statusList)
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
  
      let obtainedMarks = 0;
      // console.log(this.dataForMarkCounter);
      if(this.dataForMarkCounter?.length>0){
        this.dataForMarkCounter[0].answers.filter((item: any) => {
          if (item.category === real.category) {
            obtainedMarks += Number(item.obtendMark);
            totalObtendMarks += Number(item.obtendMark);
            return true;
          }
          return false;
        });
      }
  
      // console.log(filteredItems);
      // Return the updated item with the obtainedMarks
  
      return { ...real, obtainedMarks: obtainedMarks };
    });
  
    console.log(updatedData);
    this.attemptQuestionDetails['data'] = updatedData;
    this.attemptQuestionDetails['totals']['totalObtained'] = totalObtendMarks;
    this.totalObtendMark = totalObtendMarks;
   },1000);
  
          }
        },
        error: (err: any) => {
          this.loaderService.hideLoading();
          // console.log(err.error.message);
        }
      })
    },1000);
 
  }

  getApplicantData(): void {
    this.loaderService.showLoading();
    let userId = this.applicant_id;
    this.apiService.post('get-all-user', { applicant_id: userId,financialYear:this.financialYear }).subscribe({
      next: (resp: any) => {
        this.loaderService.hideLoading();
        if (resp['status'] === 'success') {
          console.log(resp);
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

  assessment:string='';;


  getAllQuestionnaire(): void {
    this.loaderService.showLoading();
    this.apiService.post(`get-questionnaire`,{id:this.applicant_id,financialYear:this.financialYear}).subscribe({
      next: (resp: any) => {
        this.loaderService.hideLoading();
        // console.log(resp);
        this.isAssessorFinalSubmit=resp['data']?.[0].assessor_submmited_status;
        this.publeshedStatus=resp['data'][0]?.isPublishedScoreCard || false;
        let filteredData = this.utilityService.filterQuestionaireMarks(resp['data']);
          // let filteredData = this.utilityService.filterQuestionaireMarksForAssessor(resp['data']);
        console.log("Filtered Data from utility: ", filteredData[0].answers.map((a:any) => ({ q: a.question, obtend: a.obtendMark, ansValue: a.answer?.map((ans:any) => ans.ansValue), score: a.answer?.map((ans:any) => ans.score) })));
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


  filterData(category: string) {
    if (category !== 'Workforce' && category !== 'Document') {
      this.isWorkforce = false;
      this.isDocuments = false;
      let filtered_data = this.questionnaireList[0]?.answers.filter((questionnaire: any) => questionnaire.category === category);
      this.filteredData = filtered_data;
      console.log(filtered_data);
      this.filterFormData([{ answers: filtered_data }]);
    } else if(category == 'Workforce'){
      this.isWorkforce = true;
      this.isDocuments = false;
    }else if(category == 'Document'){
      this.isWorkforce=false;
      this.isDocuments = true;
    }
    this.selectedCatecory = category;
  }

  filterFormData(data: any[]): void {
    if (data?.length > 0) {
      let control = this.applicantQuestionForm.get('answers') as FormArray;
      control.clear(); // Clear existing form array
      console.log(data);
      let count:number = 0;
      let a = [...data[0].answers]; // Creates a copy of the array, reverses it, and assigns it to 'a'
    
      a.forEach((item: any) => {
        if (item.answer && Array.isArray(item.answer)) {
          // console.log(item.question,"  :  ",item.type);
          item.type?.forEach((i:any)=>{
            if(i=="Upstream-Service"){
              count = count + 1;
            }
          });
          // console.log(count);
          control.push(
            this._formBuilder.group({
              type: [item.type],
              assignmentYear: [item.assignmentYear],
              category: [item.category],
              section: [item.section],
              subSection: [item.subSection],
              questionOrderNo: [item.questionOrderNo],
              maxMark: [item.maxMark],
              applicantResponse:[item.applicantResponse || ''],
              appli_obtendOption: [item.appli_obtendOption || ''],
              standardAlignment: [item.standardAlignment],
              question: [item.question],
              assessorResponse:[item.assessorResponse || ''],
              assessorComment: [item.assessorComment],
              applicantAnswer: [item.applicantAnswer || {}],
              adminComment: [item.adminComment],
              obtendMark: [item.obtendMark],
              description: [item.description],
              answerType: [item.answerType],
              answer: this._formBuilder.array(
                item.answer.map((question: any) => this._formBuilder.group({
                  answerLabel: [question.answerLabel],
                  ansValue: [question.ansValue],
                  sortOrder: [question.sortOrder],
                  score: [question.score],
                  assessorOption: [question.assessorOption || []],
                  assessorOptionType:[question.assessorOptionType],
                  subAnswer: [question.subAnswer],
                  subAnswerType: [question.subAnswerType],
                  subanswar: this._formBuilder.array(
                    question.subanswar && Array.isArray(question.subanswar) ?
                      question.subanswar.map((subQuestion: any,i:number) => this._formBuilder.group({
                        subAnswerLabel: [subQuestion.subAnswerLabel],
                        subscore: [subQuestion.subscore],
                        gridLabel: [subQuestion.gridLabel],
                        assessorOption: [subQuestion.assessorOption || []],
                        assessorOptionType:[subQuestion.assessorOptionType],
                        subAnswerTypes: [subQuestion.subAnswerTypes],
                        ansValue: [subQuestion.ansValue],
                        textTypeVal: [subQuestion.textTypeVal],
                        uploadTypeVal: [subQuestion.uploadTypeVal],
                        isTypeNumericText:[subQuestion.isTypeNumericText],
                        numericTypeVal: [subQuestion.numericTypeVal],
                        isTypeText: [subQuestion.isTypeText],
                        isUploadText: [subQuestion.isUploadText],
                        // grid: subQuestion.subAnswerTypes === 'Grid'  ? this._formBuilder.group({
                        //   gridValue: this._formBuilder.array(
                        //     subQuestion.grid.gridValue.map((gridVal: any) => {
                        //       console.log(gridVal);
                        //       if(gridVal?.assessorOption){
                        //         delete gridVal.assessorOption;
                        //       }
                        //       this._formBuilder.control(gridVal);
                        //     })
                        //   )
                        // }) : this._formBuilder.group({}) // Empty group if not 'Grid'
                        grid: subQuestion.subAnswerTypes === 'Grid'
                        ? this._formBuilder.group({
                            gridValue: this._formBuilder.array(
                              subQuestion.grid.gridValue.map((gridVal: any) => {
                                if (gridVal?.assessorOption) {
                                  delete gridVal.assessorOption; // Remove the assessorOption key
                                }
                                return this._formBuilder.control(gridVal); // Return the control for each gridVal
                              })
                            )
                          })
                        : this._formBuilder.group({}) // Empty group if not 'Grid'

                      })) : []
                  )
                }))
              )
            })
          );

           
          // console.log(this.applicantQuestionForm.value);
        } else {
          console.warn('item.answer is undefined or not an array', item);
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
           
          console.log(this.documentsData);
          }
      
        }
        this.getAssessorDocumentFiles(id);
      },
      error:(err:any)=>{
       this.loaderService.hideLoading();
       console.log("Document");
       this.getAssessorDocumentFiles(id);
      }
    })
  }

  getAssessorDocumentFiles(id:string){
    // http://staging-ecoedge.evalue8.info:3000/uploads/1727763161129-5d3360a442f1c7b1fd9c9529c159b59a.pdf
    this.loaderService.showLoading();
    this.apiService.post('get-assessor-document',{applicant_id:id,financialYear:this.financialYear}).subscribe({
      next:(resp:any)=>{
        this.loaderService.hideLoading();
        if(resp['status'] =='success'){
          // if(resp['data']?.length>0){
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
            console.log(mappedData);
            this.documentsData=[...this.documentsData,...mappedData];
          console.log(this.documentsData);
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
    console.log(control.answer)
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
    data['financialYear']=this.financialYear;
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

  downloadPdf(): void {
    this.alertService.confirmDialog('Download PDF', 'Are you sure you want to download the complete questionnaire as a PDF?')
      .subscribe((confirmed: boolean) => {
        if (confirmed) {
          this.loaderService.showLoading();
          setTimeout(async () => {
            try {
              const wf = await this.fetchWorkforceData();
              this.printReport(wf);
            } catch (err) {
              console.error(err);
              this.alertService.errorSnackBar('PDF generation failed.', 'OK', 'top-right');
            } finally {
              this.loaderService.hideLoading();
            }
          }, 100);
        }
      });
  }

  private esc(value: any): string {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private num(v: any): number {
    const n = Number(v);
    return isNaN(n) ? 0 : n;
  }

  private isSelected(type: string | undefined, o: any): boolean {
    if (!o) return false;
    if (type === 'Text' || type === 'Upload') return !!o.ansValue;
    return o.ansValue === true || String(o.ansValue).toLowerCase() === 'true' || o.ansValue === o.answerLabel;
  }

  private async fetchWorkforceData(): Promise<any> {
    try {
      const resp: any = await firstValueFrom(this.apiService.post('getWorkforce', { id: this.applicant_id, financialYear:this.financialYear }));
      if (resp && resp['status'] === 'success' && resp['data']) {
        return resp['data'];
      }
    } catch (e) {
      console.error(e);
    }
    return {};
  }

  private printReport(wf: any): void {
    const host = document.createElement('div');
    host.id = 'report-print-host';
    host.innerHTML = this.reportBody(wf);
    host.style.cssText = 'position:absolute;left:-99999px;top:0;width:794px;';
    document.body.appendChild(host);

    const styleEl = document.createElement('style');
    styleEl.id = 'report-print-style';
    styleEl.textContent = this.reportCss('#report-print-host') + `
      @media print {
        @page { size: A4; margin: 12mm 10mm; }
        body > *:not(#report-print-host) { display: none !important; }
        #report-print-host { position: static !important; left: auto !important; top: auto !important; width: auto !important; display: block !important; }
      }`;
    document.head.appendChild(styleEl);

    setTimeout(() => { window.focus(); window.print(); }, 400);

    const cleanup = () => {
      if (host.parentNode) host.parentNode.removeChild(host);
      if (styleEl.parentNode) styleEl.parentNode.removeChild(styleEl);
    };
    window.addEventListener('afterprint', cleanup);
    setTimeout(cleanup, 60000);
  }

  private reportBody(wf: any): string {
    const company = this.esc(this.statusList?.name || 'N/A');
    const fy = this.esc(this.financialYear);
    const sector = this.esc(this.statusList?.sector || '');
    const standAs = this.esc(this.statusList?.standAs || '');
    const answers: any[] = this.dataHolder?.[0]?.answers || [];

    let body = '';
    body += `<div class="report-header">
        <h1>ECO EDGE &ndash; Questionnaire Report</h1>
        <p><strong>Company:</strong> ${company}${fy ? ` &nbsp;|&nbsp; <strong>Financial Year:</strong> ${fy}` : ''}${sector ? ` &nbsp;|&nbsp; <strong>Sector:</strong> ${sector}` : ''}${standAs ? ` &nbsp;|&nbsp; <strong>Stance:</strong> ${standAs}` : ''}</p>
        <p class="report-date">Downloaded on: ${new Date().toLocaleDateString()}</p>
      </div>`;

    body += this.workforceSection(wf);

    const preferred = ['General', 'Decarbonization', 'Circularity', 'Health & Safety', 'Human Rights', 'Automobile Sector'];
    const cats: string[] = [];
    preferred.forEach(c => { if (answers.some(a => a?.category === c) && !cats.includes(c)) cats.push(c); });
    answers.forEach(a => { if (a?.category && !cats.includes(a.category)) cats.push(a.category); });
    for (const cat of cats) {
      const items = answers.filter(a => a?.category === cat);
      body += `<div class="section-band">${this.esc(cat)} <span class="count">(${items.length})</span></div>`;
      items.forEach((q, i) => body += this.questionHtml(q, i));
    }

    if (this.documentsData?.length) {
      body += `<div class="section-band">Documents <span class="count">(${this.documentsData.length})</span></div>`;
      body += `<table class="grid"><thead><tr><th style="width:36px">#</th><th>File name</th><th>Description</th><th>File</th></tr></thead><tbody>`;
      this.documentsData.forEach((d: any, i: number) => {
        body += `<tr><td>${i + 1}</td><td>${this.esc(d?.docName)}</td><td>${this.esc(d?.description)}</td><td>${d?.docFile ? `<a href="${this.esc(d.docFile)}" target="_blank">${this.esc(d.docFile)}</a>` : '&ndash;'}</td></tr>`;
      });
      body += `</tbody></table>`;
    }

    return body;
  }

  private reportCss(scope = ''): string {
    const sel = (c: string) => scope ? `${scope} ${c}` : c;
    const base = scope || 'body';
    const all = scope ? `${scope} *` : '*';
    return `
      @page { size: A4; margin: 12mm 10mm; }
      ${all} { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      ${base} { font-family: 'Segoe UI', Roboto, Arial, sans-serif; color: #212529; margin: 0; padding: 0; font-size: 13px; line-height: 1.5; }
      ${sel('a')} { color: #f6871f; word-break: break-all; }
      ${sel('.report-header')} { background: #f6871f; color: #fff !important; padding: 16px 20px; border-radius: 8px; margin-bottom: 20px; page-break-after: avoid; }
      ${sel('.report-header h1')} { margin: 0 0 6px; font-size: 20px; color: #fff !important; }
      ${sel('.report-header p')} { margin: 2px 0; font-size: 13px; opacity: .95; color: #fff !important; }
      ${sel('.report-header .report-date')} { font-size: 11px; opacity: .8; color: #fff !important; }
      ${sel('.section-band')} { background: #1F734F; color: #fff !important; padding: 7px 14px; font-size: 14px; font-weight: 600; border-radius: 4px; margin: 20px 0 12px; page-break-after: avoid; }
      ${sel('.section-band .count')} { opacity: .8; font-weight: 400; color: #fff !important; }
      ${sel('.question')} { margin-bottom: 16px; page-break-inside: avoid; }
      ${sel('.question-head')} { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
      ${sel('.question-text')} { font-weight: 600; font-size: 13.5px; color: #0D2940; }
      ${sel('.marks')} { background: #f1f3f5; border: 1px solid #dee2e6; border-radius: 4px; padding: 3px 10px; white-space: nowrap; font-size: 12px; color: #495057; }
      ${sel('.type-tag')} { font-size: 10.5px; color: #6c757d; font-weight: 700; letter-spacing: .5px; margin-top: 8px; }
      ${sel('.answer')} { margin: 6px 0 0 4px; }
      ${sel('.none')} { color: #868e96; font-size: 12.5px; font-style: italic; margin-top: 6px; }
      ${sel('.opt')} { display: flex; align-items: flex-start; gap: 8px; margin: 3px 0; font-size: 13px; }
      ${sel('.opt input')} { margin: 2px 0 0; accent-color: #1F734F; }
      ${sel('.sub')} { margin: 4px 0 4px 24px; }
      ${sel('.sub-opt')} { font-size: 12.5px; }
      ${sel('.text-val')} { margin: 2px 0 4px 26px; font-size: 12.5px; font-weight: 600; white-space: pre-wrap; }
      ${sel('.inner-val')} { margin: 2px 0 4px 26px; font-size: 11.5px; color: #495057; }
      ${sel('table.grid')} { border-collapse: collapse; width: 100%; margin: 6px 0 8px; font-size: 12px; }
      ${sel('table.grid th')} { background: #1F734F; color: #fff !important; border: 1px solid #3f8f6d; padding: 4px 6px; text-align: left; font-weight: 600; }
      ${sel('table.grid td')} { border: 1px solid #adb5bd; padding: 4px 6px; }
      ${sel('table.workforce')} { border-collapse: collapse; width: 100%; margin: 6px 0 10px; font-size: 12.5px; }
      ${sel('table.workforce th, table.workforce td')} { border: 1px solid #adb5bd; padding: 5px 7px; }
      ${sel('table.workforce tr.wf-head th')} { background: #64AE3E; color: #fff !important; }
      ${sel('table.workforce tr.wf-sub td')} { background: #eaf6e4; font-weight: 600; }
      ${sel('table.workforce tr.wf-total td')} { background: #f1f3f5; font-weight: 700; }
    `;
  }

  private workforceSection(wf: any): string {
    if (!wf || typeof wf !== 'object' || Object.keys(wf).length === 0) return '';
    const n = (v: any) => this.num(v);
    const sum = (a: string, b: string) => n(wf[a]) + n(wf[b]);
    const pctOf = (m: number, f: number) => { const t = m + f; return t === 0 ? 0 : Number(((m / t) * 100).toFixed(2)); };
    const pct = (a: string, b: string) => pctOf(n(wf[a]), n(wf[b]));

    let h = `<div class="section-band">Workforce</div>`;
    h += this.wfTable('Employees', 'Male', 'Female', [
      ['Permanent Employees', n(wf.permanentEmployeeMale), pct('permanentEmployeeMale', 'permanentEmployeeFemale'), n(wf.permanentEmployeeFemale), pct('permanentEmployeeFemale', 'permanentEmployeeMale')],
      ['Other than Permanent Employees', n(wf.otherpermanentEmployeeMale), pct('otherpermanentEmployeeMale', 'otherpermanentEmployeeFemale'), n(wf.otherpermanentEmployeeFemale), pct('otherpermanentEmployeeFemale', 'otherpermanentEmployeeMale')],
      ['Total Employees', sum('permanentEmployeeMale', 'otherpermanentEmployeeMale'), pct('permanentEmployeeMale', 'permanentEmployeeFemale'), sum('permanentEmployeeFemale', 'otherpermanentEmployeeFemale'), pct('permanentEmployeeFemale', 'otherpermanentEmployeeMale')]
    ], true);

    h += this.wfTable('Workers', 'Male', 'Female', [
      ['Permanent Workers', n(wf.permanentWorkerMale), pct('permanentWorkerMale', 'permanentWorkerFemale'), n(wf.permanentWorkerFemale), pct('permanentWorkerFemale', 'permanentWorkerMale')],
      ['Other than Permanent Workers', n(wf.otherpermanentWorkerMale), pct('otherpermanentWorkerMale', 'otherpermanentWorkerFemale'), n(wf.otherpermanentWorkerFemale), pct('otherpermanentWorkerFemale', 'otherpermanentWorkerMale')],
      ['Total Workers', sum('permanentWorkerMale', 'otherpermanentWorkerMale'), pct('permanentWorkerMale', 'permanentWorkerFemale'), sum('permanentWorkerFemale', 'otherpermanentWorkerFemale'), pct('permanentWorkerFemale', 'otherpermanentWorkerMale')]
    ], true);

    h += this.wfTable('Differently abled', 'Male', 'Female', [
      ['Differently abled Employees', n(wf.differentlyAbleEmployeeMale), pct('differentlyAbleEmployeeMale', 'differentlyAbleWorkerFemale'), n(wf.differentlyAbleWorkerFemale), pct('differentlyAbleWorkerFemale', 'differentlyAbleEmployeeMale')],
      ['Differently abled Workers', n(wf.differentlyAbleWorkerMale), pct('differentlyAbleWorkerMale', 'differentlyAbleEmployeeFemale'), n(wf.differentlyAbleEmployeeFemale), pct('differentlyAbleEmployeeFemale', 'differentlyAbleWorkerMale')],
      ['Total Differently abled', sum('differentlyAbleEmployeeMale', 'differentlyAbleWorkerMale'), pct('differentlyAbleEmployeeMale', 'differentlyAbleWorkerFemale'), sum('differentlyAbleWorkerFemale', 'differentlyAbleEmployeeFemale'), pct('differentlyAbleWorkerFemale', 'differentlyAbleEmployeeMale')]
    ], true);

    const mEmp = sum('permanentEmployeeMale', 'otherpermanentEmployeeMale');
    const fEmp = sum('permanentEmployeeFemale', 'otherpermanentEmployeeFemale');
    const mWk = sum('permanentWorkerMale', 'otherpermanentWorkerMale');
    const fWk = sum('permanentWorkerFemale', 'otherpermanentWorkerFemale');
    const mDa = sum('differentlyAbleEmployeeMale', 'differentlyAbleWorkerMale');
    const fDa = sum('differentlyAbleWorkerFemale', 'differentlyAbleEmployeeFemale');
    const mAll = mEmp + mWk + mDa;
    const fAll = fEmp + fWk + fDa;

    h += this.wfTable('Composition', 'Male', 'Female', [
      ['Total Employees', mEmp, pctOf(mEmp, fEmp), fEmp, pctOf(fEmp, mEmp)],
      ['Total Workers', mWk, pctOf(mWk, fWk), fWk, pctOf(fWk, mWk)],
      ['Total Differently abled', mDa, pctOf(mDa, fDa), fDa, pctOf(fDa, mDa)],
      ['Total Workforce', mAll, pctOf(mAll, fAll), fAll, pctOf(fAll, mAll)]
    ], true);

    return h;
  }

  private wfTable(title: string, maleLabel: string, femaleLabel: string, rows: any[][], highlightLast: boolean): string {
    let h = `<table class="workforce"><thead><tr class="wf-head">`;
    h += `<th style="text-align:left">${this.esc(title)}</th>`;
    h += `<th colspan="2" style="text-align:center">${this.esc(maleLabel)}</th>`;
    h += `<th colspan="2" style="text-align:center">${this.esc(femaleLabel)}</th>`;
    h += `</tr><tr class="wf-sub">`;
    h += `<td style="text-align:left">Workforce Composition</td><td style="text-align:center">Value</td><td style="text-align:center">%</td><td style="text-align:center">Value</td><td style="text-align:center">%</td>`;
    h += `</tr></thead><tbody>`;
    rows.forEach((r: any[], i: number) => {
      const last = highlightLast && i === rows.length - 1;
      h += `<tr class="${last ? 'wf-total' : ''}"><td style="text-align:left">${this.esc(r[0])}</td>`;
      for (let j = 1; j < 5; j++) {
        h += `<td style="text-align:center">${r[j]}</td>`;
      }
      h += `</tr>`;
    });
    h += `</tbody></table>`;
    return h;
  }

  private questionHtml(q: any, idx: number): string {
    const question = String(q?.question ?? '');
    const obt = q?.obtendMark || 0;
    const max = q?.maxMark || 0;
    let h = `<div class="question">`;
    h += `<div class="question-head"><div class="question-text">Q${idx + 1}: ${question}</div><div class="marks">Marks: ${obt} / ${max}</div></div>`;
    h += `<div class="type-tag">[ ${this.esc(q?.answerType || 'Answer')} ]</div>`;
    const ansArr: any[] = Array.isArray(q?.answer) ? q.answer : [];
    if (!ansArr.length) {
      h += `<div class="none">No answer provided.</div>`;
    } else {
      h += `<div class="answer">`;
      ansArr.forEach(o => {
        h += this.optionHtml(q?.answerType, o);
        const sel = this.isSelected(q?.answerType, o);
        const showSub = sel || q?.answerType === 'Text' || q?.answerType === 'Upload';
        if (showSub && Array.isArray(o?.subanswar) && o.subanswar.length) {
          h += `<div class="sub">`;
          o.subanswar.forEach((sub: any) => h += this.optionHtml(sub?.subAnswerTypes, sub));
          h += `</div>`;
        }
      });
      h += `</div>`;
    }
    h += `</div>`;
    return h;
  }

  private optionHtml(type: string | undefined, o: any): string {
    const lbl = this.esc(o?.displayLabel || o?.answerLabel || o?.subAnswerLabel || '');
    const sel = this.isSelected(type, o);
    let h = '';
    if (type === 'RadioButton') {
      h += `<label class="opt"><input type="radio" disabled ${sel ? 'checked' : ''}><span>${lbl}</span></label>`;
    } else if (type === 'CheckBox') {
      h += `<label class="opt"><input type="checkbox" disabled ${sel ? 'checked' : ''}><span>${lbl}</span></label>`;
    } else if (type === 'Text') {
      h += `<div class="opt"><span>${lbl || 'Answer:'}</span></div>`;
      if (o?.ansValue) h += `<div class="text-val">${this.esc(o.ansValue)}</div>`;
    } else if (type === 'Upload') {
      h += `<div class="opt"><span>${lbl || 'Uploaded file:'}</span></div>`;
      const file = o?.uploadTypeVal || o?.ansValue;
      if (file) h += `<div class="text-val"><a href="${this.esc(file)}" target="_blank">${this.esc(file)}</a></div>`;
    } else if (type === 'Grid') {
      const gLabel = o?.gridLabel || lbl;
      if (gLabel) h += `<div class="opt"><span><strong>${this.esc(gLabel)}</strong></span></div>`;
      h += this.gridHtml(o?.grid?.gridValue);
    }
    if (o?.textTypeVal) h += `<div class="inner-val">Details: ${this.esc(o.textTypeVal)}</div>`;
    if (o?.numericTypeVal) h += `<div class="inner-val">Numeric: ${this.esc(o.numericTypeVal)}</div>`;
    if (o?.uploadTypeVal && type !== 'Upload') h += `<div class="inner-val">File: <a href="${this.esc(o.uploadTypeVal)}" target="_blank">View Attached File</a></div>`;
    return h;
  }

  private gridHtml(gridValue: any): string {
    if (!Array.isArray(gridValue) || gridValue.length === 0) return '';
    const rows: any[] = gridValue;
    const colKeys = Object.keys(rows[0] || {}).filter(k => k !== 'assessorOption');
    if (!colKeys.length) return '';
    const colKeyOf = (k: string) => k.slice(1);
    const cellText = (row: any, key: string) => {
      const cell = row ? row[key] : null;
      if (cell && typeof cell === 'object' && 'val' in cell) return String(cell['val'] ?? '');
      return cell == null ? '' : String(cell);
    };
    const getCell = (row: any, r: number, ck: string) => cellText(row, `${r}${colKeyOf(ck)}`);
    let h = `<table class="grid"><thead><tr>`;
    colKeys.forEach(ck => h += `<th>${this.esc(getCell(rows[0], 0, ck))}</th>`);
    h += `</tr></thead><tbody>`;
    for (let ri = 1; ri < rows.length; ri++) {
      h += `<tr>`;
      colKeys.forEach(ck => h += `<td>${this.esc(getCell(rows[ri], ri, ck))}</td>`);
      h += `</tr>`;
    }
    h += `</tbody></table>`;
    return h;
  }

}
