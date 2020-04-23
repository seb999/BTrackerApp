import { TestBed } from '@angular/core/testing';

import { MqttService } from './mqtt.service';

describe('MqttService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: MqttService = TestBed.get(MqttService);
    expect(service).toBeTruthy();
  });
});
