import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { StockPricesComponent } from './stock-prices/stock-prices.component';
import { StockPriceDetailComponent } from './stock-price-detail/stock-price-detail.component';

const routes: Routes = [
  { path: '', component: StockPricesComponent, pathMatch: 'full' },
  { path: 'history/:symbol', component: StockPriceDetailComponent }
];

@NgModule({
  imports: [ RouterModule.forRoot(routes) ],
  exports: [
    RouterModule
  ]
})
export class AppRoutingModule {

}
