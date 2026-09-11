
import { Component, OnInit, ViewChild, Input, Output, EventEmitter, ChangeDetectorRef, OnChanges, SimpleChanges } from '@angular/core';
import { FormArray, FormGroup, FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatTable, MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule, NgFor } from '@angular/common';
import { debounceTime, distinctUntilChanged, Observable, switchMap } from 'rxjs';
import { MatSelectModule } from '@angular/material/select';
import { StorageService } from '../../../../../services/utility/storage.service';
import { UtilityService } from '../../../../../services/utility/utility.service';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { NumbersOnlyDirective } from '../../../../../directive/numbers-only.directive';
import { RightClickDialogDirective } from '../../../../../directive/right-click-dialog.directive';
import { AssessordialogComponent } from '../../../assessordialog/assessordialog.component';
import { MatDialog } from '@angular/material/dialog';
// Grid formula engine — backend save pe bhi bilkul yahi module chalta hai,
// isliye browser aur server ka nateeja hamesha ek jaisa rehta hai.
import { evaluateFormulas, computedCellKeys } from '../../../../../../../Backend/scoring/grid-formula';

interface FormControlData {
  val: string;
  type: string;
  isChange?:boolean
}

@Component({
  selector: 'app-form-grid',
  standalone: true,
  imports: [CommonModule,MatCheckboxModule, MatButtonModule, MatTableModule, ReactiveFormsModule,
     NgFor, FormsModule, MatSelectModule,NumbersOnlyDirective,RightClickDialogDirective],
  templateUrl: './form-grid.component.html',
  styleUrls: ['./form-grid.component.css']
})
export class FormGridComponent implements OnInit, OnChanges {
  @ViewChild(MatTable, { static: true }) table!: MatTable<any>;
  displayedColumns: string[] = ['0'];
  columnsToDisplay: string[] = this.displayedColumns.slice();
  myformArray: FormArray;
  @Input() gridInput: any;
  @Input() changeFormValue?:Observable<any>;
  

  @Output() chengeGridValue: EventEmitter<any> = new EventEmitter();

  /**
   * Un formulas ka nateeja jinka target KISI AUR question me hai.
   *
   * Engine khud ye value nahi likh sakta — uske paas doosre question ka access
   * nahi hai. Isliye wo `{ target, value }` laut'ta hai aur ye component parent
   * (questionnaire-form) ko de deta hai, jo asli question dhoondh kar patch karta hai.
   *
   * Jaise: energy grid ka "Renewable %" -> "type of renewable energy sources"
   * question ke "Renewable Energy % of total energy consumption" field me.
   */
  @Output() crossQuestionValue: EventEmitter<any[]> = new EventEmitter();
  isApplicantForm: Boolean = false;
  userMeta: String = '';
  updatedKey: string = '';
  isDisabled:boolean = true;
  colRow: String[] = ['00', '01', '02', '03', '04', '05', '06', '07', '08', '09', '010', '011', '012', '013', '014', '015', '016', '017', '018', '019', '020',
    '10', '20', '30', '40', '50', '60', '70', '80', '90', '100','110', '120', '130', '140', '150', '160', '170',
    '180', '190', '200', '210', '220','230','240','250','260','270','280','290','300'
  ];


  constructor(private storageService: StorageService,
    private cd: ChangeDetectorRef,
    private utilityService:UtilityService,
     public dialog: MatDialog,
  ) {
    this.myformArray = new FormArray([
      new FormGroup({
         '00': new FormControl('')
        }),
      
    ]);
    // console.log(this.gridInput);
    
  }
  ngOnChanges(changes: SimpleChanges): void {
  //   this.changeFormValue?.subscribe((value: any) => {
  //      this.initilizeAppliData();
  //      console.log("value: ",value);
  //      console.log(this.gridInput?.value);
       
  // });

  if (changes['changeFormValue'] && this.changeFormValue) {
    this.changeFormValue.subscribe((value: any) => {
      this.initilizeAppliData();
      this.cd.detectChanges();  
    });
  }
  console.log(this.gridInput?.value);

  }


