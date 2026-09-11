import { CommonModule } from '@angular/common';
import { Component, Inject, Optional } from '@angular/core';
import {
  FormsModule,
  ReactiveFormsModule,
  FormArray,
  FormBuilder,
  FormGroup,
  FormControl,
  Validators
} from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialogContent,
  MatDialogModule,
  MatDialogRef,
  MatDialogTitle
} from '@angular/material/dialog';
import { MaxWordLengthDirective } from '../../../directive/max-word-length.directive';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';

@Component({
  selector: 'app-assessordialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatDialogTitle,
    MatDialogContent,
    MatDialogModule,
    MatButtonModule,
    MatDividerModule,
    MaxWordLengthDirective
  ],
  templateUrl: './assessordialog.component.html',
  styleUrl: './assessordialog.component.css'
})
export class AssessordialogComponent {
  optionForm: FormGroup;
  answerType: string = 'radio';

  constructor(
    private fb: FormBuilder,
    @Inject(MAT_DIALOG_DATA) public data: any,
    @Optional() public dialogRef: MatDialogRef<AssessordialogComponent>
  ) {
    this.optionForm = this.fb.group({
      assessorOptionType: [this.data?.assessorOptionType || this.answerType],
      assessorGuidence: [this.data?.assessorGuidence || ''],
      assessorOption: this.fb.array([])
    });

    this.initializeForm();
  }

  get assessorOptions(): FormArray {
    return this.optionForm.get('assessorOption') as FormArray;
  }

  assessorOption(): FormArray {
    return this.optionForm.get('assessorOption') as FormArray;
  }

  subOption(i: number): FormArray {
    return this.assessorOption().at(i).get('subOption') as FormArray;
  }

  initializeForm() {
    const options = this.data?.assessorOption || [];
    options.forEach((option: any) => {
      const optionGroup = this.fb.group({
        assessorOptionType: [option.assessorOptionType || this.answerType],
        assessorGuidence: [option.assessorGuidence || ''],
        option: [option.option || ''],
        isSelected: [option.isSelected || false],
        marksnotapplicable: [option.marksnotapplicable || false],
        marks: new FormControl(
          { value: option.marks || '', disabled: !!option.marksnotapplicable }
        ),
        id: [option.id || Date.now()],
        subOption: this.fb.array([])
      });

      const subOptions = option.subOption || [];
      subOptions.forEach((sub: any) => {
        this.subOptionFrom(optionGroup).push(this.fb.group({
          option: [sub.option || ''],
          isSelected: [sub.isSelected || false],
          marksnotapplicable: [sub.marksnotapplicable || false],
          marks: new FormControl(
            { value: sub.marks || '', disabled: !!sub.marksnotapplicable }
          ),
          id: [sub.id || Date.now()]
        }));
      });

      this.assessorOptions.push(optionGroup);
    });
  }

  subOptionFrom(group: FormGroup): FormArray {
    return group.get('subOption') as FormArray;
  }

  addOption() {
    this.assessorOptions.push(
      this.fb.group({
        assessorOptionType: [this.optionForm.get('assessorOptionType')?.value || this.answerType],
        assessorGuidence: [''],
        option: [''],
        isSelected: [false],
        marksnotapplicable: [false],
        marks: new FormControl('', Validators.required),
        id: [Date.now()],
        subOption: this.fb.array([])
      })
    );
  }

  addsubOption(): FormGroup {
    return this.fb.group({
      option: [''],
      isSelected: [false],
      marksnotapplicable: [false],
      marks: new FormControl('', Validators.required),
      id: [Date.now()]
    });
  }

  addSubAnswer(i: number) {
    this.subOption(i).push(this.addsubOption());
  }

  removeOption(index: number) {
    this.assessorOptions.removeAt(index);
  }

  removeSubOption(i: number, j: number) {
    this.subOption(i).removeAt(j);
  }

  checkStatus(event: any, i: number) {
    const control = this.assessorOptions.at(i).get('marks');
    if (event.target.checked) {
      control?.disable();
      control?.setValue('');
    } else {
      control?.enable();
    }
  }

  checkSubStatus(event: any, i: number, j: number) {
    const control = this.subOption(i).at(j).get('marks');
    if (event.target.checked) {
      control?.disable();
      control?.setValue('');
    } else {
      control?.enable();
    }
  }

  changeOptionType(event: any) {
    this.optionForm.patchValue({ assessorOptionType: event.target.value });
  }

  changeSubOptionType(event: any, i: number) {
    const selected = event.target.value;
    this.assessorOption().at(i).patchValue({ assessorOptionType: selected });
  }

  get formIsValid(): boolean {
    return this.assessorOptions.controls.every((control: any) => {
      const option = control.get('option')?.value?.trim();
      const marks = control.get('marks')?.value;
      return option && (control.get('marksnotapplicable')?.value || marks >= 0);
    });
  }

 submitData() {
  console.log('Form Value:', this.optionForm.value);
  setTimeout(() => this.dialogRef.close(this.optionForm.value), 100); // delay close
}
}
