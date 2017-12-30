import {ChangeDetectorRef, Component, Inject, OnDestroy, OnInit} from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs/observable/of';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { DOCUMENT } from '@angular/common';

import {PageScrollService, PageScrollInstance} from 'ngx-page-scroll';

import { Stock } from '../stock';
import { StockPricesService } from '../stock-prices.service';
import {Page} from '../page';

@Component({
  selector: 'app-stock-prices',
  templateUrl: './stock-prices.component.html',
  styleUrls: ['./stock-prices.component.css']
})
export class StockPricesComponent implements OnInit, OnDestroy {
  addInputValue = '';  /* Value of new stock title (from input) */
  addInputLoading: string;  /* Value of block that shows message about loading request/error in response */
  addInputLoadingTypeIsError: boolean;  /* Notify is error or loading */
  addInputLoadingTimeout: number;  /* Index of timeout after which notify message closing */
  page: Page;  /* Page object, describes num of page and list of stocks on page */
  stocks: Stock[];  /* List of stocks */
  noStocks = false;  /* If true - get stocks request fails */
  totalNum: number;  /* Total count of stocks */
  totalPages: number;  /* Total count of pages */
  urlParams: Params;
  private stockSelected: Stock;
  private stockSelectedTimeout: number;  /* Timeout object after which stock loses selection */
  private stockPositionToSelect: number;  /* Index of stock to select on page */

