import { TestBed } from '@angular/core/testing';

import { CheckAlarmService } from './check-alarm.service';

describe('CheckAlarmService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: CheckAlarmService = TestBed.get(CheckAlarmService);
    expect(service).toBeTruthy();
  });
});
