import { Component } from '@angular/core';
import { MatDivider } from '@angular/material/divider';
import { MatStepperModule } from '@angular/material/stepper';
import { MatRadioModule } from '@angular/material/radio';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { FormControl } from '@angular/forms';
@Component({
  selector: 'app-questionnarie-list-applicant',
  standalone: true,
  imports: [MatDivider, MatStepperModule, MatRadioModule, MatCheckboxModule],
  templateUrl: './questionnarie-list-applicant.component.html',
  styleUrl: './questionnarie-list-applicant.component.css'
})
export class QuestionnarieListApplicantComponent {
  a: any;
  myControl = new FormControl();
}
