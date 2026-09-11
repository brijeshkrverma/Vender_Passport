import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {MatRadioModule} from '@angular/material/radio';

@Component({
  selector: 'app-scientific-calculator',
  standalone: true,
  imports: [FormsModule,MatRadioModule,CommonModule],
  templateUrl: './scientific-calculator.component.html',
  styleUrl: './scientific-calculator.component.css'
})
export class ScientificCalculatorComponent {
 
  // categories = [
    
  //   {
  //     name: 'Area',
  //     units: [
  //       { name: 'Square Kilometer', factor: 1000000 },
  //       { name: 'Square Meter', factor: 1 },
  //       { name: 'Square Centimeter', factor: 0.0001 },
  //       { name: 'Square Millimeter', factor: 0.000001 },
  //       { name: 'Acre', factor: 4046.86 },
  //       { name: 'Hectare', factor: 10000 },
  //       { name: 'Square Mile', factor: 2589988.11 },
  //       { name: 'Square Yard', factor: 0.836127 },
  //       { name: 'Square Foot', factor: 0.092903 },
  //       { name: 'Square Inch', factor: 0.00064516 },
  //     ],
  //   },
  //   {
  //     name: 'Volume',
  //     units: [
  //       { name: 'Cubic Meter', factor: 1 },
  //       { name: 'Liter', factor: 0.001 },
  //       { name: 'Milliliter', factor: 0.000001 },
  //       { name: 'Cubic Centimeter', factor: 0.000001 },
  //       { name: 'Cubic Foot', factor: 0.0283168 },
  //       { name: 'Cubic Inch', factor: 0.0000163871 },
  //       { name: 'Gallon', factor: 0.00378541 },
  //       { name: 'Quart', factor: 0.000946353 },
  //       { name: 'Pint', factor: 0.000473176 },
  //     ],
  //   },
  //   {
  //     name: 'Mass',
  //     units: [
  //       { name: 'Kilogram', factor: 1 },
  //       { name: 'Gram', factor: 0.001 },
  //       { name: 'Milligram', factor: 0.000001 },
  //       { name: 'Metric Ton', factor: 1000 },
  //       { name: 'Pound', factor: 0.453592 },
  //       { name: 'Ounce', factor: 0.0283495 },
  //     ],
  //   },
  //   {
  //     name: 'Energy',
  //     units: [
  //       { name: 'Joule', factor: 1 },
  //       { name: 'Kilojoule', factor: 1000 },
  //       { name: 'Calorie', factor: 4.184 },
  //       { name: 'Kilocalorie', factor: 4184 },
  //       { name: 'Watt-hour', factor: 3600 },
  //       { name: 'Kilowatt-hour', factor: 3600000 },
  //       { name: 'British Thermal Unit (BTU)', factor: 1055.06 },
  //     ],
  //   },
  // ];

  categories = [
    {
      name: 'Area',
      units: [
        { name: 'Square Kilometer', factor: 1000000 },
        { name: 'Square Meter', factor: 1 },
        { name: 'Square Centimeter', factor: 0.0001 },
        { name: 'Square Millimeter', factor: 0.000001 },
        { name: 'Acre', factor: 4046.86 },
        { name: 'Hectare', factor: 10000 },
        { name: 'Square Mile', factor: 2589988.11 },
        { name: 'Square Yard', factor: 0.836127 },
        { name: 'Square Foot', factor: 0.092903 },
        { name: 'Square Inch', factor: 0.00064516 },
      ],
    },
    {
      name: 'Volume',
      units: [
        { name: 'Cubic Meter', factor: 1 },
        { name: 'Liter', factor: 0.001 },
        { name: 'Milliliter', factor: 0.000001 },
        { name: 'Cubic Centimeter', factor: 0.000001 },
        { name: 'Cubic Foot', factor: 0.0283168 },
        { name: 'Cubic Inch', factor: 0.0000163871 },
        { name: 'Gallon', factor: 0.00378541 },
        { name: 'Quart', factor: 0.000946353 },
        { name: 'Pint', factor: 0.000473176 },
      ],
    },
    {
      name: 'Mass',
      units: [
        { name: 'Kilogram', factor: 1 },
        { name: 'Gram', factor: 0.001 },
        { name: 'Milligram', factor: 0.000001 },
        { name: 'Metric Ton', factor: 1000 }, // Already present
        { name: 'Ton', factor: 907.1847 }, // Added Ton (short ton, US customary)
        { name: 'Pound', factor: 0.453592 },
        { name: 'Ounce', factor: 0.0283495 },
      ],
    },
    {
      name: 'Energy',
      units: [
        { name: 'Joule', factor: 1 },
        { name: 'Kilojoule', factor: 1000 },
        { name: 'Megajoule', factor: 1000000 },
        { name: 'Calorie', factor: 4.184 },
        { name: 'Kilocalorie', factor: 4184 },
        { name: 'Watt-hour', factor: 3600 },
        { name: 'Kilowatt-hour', factor: 3600000 },
        { name: 'British Thermal Unit (BTU)', factor: 1055.06 },
      ],
    },
  ];
  
  

  selectedCategory = this.categories[0];
  selectedFromUnit = this.selectedCategory.units[0];
  selectedToUnit = this.selectedCategory.units[0];
  fromValue = 1;
  result: number = 0;

  onCategoryChange(event: any) {
    // Reset units when category changes
    this.selectedFromUnit = this.selectedCategory.units[0];
    this.selectedToUnit = this.selectedCategory.units[0];
  }

  convert() {
    const fromFactor = this.selectedFromUnit.factor;
    const toFactor = this.selectedToUnit.factor;

    if (this.selectedCategory.name === 'Temperature') {
      this.result = this.convertTemperature(this.fromValue, this.selectedFromUnit, this.selectedToUnit);
    } else {
      this.result = (this.fromValue * fromFactor) / toFactor;
    }
  }

  convertTemperature(value: number, fromUnit: any, toUnit: any): number {
    let resultInCelsius = value;

    // Convert to Celsius if necessary
    if (fromUnit.name === 'Fahrenheit') {
      resultInCelsius = (value - fromUnit.offset) / fromUnit.factor;
    } else if (fromUnit.name === 'Kelvin') {
      resultInCelsius = value - fromUnit.offset;
    }

    // Convert from Celsius to the target unit
    if (toUnit.name === 'Fahrenheit') {
      return resultInCelsius * toUnit.factor + toUnit.offset;
    } else if (toUnit.name === 'Kelvin') {
      return resultInCelsius + toUnit.offset;
    }

    return resultInCelsius; // Celsius remains unchanged
  }
}