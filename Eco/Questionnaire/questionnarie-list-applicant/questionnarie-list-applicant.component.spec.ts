import { ComponentFixture, TestBed } from '@angular/core/testing';

import { QuestionnarieListApplicantComponent } from './questionnarie-list-applicant.component';

describe('QuestionnarieListApplicantComponent', () => {
  let component: QuestionnarieListApplicantComponent;
  let fixture: ComponentFixture<QuestionnarieListApplicantComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QuestionnarieListApplicantComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(QuestionnarieListApplicantComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