  ngOnInit(): void {
    this.storageService.getStorage('EcoUser').subscribe({
      next: (user: any) => {
        if (user !== null) {
          this.userMeta = user.role;
        }
      }
    })
    this.initilizeAppliData();

    //changing value of Grid form
    this.myformArray.valueChanges.pipe(
      debounceTime(1000),
      distinctUntilChanged(), // Only emit if value has changed
      switchMap((status: any) => {
        if(this.gridInput){
          const formIndex = this.gridInput.formIndex;
          const k = this.gridInput.k;
          console.log("Enter In File id static code...");
           this.logicalStaicCalculation(formIndex);
           // Admin ke banaye formulas — emit se PEHLE, taaki parent ko computed
           // values hi milein
           this.applyGridFormulas();
          const dynamicObject = {
            gridIndex: this.gridInput.gridIndex,
            formIndex: formIndex,
            k: k,
            data: this.myformArray.value,
            // isDisabled:this.isDisabled
          };
      
          this.chengeGridValue.emit(dynamicObject);
        }
      
        return []; // Replace with an observable if needed
      })
    ).subscribe();
  }

  // chengeisFirstRowColDisabled(isDisabled:boolean){
  //   console.log(isDisabled);
  //   this.isDisabled=isDisabled;
  //   // if(this.isDisabled==false){
  //   //   this.colRow.push(...this.colCol);
  //   //   console.log(this.colRow);
  //   // }else{
  //   //   this.colCol.forEach((item:any)=>{
  //   //    let index= this.colRow.findIndex((it:any)=>it==item);
  //   //     this.colRow.splice(index, 1);
  //   //   });
  //   // }
  // }

  logicalStaicCalculation(formIndex:any):void{
      this.utilityService.setCalculatedValue(this.gridInput?.category, formIndex,this.myformArray,this.gridInput?.questionId,this.gridInput?.sector);
  }

  // ===========================================================================
  // GRID FORMULAS — admin ke banaye hue calculations
  //
  // Admin ne question banate waqt jo formula lagaya (jaise R4C4 = R1C1 + R2C4),
  // wo yahan chalta hai — jaise hi applicant koi value bharta hai.
  //
  // Ye component applicant, assessor aur admin — teeno views me use hota hai,
  // isliye formula ek hi jagah lagane se sab jagah chal jaata hai.
  //
  // ⚠ Ye sirf UI ki suvidha hai. Target cell disabled hota hai, par usse devtools
  //   se badla ja sakta hai — isliye backend save pe formula DOBARA chalata hai.
  //   Bharosa backend ke nateeje pe hai, browser ke bheje number pe nahi.
  // ===========================================================================

  /** Question pe lage formulas (gridInput se aate hain). */
  private get gridFormulas(): any[] {
    const f = this.gridInput?.gridFormulas;
    return Array.isArray(f) ? f : [];
  }

  /** Kya is cell ki value formula se aati hai — to applicant use bhar nahi sakta. */
  isComputedCell(i: number, j: string): boolean {
    if (!this.gridFormulas.length) return false;
    return computedCellKeys(this.gridFormulas).indexOf(`${i.toString()}${j}`) >= 0;
  }

  /**
   * Formulas chalao aur target cells bhar do.
   *
   * `emitEvent: false` zaroori hai — warna patch karne se valueChanges dobara
   * chalega aur infinite loop ban jayega.
   */
  private applyGridFormulas(): void {
    const formulas = this.gridFormulas;
    if (!formulas.length) return;

    // Formula me grid ke bahar wale sub-answer inputs bhi ho sakte hain
    // (jaise "Consent to operate (KL)"), isliye wo bhi engine ko dete hain.
    const out = evaluateFormulas(this.myformArray.value, formulas, this.gridInput?.gridSubs);

    formulas.forEach((f: any) => {
      if (!f?.target) return;
      const key = `${f.target.row}${f.target.col}`;
      const newVal = out.computed[key];
      if (newVal === undefined) return;

      const cell: any = this.myformArray.at(f.target.row)?.get(key);
      if (!cell) return;

      const valCtrl = cell.get ? cell.get('val') : null;
      if (valCtrl && String(valCtrl.value ?? '') !== String(newVal)) {
        valCtrl.patchValue(newVal, { emitEvent: false, onlySelf: true });
      }
    });

    // Jinka target doosre question me hai — unhe parent ko de do
    if (Array.isArray(out.crossQuestion) && out.crossQuestion.length) {
      this.crossQuestionValue.emit(out.crossQuestion);
    }

    if (out.warnings.length) console.warn('Grid formula:', out.warnings.join(' | '));
  }

