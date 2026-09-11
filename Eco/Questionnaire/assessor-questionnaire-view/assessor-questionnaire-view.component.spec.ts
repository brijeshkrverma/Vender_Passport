import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AssessorQuestionnaireViewComponent } from './assessor-questionnaire-view.component';

describe('AssessorQuestionnaireViewComponent', () => {
  let component: AssessorQuestionnaireViewComponent;
  let fixture: ComponentFixture<AssessorQuestionnaireViewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AssessorQuestionnaireViewComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(AssessorQuestionnaireViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
