import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AssessordialogComponent } from './assessordialog.component';

describe('AssessordialogComponent', () => {
  let component: AssessordialogComponent;
  let fixture: ComponentFixture<AssessordialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AssessordialogComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(AssessordialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
