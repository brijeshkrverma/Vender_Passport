import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddQuestionnaireComponent } from './add-questionnaire.component';

describe('AddQuestionnaireComponent', () => {
  let component: AddQuestionnaireComponent;
  let fixture: ComponentFixture<AddQuestionnaireComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddQuestionnaireComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(AddQuestionnaireComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
