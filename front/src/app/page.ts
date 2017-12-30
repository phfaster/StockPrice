import {Stock} from './stock';
import {Subject} from 'rxjs/Subject';
import {Subscription} from 'rxjs/Subscription';


export interface Page {
  alive?: Subscription;

  num: number;
  symbols?: string[];
  stocks?: Stock[];
}
