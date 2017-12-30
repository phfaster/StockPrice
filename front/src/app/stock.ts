import {Subject} from 'rxjs/Subject';

import { StockPrice } from './stock-price';

export interface Stock {
    title: string;
    lastPrice?: StockPrice;
    prices?: StockPrice[];

    status?: boolean;  /* Loading=false/Cached=undefined/Actual=true */
    selected?: boolean;  /* Class trigger for focus on stock */
    alive?: Subject<any>;  /* Observable subject for chart page */
    timeout?: number;  /* Time until last price the loss actual */
}
