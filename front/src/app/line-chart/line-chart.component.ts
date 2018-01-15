import {
  Component,
  Input,
  ViewEncapsulation,
  ChangeDetectionStrategy,
} from '@angular/core';
import {
  trigger,
  style,
  animate,
  transition
} from '@angular/animations';
import { scaleLinear, scaleTime, scalePoint } from 'd3-scale';
import { curveLinear } from 'd3-shape';

import { LineChartComponent as LineChartOriginalComponent } from '@swimlane/ngx-charts';

@Component({
  selector: 'app-ngx-charts-line-chart',
  templateUrl: 'line-chart.component.html',
  styleUrls: ['../../../node_modules/@swimlane/ngx-charts/release/common/base-chart.component.css'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger('animationState', [
      transition(':leave', [
        style({
          opacity: 1,
        }),
        animate(500, style({
          opacity: 0
        }))
      ])
    ])
  ]
})
export class LineChartComponent extends LineChartOriginalComponent {

  @Input() additionalTooltipFields: any[];

  combinedDomain: any[];

  getSeriesDomain(): any[] {
    const results = this.results;
    let tooltipFields;
    if (this.additionalTooltipFields) {
      tooltipFields = results.concat(this.additionalTooltipFields);
    } else {
      tooltipFields = results;
    }
    this.combinedDomain = tooltipFields;
    return results.map(d => d.name);
  }
}
