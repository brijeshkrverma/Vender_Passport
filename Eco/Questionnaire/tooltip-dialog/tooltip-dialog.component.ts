import { CommonModule } from "@angular/common";
import { Component, Inject, Optional } from "@angular/core";
import { MAT_DIALOG_DATA, MatDialogActions, MatDialogClose, MatDialogContent, MatDialogRef, MatDialogTitle } from "@angular/material/dialog";
import { StorageService } from "../../../services/utility/storage.service";
import {MatIconModule} from '@angular/material/icon';
import { ExtractTextPipe } from "../../../extract-text.pipe";

@Component({
  selector: 'tooltip-dialog',
  templateUrl: './tooltip-dialog.html',
  standalone:true,
  imports:[CommonModule,MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatIconModule,
    ExtractTextPipe,
    MatDialogClose,]
})
export class TooltipDialog {

 modalData:any;
  constructor(
    @Optional() public dialogRef: MatDialogRef<TooltipDialog>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    public storageService:StorageService
  ) {
 
  }

  onNoClick(): void {
    this.dialogRef.close();
  }

}