  initilizeAppliData(): void {    
    if (this.gridInput?.appliData !== undefined) {
      this.displayedColumns = [];
      if (this.gridInput.appliData?.length > 0) {
        console.log("Initial State:  ",this.gridInput);
        Object.keys(this.gridInput?.appliData[0].value).forEach(((item: any, i: number) => {
          if(item !=='assessorOption'){
            this.displayedColumns.push(i.toString());
          }
   
        }));
        this.columnsToDisplay = [...this.displayedColumns];
        // console.log(this.columnsToDisplay);
        this.myformArray = new FormArray(this.gridInput?.appliData.map((item:any, j:number) => {
          const group = new FormGroup({});
          Object.entries(item.value).forEach(([key, value]) => {
            // console.log(key,"  :  ",value);
            
            if (this.isFormControlData(value)) {
              let controlValue: any = value;
              group.addControl(key, new FormGroup({
                val: new FormControl(controlValue.val || ''),
                type: new FormControl(controlValue.type),
                disabled:new FormControl(controlValue?.disabled || false),
                isChange: new FormControl(controlValue?.isChange || false),
                // formula ke liye chuna hua cell — edit mode me bhi bacha rehna chahiye
                isCalc: new FormControl(controlValue?.isCalc || false)
              }));
            } else {
              group.addControl(key, new FormControl(value));
            }
          });
          return group;
        }));

        if( this.gridInput?.isGridDisabled){
          this.myformArray.disable();
        }
        // console.log(this.myformArray.value);
      }
      if (this.gridInput?.role == undefined) {
        this.isApplicantForm = true
      }

    }

  }

  getIsChange(control: any): boolean {
  if (control instanceof FormGroup) {
    return control.get('isChange')?.value === true;
  }
  return false;
}



  isFormControlData(value: any): value is FormControlData {
    return value && typeof value === 'object' && 'val' in value && 'type' in value;
  }

  checkDisabledFunction(i: Number, j: String): Boolean {
    let index = this.colRow.findIndex((item: string) => item === `${i.toString()}${j}`);
    // let celIndex = this.colCol.findIndex((item: string) => item === `${i.toString()}${j}`);
    return (((index !== (-1))) && this.isApplicantForm) ? true : false;
    // if(this.isDisabled !==null && this.isDisabled !==undefined){
    //   return (((index !== (-1)) || (celIndex !==(-1))) && this.isApplicantForm) ? true : false;
    // }else{
     
    // }
   
  }
  checkIsInputType(i: number, j: string): boolean {
    let index = this.colRow.findIndex((item: string) => item === `${i.toString()}${j}`);
    
    if ((index !== (-1)) && this.userMeta == 'admin') {
      return false;
    } else if (this.isApplicantForm) {
      return false;
    }
    else {
      return true;
    }

  }


  /**
   * "Add Calc" — ye asli input type nahi hai.
   *
   * Type dropdown me hi ek option rakha gaya hai jisse admin cell ko formula ke
   * liye select/deselect karta hai. Choose karte hi dropdown wapas apne asli type
   * (text/number/dropdown) pe chala jaata hai — sirf `isCalc` flag toggle hota hai.
   *
   * Marked cells hi formula popup me clickable hote hain. Isse admin ko poore grid
   * me se sirf wahi cells dikhte hain jo usne khud chune the.
   */
  private readonly CALC_OPTION = '__calc__';

  isCalcCell(i: number, j: string): boolean {
    const cell = this.myformArray.at(i)?.get(`${i.toString()}${j}`);
    return cell?.value?.isCalc === true;
  }

