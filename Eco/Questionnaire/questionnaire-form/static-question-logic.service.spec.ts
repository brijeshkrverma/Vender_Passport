import { TestBed } from '@angular/core/testing';

import { StaticQuestionLogicService } from './static-question-logic.service';

describe('StaticQuestionLogicService', () => {
  let service: StaticQuestionLogicService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(StaticQuestionLogicService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
