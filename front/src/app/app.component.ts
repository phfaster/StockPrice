import {Component, ViewEncapsulation} from '@angular/core';
import {PageScrollConfig} from 'ngx-page-scroll';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  encapsulation: ViewEncapsulation.None
})
export class AppComponent {
  title = 'app';

  constructor() {
    PageScrollConfig.defaultDuration = 500;
  }
}
