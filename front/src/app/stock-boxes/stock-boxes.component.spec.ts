import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { StockBoxesComponent } from './stock-boxes.component';

describe('StockBoxesComponent', () => {
  let component: StockBoxesComponent;
  let fixture: ComponentFixture<StockBoxesComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ StockBoxesComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(StockBoxesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
