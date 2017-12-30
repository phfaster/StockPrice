import { TestBed, inject } from '@angular/core/testing';

import { StockPricesService } from './stock-prices.service';

describe('StockPricesService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [StockPricesService]
    });
  });

  it('should be created', inject([StockPricesService], (service: StockPricesService) => {
    expect(service).toBeTruthy();
  }));
});
