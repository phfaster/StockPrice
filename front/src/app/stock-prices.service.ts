import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { of } from 'rxjs/observable/of';
import {catchError, map, repeatWhen, retry} from 'rxjs/operators';

import { Stock } from './stock';
import { StockPrice } from './stock-price';
import { HttpClient, HttpParams } from '@angular/common/http';
import {Subject} from 'rxjs/Subject';
import {Page} from './page';

interface Position {
  page: number;  /* Page number */
  position?: number;  /* Position on page */
}

interface Response<T> {
  res: T;  /* Main response content */

  error?: string;
  ignore?: boolean;  /* Ignore this response */

  position?: Position;  /* Position of new stock in pages */
  exists?: Position;  /* Position of existing stock in pages */
  total?: {stocks: number, pages: number};  /* Pages stats */
  timeout?: number;  /* Time in milliseconds to next request */
  stocksDeleted?: boolean;  /* Flag that notify about some stock(-s) is deleted */
}

interface Pipe extends Array<(response: Response<any>, next?: Function) => any> {
  [key: number]: (response: Response<any>, next?: Function) => any;
}

/*
* Stock Prices Service
*
* Basic concepts:
* symbol - ticker symbol: string UPPERCASE
* page - page structure. Contains a page number and list of stocks
* pipeLine - array of functions each of which calls with arguments (response, next) after response received
* - next: Function - function that calls next function in pipeLine or 'subscribe' callback
* */

@Injectable()
export class StockPricesService {
  apiUrl = '/api';

  constructor(private http: HttpClient) {}

  /* Adding stock */
  addStock(symbol: string, pipeLine?: Pipe): Observable<Stock> {
    return this.http.post<Response<Stock>>(this.apiUrl + '/addStock', {symbol}).pipe(
      map(r => this.mapResponse<Stock>(r, pipeLine))
    );
  }

  /* Get actual prices for Page */
  getPrice(page: Page, pipeLine?: Pipe): Observable<StockPrice[]> {
    return this.getPriceS<StockPrice[]>(false, page, pipeLine);
  }

  /* Get last 60 minutes for stock, used for chart */
  getPrices(stock: Stock, pipeLine?: Pipe): Observable<StockPrice[]> {
    return this.getPriceS<StockPrice[]>(true, stock, pipeLine);
  }

  /* Function that performs functional of getPrice and getPrices depends on isMulti flag */
  getPriceS<T>(isMulti, obj, pipeLine: Pipe = []): Observable<T> {
    const subject = new Subject();

    let params = new HttpParams();

    if (isMulti) {
      params = params.append('symbol', obj.title);
    } else {
      let symbols = '';

      const symbolsList = obj.symbols = [];

      for (const stock of obj.stocks) {
        symbols += stock.title + ',';
        symbolsList.push(stock.title);
      }

      symbols = symbols.slice(0, -1);

      params = params.append('symbols', symbols);
    }

    let timeout = 0;

    pipeLine.push((response, next) => {
      if (response.timeout) {
        timeout = response.timeout;
      } else {
        timeout = 0;
      }

      next();
    });

    return this.http.get<Response<T>>(this.apiUrl + '/getPrice' + (isMulti ? 's' : ''), {params}).pipe(
      retry(3),
      repeatWhen(notifications => {
        notifications.subscribe(() => {
          if (timeout) {
            setTimeout(() => subject.next(), timeout);
          } else {
            subject.next();
          }
        });
        return subject;
      }),
      map(r => this.mapResponse<T>(r, pipeLine)),
      catchError(this.handleError<T>('Get stock prices', obj))
    );
  }

  /* Get stock with cached last 60 seconds */
  getStock(symbol): Observable<Stock> {
    return this.http.get<Response<Stock>>(this.apiUrl + '/getStock', {params: {symbol}}).pipe(
      map(r => this.mapResponse<Stock>(r)),
      catchError(this.handleError<Stock>('Get stock'))
    );
  }

  /* Get list of stocks each of which contains cached last price */
  getStocks(page = 0, pipeLine?: Pipe): Observable<Stock[]> {
    let params = new HttpParams();

    if (page) {
      params = params.set('page', page.toString());
    }

    return this.http.get<Response<Stock[]>>(this.apiUrl + '/getStocks', {params}).pipe(
      map(r => this.mapResponse<Stock[]>(r, pipeLine)),
      catchError(this.handleError<Stock[]>('Get stocks'))
    );
  }

  /* Delete stock */
  deleteStock(deletedStock: Stock) {
    return this.http.get<Response<boolean>>(this.apiUrl + '/deleteStock', {
      params: {
        symbol: deletedStock.title
      }
    }).pipe(
      map(r => this.mapResponse<boolean>(r))
    );
  }

  private handleError<T> (operation = 'Unknown', obj?) {
    return (error: any): Observable<T> => {
      console.error(operation + ':', error);

      if (obj) {
        if (obj && obj.status !== undefined) {
          obj.status = undefined;
        } else if (obj.stocks) {
          for (const stock of obj.stocks) {
            stock.status = undefined;
          }
        }
      }

      return of(undefined);
    };
  }

  /*
  * Map response
  * switch(response.{key}):
  * case key === error:
  *   throw err - console error
  * case key === ignore:
  *   result = undefined = skip response
  * case key === something:
  *   bind response to functions in pipeLine
  * case key === res:
  *   send 'res' to subscribe callback
  * */
  mapResponse<T>(r: Response<T>, pipeLine?: Pipe): T {
    if (r.error) {
      throw r.error;
    } else if (r.ignore) {
      return null;
    } else if (pipeLine) {
      let i = 0;
      let canceled = false;

      const next = (skip = 0) => {
        const nextFunc = pipeLine[i = (i + 1 + skip)];
        if (!nextFunc) {
          canceled = false;
          return;
        }

        canceled = true;
        nextFunc(r, next);
      };

      pipeLine[i](r, next);

      if (canceled) {
        return undefined;
      }
    }

    return r.res;
  }
}
