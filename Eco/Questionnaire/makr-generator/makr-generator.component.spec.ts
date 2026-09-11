import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MakrGeneratorComponent } from './makr-generator.component';

describe('MakrGeneratorComponent', () => {
  let component: MakrGeneratorComponent;
  let fixture: ComponentFixture<MakrGeneratorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MakrGeneratorComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(MakrGeneratorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