  updateFormArrayKey(i: number, j: string, event: any): void {
    const newType = (event.target as HTMLSelectElement).value;
    const key = `${i.toString()}${j}`;
    const cell: any = this.myformArray.at(i).get(key);

    if (newType === this.CALC_OPTION) {
      // Flag toggle karo, type ko haath mat lagao
      const nowCalc = !(cell.value?.isCalc === true);
      if (cell.get && cell.get('isCalc')) cell.get('isCalc').patchValue(nowCalc);
      else if (cell.addControl) cell.addControl('isCalc', new FormControl(nowCalc));
      else cell.value['isCalc'] = nowCalc;

      // dropdown wapas asli type pe — warna "Add Calc" hi selected dikhta rahega
      const realType = cell.value?.type || 'text';
      (event.target as HTMLSelectElement).value = realType;
      if (cell.get && cell.get('type')) cell.get('type').patchValue(realType);

      this.myformArray.updateValueAndValidity({ onlySelf: false, emitEvent: true });
      this.cd.detectChanges();
      return;
    }

    this.updatedKey = key;
    this.myformArray.at(i).get(key).value['type'] = newType;
  }


  // updateFormArrayKey(i: number, j: string, event: any): void {
  //   const formControl = this.myformArray.at(i).get(`${i.toString()}${j}`);
    
  //   if (event.target.value === 'false' || event.target.value === 'true') {
  //     // Enable or disable the form control based on the value
  //     if (event.target.value === 'true') {
  //       formControl.disable(); // Use the disable() method to disable the form control
  //     } else {
  //       formControl.enable(); // Use the enable() method to enable the form control
  //     }
  //   } else {
  //     // Update the 'type' of the form control's value
  //     const newType = (event.target as HTMLSelectElement).value;
  //     this.updatedKey = `${i.toString()}${j}`;
  //     // Update the 'type' inside the value of the form control
  //     formControl.patchValue({
  //       ...formControl.value,
  //       type: newType
  //     });
  //   }
  // }
  



  getControls(data: any): any  {
    if (data !== null) {
      if (data instanceof FormGroup || data instanceof FormArray || data instanceof FormControl) {
        if(data.get('type')?.value=='number'){
          if (data.get('val')?.value !== undefined && data.get('val')?.value !== null) {
            return data.get('val') || new FormControl('');  
          }else{
            data.get('val').patchValue('',{onlySelf: true});
            this.cd.detectChanges();
            return data.get('val');
          }
        }
        if (data.get('val')?.value !== undefined && data.get('val')?.value !== null) {
          return data.get('val');
        } else {
          return data;
        }

      }
    }
  }

   setIsChangeControls(data: any): any  {
    if (data !== null) {
      if (data instanceof FormGroup || data instanceof FormArray || data instanceof FormControl) {
          if (data.get('isChange')?.value !== undefined && data.get('isChange')?.value !== null) {
            return data.get('isChange') || new FormControl(false);  
          }else{
            data.get('isChange').patchValue(false,{onlySelf: true});
            this.cd.detectChanges();
            return data.get('isChange');
          }
      }
    }
  }

  // chengeDisableCell(i: number, j: string, event: any){
  //   const newType = (event as MatCheckboxChange ).checked;
  //   this.myformArray.at(i).get(`${i.toString()}${j}`).value['disabled'] = newType;
  //   console.log( this.myformArray.at(i).get(`${i.toString()}${j}`).value['disabled']);
  // }

  getControlsDisable(control: any):any {
    if (control instanceof FormGroup || control instanceof FormArray || control instanceof FormControl) {
        return control.get('disabled'); // This will return true if the control is disabled
    }
    return control; // Return null if the control is not found
}

  getDisabledField(data:any):any{
    if (data instanceof FormGroup || data instanceof FormArray || data instanceof FormControl) {
    return  (data.get('disabled')?.value==true || data.get('disabled')?.value=='true')?true:false;
    }

  }
  


  
  

  getTypeControls(data: any): any {
    if (data !== null) {
      if (data instanceof FormGroup || data instanceof FormArray || data instanceof FormControl) {
        if (data.get('type')?.value !== undefined && data.get('type')?.value !== null) {
          return data.get('type');
        } else {
          return data;
        }
      }
    }
    return;
  }

  getControlsType(data: any): any {
    if (data !== null) {
      if (data instanceof FormGroup || data instanceof FormArray || data instanceof FormControl) {
        if (data.get('val')?.value !== undefined && data.get('val')?.value !== null) {
          return data.get('type').value;
        } else {
          return 'text';
        }
      }
    }
    return;
  }
  




  getControlValue(control: any): string {
    if (control && control.value && typeof control.value === 'object' && control.value.val !== undefined) {
      return control.value.val;
    }
    return '';
  }