  constructor(
    private spp: StockPricesService,
    private route: ActivatedRoute,
    private router: Router,
    private scroll: PageScrollService,
    @Inject(DOCUMENT) private document: any,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit() {
    this.page = {
      num: -1
    };

    /* On page param is changed - bind pageNum and reload stocks */
    this.route.queryParams
      .subscribe(params => {
        this.urlParams = params;
        let pageNum = params.page || 0;
        try {
          pageNum = parseInt(pageNum, 10);
        } catch (err) {
          pageNum = 0;
        }

        if (pageNum < 0) {
          this.toPage(0);
          return;
        } else if (pageNum > 0) {
          pageNum--;
        }

        if ((this.page.num || 0) === pageNum) {
          return;
        }

        this.page.num = pageNum;
        this.getStocks();
      });
  }

  /* Generate empty array with 'total' count of elements */
  getRange(total) {
    return new Array(total);
  }

  /* Description within method */
  addStock() {
    let symbol = this.addInputValue;
    if (!(symbol = symbol.trim())) {
      return;
    }

    /* Show loading message without removing after timer */
    this.showLoadingMessage('Loading', false, false);

    this.spp.addStock(symbol, [
      /* If new/exist stock position is received insert/select this */
      (response, next) => {
        const exists = response.exists;
        let position;
        if (!exists && !(position = response.position)) {
          response.res = null;
          next();

          return;
        }

        if (!position) {
          position = exists;
        }

        /* If new/exist stock on current page */
        if (this.page.num === position.page) {
          /* If stock list is not empty */
          if (this.stocks) {
            /* If stock exists - select, else insert, select and resubscribe */
            if (exists) {
              this.selectStock(exists.position);
            } else {
              this.destroySubscribers();
              this.stocks.splice(position.position, 0, response.res);
              if (this.stocks.length > 9) {
                this.stocks.pop();
              }
              this.getPrice();
              this.selectStock(position.position);
            }
          } else {
            /* If stock list is empty - load this */
            this.stockPositionToSelect = position.position;
            this.noStocks = false;
            this.getStocks();
          }
        } else {
          /* If another page - load this */
          this.stockPositionToSelect = position.position;
          this.toPage(position.page);
        }

        /* Go to subscribe callback */
        response.res = null;
        next();
      }
    ])
      .pipe(
        catchError( (err: any): Observable<Stock> => {
          this.showLoadingMessage(err, true);

          return of(undefined);
        })
      )
      .subscribe(result => {
        if (result === null) {
          this.addInputValue = '';
          this.closeLoadingMessage();
          return;
        }
      });
  }

  /* Description within method */
  getPrice() {
    /* Subscribe to actual prices and set 'alive' field to current subscription */
    this.page.alive = this.spp.getPrice(this.page, [
      /* If some stock deleted - reload stocks list */
      (response, next) => {
        const stocksDeleted = response.stocksDeleted;
        if (!stocksDeleted) {
          next();

          return;
        }

        this.getStocks();
      }
    ])
      .subscribe(prices => {
        if (!prices) {
          return;
        }

        const stocks = this.stocks;
        for (let k = 0; k < stocks.length; k++) {
          const symbolPrice = prices[k];

          let error;
          /* If price don't received - ignore. If error - console and next iteration */
          if (!symbolPrice || (error = symbolPrice.error)) {
            if (error) {
              console.error(`Error in getting actual price (${stocks[k].title})`, error);
            }
            continue;
          }

          const stock = stocks[k];

          if (stock.lastPrice.timeout) {
            clearTimeout(stock.lastPrice.timeout);
          }

          const timeout = symbolPrice.timeout;

          /* If there is time until the next price - wait for this */
          if (timeout) {
            stock.status = true;
            symbolPrice.timeout = window.setTimeout(() => {
              symbolPrice.timeout = undefined;
              stock.status = false;
            }, timeout);
          } else {
            stock.status = false;
          }

          /* If price is changed - change it */
          if (symbolPrice.price) {
            stock.lastPrice = symbolPrice;
          }
        }
      });
  }

  /* Destroy exist subscription and get new stocks and bind pagination params */
  getStocks() {
    this.destroySubscribers();
    this.stocks = undefined;
    this.page.stocks = undefined;
    this.spp.getStocks(this.page.num, [
      (response, next) => {
        const total = response.total;
        if (!total) {
          next();

          return;
        }

        if (this.page.num !== -1 && total.pages <= this.page.num) {
          let toPageNum = 0;
          if (response.res) {
            toPageNum = this.page.num = (total.pages || 1) - 1;
          }

          this.toPage(toPageNum);
        }

        this.totalNum = total.stocks;
        this.totalPages = total.pages;

        next();
      }
    ]).subscribe(stocks => {
      if (!stocks) {
        this.noStocks = true;
      }
      this.updateStocksList(stocks);
    });
  }

  /* Shows loading/error message in div block above add-input */
  showLoadingMessage(text, isError = true, closeAfterTimer = true) {
    this.addInputLoadingTypeIsError = isError;
    if (this.addInputLoadingTimeout) {
      clearTimeout(this.addInputLoadingTimeout);
    }
    let toText: string;
    const inputType = typeof text;
    if (inputType === 'object') {
      if (text instanceof Error) {
        console.error(text);
        toText = text.message.trim() || 'Unresolved error.';
      } else {
        toText = 'Unexpected object.';
      }
    } else if (inputType !== 'string') {
      toText = text.toString();
    } else {
      toText = text.trim() || 'Unresolved error.';
    }
    this.addInputLoading = toText;
    if (closeAfterTimer) {
      this.addInputLoadingTimeout = window.setTimeout(() => this.closeLoadingMessage(), 3000);
    }
  }

  /* Close loading/error message in div block above add-input */
  closeLoadingMessage() {
    this.addInputLoading = undefined;
    if (this.addInputLoadingTypeIsError) {
      setTimeout(() => this.addInputLoadingTypeIsError = false, 300);
    }
  }

  /* Go to page and prevent default browser behavior */
  toPagePreventClick(event, pageNum) {
    event.preventDefault();
    this.toPage(pageNum);
  }

  /* Change url to page */
  toPage(pageNum) {
    this.urlParams = Object.assign({}, this.urlParams, {page: (pageNum = (pageNum || undefined)) ? pageNum + 1 : pageNum});
    this.router.navigate([], {queryParams: this.urlParams});
  }

  selectStock(position) {
    /* Remove selection on previous stock */
    if (this.stockSelected) {
      this.stockSelected.selected = false;
    }

    /* Select stock */
    const stockSelected = this.stockSelected = this.stocks[position];
    stockSelected.selected = true;
    this.cdr.detectChanges();

    /* Scroll to selected stock */
    const pageScrollInstance = PageScrollInstance.simpleInstance(this.document, '#stock-box_' + stockSelected.title);
    this.scroll.start(pageScrollInstance);

    /* Remove selection after 5 seconds */
    this.stockSelectedTimeout = window.setTimeout(() => {
      stockSelected.selected = false;
      this.stockSelected = this.stockSelectedTimeout = undefined;
    }, 5000);
  }

  /* Select stock after list of stocks loaded */
  stocksLoaded() {
    if (this.stockPositionToSelect !== undefined) {
      this.selectStock(this.stockPositionToSelect);
      this.stockPositionToSelect = undefined;
    }
  }

  /* If some stock is deleted - send request to delete and resubscribe */
  stocksDeleted(deletedStock: Stock) {
    this.destroySubscribers();
    this.spp.deleteStock(deletedStock)
      .pipe(
        catchError(err => {
          this.showLoadingMessage(err, true);

          return of(undefined);
        })
      )
      .subscribe(r => {
        if (!r) {
          this.showLoadingMessage('Не удалось удалить', true);
          return;
        }

        this.getStocks();
      });
  }

  /* Bind stocks list to field and subscribe to actual prices */
  updateStocksList(stocks) {
    stocks = this.stocks = stocks || undefined;
    this.page.stocks = stocks;
    if (stocks) {
      for (const stock of stocks) {
        stock.status = false;
      }
      this.getPrice();
    }
  }

  /* Unsubscribe from actual prices */
  destroySubscribers(destroy = false) {
    if (!this.stocks) {
      return;
    }
    if (!destroy) {
      for (const stock of this.stocks) {
        stock.status = undefined;
      }
    }
    const page = this.page;
    if (page.alive) {
      page.alive.unsubscribe();
      page.alive = undefined;
    }
  }

  /* Before destroying - unsubscribe */
  ngOnDestroy() {
    this.destroySubscribers(true);
  }

}
