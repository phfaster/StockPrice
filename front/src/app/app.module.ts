import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { DatePipe } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgxChartsModule } from '@swimlane/ngx-charts';
import { NgxPageScrollModule } from 'ngx-page-scroll';
import { LineChartComponent } from './line-chart/line-chart.component';


import { AppComponent } from './app.component';
import { BannerVideoComponent } from './banner-video/banner-video.component';
import { StockPricesComponent } from './stock-prices/stock-prices.component';
import { StockPricesService } from './stock-prices.service';
import { AppRoutingModule } from './app-routing.module';

import { HttpClientModule } from '@angular/common/http';
import { StockPriceDetailComponent } from './stock-price-detail/stock-price-detail.component';
import { StockBoxesComponent } from './stock-boxes/stock-boxes.component';


@NgModule({
  declarations: [
    AppComponent,
    BannerVideoComponent,
    StockPricesComponent,
    StockPriceDetailComponent,
    LineChartComponent,
    StockBoxesComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    FormsModule,
    AppRoutingModule,
    HttpClientModule,
    NgxChartsModule,
    NgxPageScrollModule
  ],
  providers: [StockPricesService, DatePipe],
  bootstrap: [AppComponent]
})
export class AppModule { }
