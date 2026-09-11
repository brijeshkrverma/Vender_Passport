import { Component, OnInit } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { NgSelectModule } from '@ng-select/ng-select';
import { AngularEditorConfig, AngularEditorModule } from '@kolkov/angular-editor';
import { FormArray, FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatDividerModule } from '@angular/material/divider';
import { MatRadioModule } from '@angular/material/radio';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { AlertService } from '../../../services/alert.service';
import { ApiService } from '../../../services/api.service';
import { LoaderService } from '../../../services/utility/loader.service';
// import { GeneralComponent } from './form-type-components/general/general.component';
import { StorageService } from '../../../services/utility/storage.service';
import { MaxWordLengthDirective } from '../../../directive/max-word-length.directive';
@Component({
  selector: 'app-add-questionnaire',
  standalone: true,
  imports: [
    NgSelectModule,
    CommonModule,
    AngularEditorModule,
    MatRadioModule,
    HttpClientModule,
    RouterOutlet,
    RouterLink,
    MaxWordLengthDirective,
    ReactiveFormsModule,
    FormsModule,
    CommonModule,
    MatDividerModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  templateUrl: './add-questionnaire.component.html',
  styleUrl: './add-questionnaire.component.css'
})
export class AddQuestionnaireComponent implements OnInit {
  devloperform: FormGroup;

  constructor(private fb: FormBuilder,
    private alertService: AlertService,
    private apiService: ApiService,
    private loaderService: LoaderService,
    public storageService: StorageService
  ) {
    this.devloperform = this.fb.group({
      type: ['', Validators.required],
      assignmentYear: ['', Validators.required],
      category: ['', Validators.required],
      section: [''],
      subSection: [''],
      questionOrderNo: ['', Validators.required],
      maxMark: [''],
      question: ['', Validators.required],
      description: [''],
      answerType: [''],

      answer: this.fb.array([]),
    });
  }

  ngOnInit(): void {
    // this.devloperform.valueChanges.subscribe({
    //   next: (status: any) => {
    //     // console.log(this.devloperform.value);
    //   }
    // });
  }

  skills(): FormArray {
    return this.devloperform.get("answer") as FormArray;
  }



  subanswar(empIndex: number): FormArray {
    return this.skills().at(empIndex).get("subanswar") as FormArray;
  }

  addskill() {
    const skill = this.fb.group({
      answerLabel: new FormControl(''),
      sortOrder: new FormControl(''),
      score: new FormControl(''),
      subAnswer: new FormControl('no', Validators.required),
      subAnswerType: [''],
      subanswar: this.fb.array([]),
    });
    this.skills().push(skill);
  }

  addsubanswar(): FormGroup {
    return this.fb.group({
      subAnswerLabel: new FormControl(''),
      subscore: new FormControl(''),
      gridLabel: new FormControl(''),
    });
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

  people: any[] = [
    { id: 1, name: 'General' },
    { id: 2, name: 'Decarbonization' },
    { id: 3, name: 'Circularity' },
    { id: 4, name: 'Health & Safety' },
    { id: 5, name: 'Human Rights' },
    { id: 6, name: 'Automobile Sector' }
  ];


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
  cars: any[] = [
    { id: 1, type: 'OEM' },
    { id: 2, type: 'Upstream' },
    { id: 3, type: 'DownStream' },
  ];

  toggleDisabled() {
    const car: any = this.cars[1];
    car.disabled = !car.disabled;
  }



  submitForm(): void {
    this.devloperform.markAllAsTouched();
    if (this.devloperform.valid) {
      this.loaderService.showLoading();
      this.apiService.post('createQuestionnaire', this.devloperform.value).subscribe({
        next: (resp: any) => {
          // console.log(resp);
          this.loaderService.hideLoading();
          if (resp['status'] == 'success') {
            this.alertService.successSnackBar(resp['message'], 'OK', 'top-right');
            this.devloperform.reset();
          } else {
            this.alertService.errorSnackBar("Please Check...", 'Error', 'top-right');
          }
        },
        error: (err: any) => {
          this.loaderService.hideLoading();
          this.alertService.errorSnackBar(err.error.messgae, 'Error', 'top-right');
        }
      })
    } else {
      // this.alertService.errorSnackBar("Form is not valid. Please check the fields and try again.", 'OK', 'top-right');

    }
  }
}
