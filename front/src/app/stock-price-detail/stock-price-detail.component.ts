import {Component, OnDestroy, OnInit, ViewEncapsulation} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Location, DatePipe } from '@angular/common';
import { TransformDate } from '../transformDate';

import { Stock } from '../stock';

import { StockPricesService } from '../stock-prices.service';


interface ChartPrice {
  name: string;
  value: number;
}

interface ChartLine {
  name: string;
  series: ChartPrice[];
}

@Component({
  selector: 'app-stock-price-detail',
  templateUrl: './stock-price-detail.component.html',
  styleUrls: ['./stock-price-detail.component.css'],
  encapsulation: ViewEncapsulation.None
})
export class StockPriceDetailComponent implements OnInit, OnDestroy {
  stock: Stock;

  private typesOrder = ['Open', 'High', 'Low', 'Close', 'Volume'];

  /* Chart settings */
  showFlags = [true, true, true, true];

  // options
  showLegend = false;
  xAxisLabel = 'Minutes';
  yAxisLabel = 'Price';

  signNames = ['open', 'high', 'low', 'close'];
  signColors = ['#d2c479', '#6bb36b', '#e95d5d', '#039be5', 'white'];
  colorScheme = {
    domain: this.signColors
  };

  pricesChart: ChartLine[];
  filteredChart: ChartLine[];
  volumesData: ChartLine;
  /* End Chart settings */

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private location: Location,
    private spp: StockPricesService,
    private date: DatePipe
  ) {}

  /* Get and convert last 60 minutes to chart compatible data series */
  ngOnInit() {
    let symbol = this.route.snapshot.paramMap.get('symbol');
    if (!(symbol = symbol.trim())) {
      return;
    }

    this.spp.getStock(symbol)
      .subscribe(stock => {
        if (!stock) {
          this.router.navigateByUrl('');
          return;
        }

        const stockPrices = stock.prices;

        const pricesChart: ChartLine[] = [
          {name: 'Open', series: []},
          {name: 'High', series: []},
          {name: 'Low', series: []},
          {name: 'Close', series: []}
        ];

        const volumesData: ChartLine = {
          name: 'Volume',
          series: []
        };

        for (const price of stockPrices) {
          this.insertToChart(price, pricesChart, volumesData);
        }

        this.filteredChart = this.pricesChart = pricesChart;
        this.volumesData = volumesData;

        stock.lastPrice = stockPrices[stockPrices.length - 1];
        stock.prices = undefined;

        this.stock = stock;

        this.getPrices(stock);
      });
  }

  /* Convert unixtime to string and price data to chart-compatible object */
  insertToChart(price, pricesChart, volumesData) {
    let k = 0;

    const unixtime = price.time;
    let stringTime;

    for (const priceType of this.typesOrder) {
      const data = {
        name: TransformDate.fromUnixtime(this.date, unixtime),
        value: price.price[priceType]
      };

      if (!stringTime) {
        stringTime = data.name;
      }

      if (priceType === 'Volume') {
        volumesData.series.push(data);
      } else {
        pricesChart[k].series.push(data);
      }

      k++;
    }

    price.timeString = stringTime;
  }

  /* Subscribe to actual last 60 minutes */
  getPrices(stock) {
    stock.status = false;
    stock.alive = this.spp.getPrices(stock, [
      (response, next) => {
        const {timeout} = response;

        if (stock.timeout) {
          clearTimeout(stock.timeout);
        }

        if (timeout) {
          stock.status = true;
          stock.timeout = setTimeout(() => {
            stock.status = false;
          }, timeout);
        } else {
          stock.status = false;
        }

        next();
      }
    ])
      .subscribe(stockPrices => {
        if (!stockPrices) {
          return;
        }

        const pricesChart = this.pricesChart;
        const volumesData = this.volumesData;

        const rightIdx = stockPrices.length - 1;

        let changed;

        const pricesToInsert = [];

        for (let priceIdx = rightIdx; priceIdx >= 0; priceIdx--) {
          const price = stockPrices[priceIdx];

          if (price.time <= stock.lastPrice.time) {
            break;
          } else if (!changed) {
            changed = true;
          }

          for (const priceLine of pricesChart) {
            priceLine.series.shift();
          }

          volumesData.series.shift();

          pricesToInsert.unshift(price);
        }

        for (const price of pricesToInsert) {
          this.insertToChart(price, pricesChart, volumesData);
        }

        if (changed) {
          this.filterChart(false);

          stock.lastPrice = stockPrices[stockPrices.length - 1];
        }
      });
  }

  filterChart(cIdx) {
    const showFlags = this.showFlags;
    const origSignColors = this.signColors;

    const signColors = [];
    const filteredChart = this.pricesChart.filter((line, idx) => {
      let flag = showFlags[idx];
      if (cIdx !== false && idx === cIdx) {
        flag = !showFlags[idx];
      }

      if (flag) {
        signColors.push(origSignColors[idx]);
      }
      return flag;
    });
    signColors.push(origSignColors[4]);

    if (!filteredChart.length) {
      return;
    }

    if (cIdx === false) {
      this.filteredChart = filteredChart;
      return;
    }

    showFlags[cIdx] = !showFlags[cIdx];

    this.filteredChart = filteredChart;
    this.colorScheme = {
      domain: signColors
    };
  }

  goBack() {
    this.location.back();
  }

  /* Unsubscribe on destroy */
  ngOnDestroy() {
    if (this.stock) {
      this.stock.status = undefined;
      if (this.stock.alive) {
        this.stock.alive.unsubscribe();
      }
    }
  }

}
