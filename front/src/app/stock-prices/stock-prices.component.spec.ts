import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { StockPricesComponent } from './stock-prices.component';

describe('StockPricesComponent', () => {
  let component: StockPricesComponent;
  let fixture: ComponentFixture<StockPricesComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ StockPricesComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(StockPricesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
