import { Component } from '@angular/core';
import {MatSelectModule} from '@angular/material/select';
import {MatRadioModule} from '@angular/material/radio';
import { CommonModule } from '@angular/common';
import {MatTableModule} from '@angular/material/table';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { NumbersOnlyDirective } from '../../../../directive/numbers-only.directive';

@Component({
  selector: 'app-total-revenue',
  standalone: true,
  imports: [CommonModule,MatSelectModule,MatRadioModule,MatTableModule,
            FormsModule,ReactiveFormsModule,MatFormFieldModule,MatInputModule,
            NumbersOnlyDirective
  ],
  templateUrl: './total-revenue.component.html',
  styleUrl: './total-revenue.component.css'
})
export class TotalRevenueComponent {
  infoAvailability: string = ''; // Variable to hold the selected value
}
