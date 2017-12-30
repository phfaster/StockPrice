import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { BannerVideoComponent } from './banner-video.component';

describe('BannerVideoComponent', () => {
  let component: BannerVideoComponent;
  let fixture: ComponentFixture<BannerVideoComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ BannerVideoComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(BannerVideoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
