import { DatePipe } from '@angular/common';

export class TransformDate {
  static fromUnixtime(ngDate: DatePipe, unixtime: number): string {
    const date = new Date(unixtime);
    const nowDate = new Date();
    let formatDate = 'h:mm aa';
    if ((date.getDate() < nowDate.getDate()) || (date.getMonth() < nowDate.getMonth())) {
      formatDate = 'MMM dd' + ((date.getFullYear() < nowDate.getFullYear()) ? ', yyyy' : '') + ' ' + formatDate;
    }
    return ngDate.transform(date, formatDate);
  }
}
