import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ScientificCalculatorComponent } from './scientific-calculator.component';

describe('ScientificCalculatorComponent', () => {
  let component: ScientificCalculatorComponent;
  let fixture: ComponentFixture<ScientificCalculatorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ScientificCalculatorComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ScientificCalculatorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
