import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AssessorAssessmentDetailComponent } from './assessor-assessment-detail.component';

describe('AssessorAssessmentDetailComponent', () => {
  let component: AssessorAssessmentDetailComponent;
  let fixture: ComponentFixture<AssessorAssessmentDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AssessorAssessmentDetailComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(AssessorAssessmentDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
