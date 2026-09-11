import { CommonModule } from "@angular/common";
import { Component, Inject, Input, OnInit, Optional } from "@angular/core";
import { MAT_DIALOG_DATA, MatDialogActions, MatDialogClose, MatDialogContent, MatDialogRef, MatDialogTitle } from "@angular/material/dialog";
import { StorageService } from "../../../../services/utility/storage.service";
import {MatIconModule} from '@angular/material/icon';
import { Router, RouterModule } from "@angular/router";

@Component({
  selector: 'questionnair-detail-view',
  templateUrl: 'dialog-overview-example-dialog.html',
  styleUrls: ['../questionnaire-form.component.css'],
  standalone: true,
  imports: [CommonModule, MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatIconModule,
    RouterModule,
    MatDialogClose,]
})
export class DialogOverviewExampleDialog implements OnInit {
  //if pass data from 
  @Input() passData: any;
  isShowButtons: boolean = true;
  isShow: boolean = false;
  isShowSubmitButton: boolean = false;
  modalData: any;
  isFinalSubmit: boolean = false;
  isShowError: boolean = false;
  constructor(
    public dialogRef: MatDialogRef<DialogOverviewExampleDialog>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    public storageService: StorageService,
    private router:Router
  ) {
    console.log(data);
    console.log(this.passData);
    setTimeout(() => {
      console.log("Data:  ", data);
      //id data is empty and data getting from passData (@Input)
      if (this.isEmpty(this.data)) {
        this.modalData = this.passData || [];
        this.isShowButtons = false;
      } else {
        //if data getting from action button
        if (this.data?.role == 'applicant' || this.data?.role == 'assessor' || this.data?.role == 'vcp') {
          console.log("OK", data);
          this.isShowSubmitButton = true;
          this.isFinalSubmit = data?.isSubmit ? true : false;
        }
        this.modalData = this.data.detail;
        this.isShowButtons = true;
      }
      // if(this.modalData?.data[0]?.attempt_count==15){
      //   this.modalData['data'][0]['attempt_count']=16;
      //  this.modalData['totals']['attempt_count']= this.modalData?.allQuestionCount
      // }
      //If action from admin
      if (this.storageService.isAdmin()) {
        this.isShowButtons = false;
      }
      this.isShow = true;
    }, 800);
  };
  userMeta:any={};
  ngOnInit(): void {
    this.storageService.getStorage('EcoUser').subscribe({
      next: (user: any) => {
        if (user !== null) {
          this.userMeta = user;
        }
      }
    });
  }
  close(){
    this.dialogRef.close(false);
  }

  isEmpty(obj: any): boolean {
    return Object.keys(obj).length === 0;
  }

  onNoClick(category_name: string): void {
    this.dialogRef.close({ category_name: category_name });
  }


  finalSubmit(): void {
    this.dialogRef.close(true);
  }

  goToViewQuestionnaire(){
    console.log(this.userMeta?._id);
    this.router.navigate(['/dashboard/applicant-questionnaire-view',this.userMeta?._id]
    );
  }

}
