import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ScopeEmissionsComponent } from './scope-emissions.component';

describe('ScopeEmissionsComponent', () => {
  let component: ScopeEmissionsComponent;
  let fixture: ComponentFixture<ScopeEmissionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ScopeEmissionsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ScopeEmissionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
