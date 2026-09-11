import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FormGridComponent } from './form-grid.component';

describe('FormGridComponent', () => {
  let component: FormGridComponent;
  let fixture: ComponentFixture<FormGridComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormGridComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(FormGridComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
