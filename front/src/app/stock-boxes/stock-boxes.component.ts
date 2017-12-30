import {AfterViewInit, Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {Stock} from '../stock';
import {TransformDate} from '../transformDate';
import {DatePipe} from '@angular/common';

@Component({
  selector: 'app-stock-boxes',
  templateUrl: './stock-boxes.component.html',
  styleUrls: ['./stock-boxes.component.css']
})
export class StockBoxesComponent implements AfterViewInit {

  @Input() stocks: Stock[];

  @Output() stocksEndLoad = new EventEmitter();
  @Output() stockDeleted = new EventEmitter<Stock>();

  constructor(
    private date: DatePipe
  ) { }

  ngAfterViewInit() {
    this.stocksEndLoad.emit();
  }

  transformDate(unixtime) {
    return TransformDate.fromUnixtime(this.date, unixtime);
  }

  deleteStock($event, deletedStock: Stock) {
    $event.preventDefault();
    this.stockDeleted.emit(deletedStock);
  }

}
