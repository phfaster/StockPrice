import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { StockPriceDetailComponent } from './stock-price-detail.component';

describe('StockPriceDetailComponent', () => {
  let component: StockPriceDetailComponent;
  let fixture: ComponentFixture<StockPriceDetailComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ StockPriceDetailComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(StockPriceDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