  addRow() {
    const rowIndex = this.myformArray.length;
    const newRow = new FormGroup({});
  
    this.displayedColumns.forEach((col) => {
      let newKey: string;
      newKey = `${rowIndex}${col}`;
  
      newRow.addControl(
        newKey,
        new FormGroup({
          val: new FormControl(''),
          type: new FormControl('text'),
          isChange: new FormControl(false),
          isCalc: new FormControl(false)
        })
      );
    });
  
    // Add `assessorOption` as a FormControl with default value `[]`
    newRow.addControl('assessorOption', new FormControl([]));
  
    this.myformArray.push(newRow);
    this.table.renderRows();
  }
  


  addColumn() {
    const colIndex = this.displayedColumns.length;
    const newColHeader = `${colIndex}`;
    this.displayedColumns.push(newColHeader);
    this.columnsToDisplay = [...this.displayedColumns];
    (this.myformArray as any).controls.forEach((row: FormGroup, rowIndex: any) => {
      // let index = this.colRow.findIndex((item: string) => item === `${rowIndex.toString()}${colIndex}`);
      let newKey: string;
      newKey = `${rowIndex}${colIndex}`;
      
      (row as FormGroup).addControl(newKey, new FormGroup({
        val: new FormControl(''),
        type: new FormControl('text'),
        isChange: new FormControl(false),
        isCalc: new FormControl(false)
      }));


    });
  }
  
changeInput(event:any,i:any,j:string,data:any){
  console.log(event.target.value);
  console.log(i," : ",j);
  let findData = this.colRow.find((item: string) => item === `${i.toString()}${j}`);
   console.log(findData);
   console.log(data.value);
  let control = (this.setIsChangeControls(data.get(i.toString() + j)) as FormControl);
  // control.patch
  control.patchValue(true);
  console.log(control);
  
}
  

  addGridAssessorOption(i: number) {
  console.log("Okay");

  let formGroup = (this.myformArray as FormArray).at(i) as FormGroup;

  const dialog = this.dialog.open(AssessordialogComponent, {
    data: formGroup?.value || [],
  });

  dialog.afterClosed().subscribe(result => {
    console.log('Dialog result:', result);

    if (result && result.assessorOption) {

      // assessorOption
      let optionControl = formGroup.get('assessorOption') as FormControl;
      if (optionControl) {
        optionControl.patchValue(result.assessorOption, { onlySelf: true });
      } else {
        formGroup.addControl('assessorOption', new FormControl(result.assessorOption));
      }

      // assessorOptionType (FIXED: previously incorrect)
      let typeControl = formGroup.get('assessorOptionType') as FormControl;
      if (typeControl) {
        typeControl.patchValue(result.assessorOptionType, { onlySelf: true });
      } else {
        formGroup.addControl('assessorOptionType', new FormControl(result.assessorOptionType));
      }

      // assessorGuidence
      let guidanceControl = formGroup.get('assessorGuidence') as FormControl;
      if (guidanceControl) {
        console.log('Patching existing assessorGuidence:', result.assessorGuidence);
        if (result.assessorGuidence) {
          guidanceControl.patchValue(result.assessorGuidence);
        }
      } else {
        console.log('Adding new assessorGuidence control with value:', result.assessorGuidence);
        formGroup.addControl('assessorGuidence', new FormControl(result.assessorGuidence));
      }

      // Update form array
      this.myformArray.updateValueAndValidity({ onlySelf: false, emitEvent: true });
      console.log('Updated form array value:', this.myformArray.value);
    }
  });
}

  




  // delete(index: number) {
  //   this.myformArray.removeAt(index);
  // }

  // getFormDataAs2DArray(): any[] {
  //   const formDataAsArray = [];
  //   this.myformArray.controls.forEach((row: FormGroup) => {
  //     const rowData = {};
  //     Object.keys(row.controls).forEach(key => {
  //       rowData[key] = row.get(key).value;
  //     });
  //     formDataAsArray.push(rowData);
  //   });
  //   return formDataAsArray;
  // }

onValueChange(event: Event, element: Map<string, any>, rowIndex: number, column: number | string): void {
  const input = event.target as HTMLInputElement;
  const value = input.value === 'N/A' || input.value === '' ? 0 : Number(input.value);

  this.getControls(element.get(rowIndex.toString() + column.toString()))?.setValue(value);
}

}