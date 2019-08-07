import {
  AfterViewInit,
  ChangeDetectionStrategy, ChangeDetectorRef,
  Component, OnDestroy,
  ViewEncapsulation
} from '@angular/core';
import { Chart, ChartConfig, EventType } from '../chart/stacked-chart';
import { NodesLoadService } from '../../app/nodes-load.service';

// this is a kind of dirty hack.. we keep the same reference to ensure that the config is persisted
const config: ChartConfig = {
  margin: { top: 10, bottom: 10, left: 30, right: 10 },
  binNumbers: 5,
  colorizeNodes: false,
  scale: null,
  scalingMethod: 'RELATIVE',
  scaleNodes: false,
  displayFilesInChart: false
};

@Component({
  selector: 'lbl-dashboard',
  encapsulation: ViewEncapsulation.None, // FIXME(chab) i think emulated encapsulation fails because d3 insert the nodes
  styleUrls: ['./dashboard.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard.component.html'
})
export class DashboardComponent implements AfterViewInit, OnDestroy {
  constructor(private nls: NodesLoadService) { }

  public config: ChartConfig = config;
  private chart: Chart;
  private sub;


  public onConfigChange($event) {
    // deport the rendering
    window.requestAnimationFrame(() => {
      this.nls.updateColorMapping(this.config.colorizeNodes);
      this.config.scale = this.nls.getCurrentScale().scale;
      this.chart.updateConfig(this.config);
    });
  }

  ngAfterViewInit() {
    this.sub = this.nls.nodes().subscribe(c => {
      this.chart = new Chart(
        {
          margin: { top: 10, bottom: 10, left: 30, right: 10 },
          binNumbers: 5,
          scalingMethod: this.config.scalingMethod,
          scaleNodes: this.config.scaleNodes,
          scale: this.nls.getCurrentScale().scale
        },
        c,
        this.nls
      );
      this.chart.eventBus.subscribe(({ event, payload }) => {
        switch (event) {
          case EventType.MOUSEOUT: {
            this.nls.updateSelectedNodes([]);
            break;
          }
          case EventType.MOUSEOVER: {
            this.nls.updateSelectedNodes(payload);
            break;
          }
          case EventType.MOUSECLICK: {
            this.nls.updateSelectedNodes(payload);
            break;
          }
        }
      });
    });
  }

  ngOnDestroy() {
    console.log('Destroy...');
    this.sub.unsubscribe();
    this.chart.destroy();
  }
}
