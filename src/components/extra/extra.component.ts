import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnInit,
  ViewChild
} from '@angular/core';
import {
  scaleBand,
  scaleLinear,
  scaleQuantize,
  scaleOrdinal,
  scaleQuantile,
  scaleThreshold
} from 'd3-scale';
import { select, create } from 'd3-selection';
import { extent, range, max, min } from 'd3-array';
import { NodesLoadService } from '../../app/nodes-load.service';
import { interpolateHcl, interpolateRgb, quantize } from 'd3-interpolate';
const NUMBER_OF_BINS = 3;
const BATCH_THR_COLORS = quantize(
  interpolateRgb('white', 'red'),
  NUMBER_OF_BINS
);

@Component({
  selector: 'lbl-extra',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div>
      This tries to cluster the nodes in different clusters ( 3), according to
      their relative load
    </div>
    <p>
      First graph use a linear scale to encode the relative load nodes of a load
    </p>
    <p></p>
    <p>
      Second one use user-defined interval to cluster the nodes. It tells you
      that most of the nodes have a load < 33% of their capacity, and only one
      has a load of > 66%
    </p>
    <p>
      Third one use clusters with even intervals Fourht use clusters that have
      roughly the same amount of members The limit of the cluster allows us to
      derive some basic statistics
    </p>
    <div #container></div>
  `
})
export class ExtraComponent implements AfterViewInit, OnInit {
  // caching objects so we dont have to recreate them
  private linearScale;
  private threshold;
  private quantize;
  private quantile;

  @ViewChild('container', { static: false }) private container: ElementRef;

  constructor(private nodeLoadService: NodesLoadService) {}

  ngOnInit() {
    //console.log(BATCH_THR_COLORS);
    this.linearScale = scaleLinear().range([
      BATCH_THR_COLORS[0],
      BATCH_THR_COLORS[NUMBER_OF_BINS - 1]
    ]); //   .domain([0, d3.max(data)])

    this.threshold = scaleThreshold()
      .domain([0.3, 0.45, 0.51, 0.95, 1]) // pass your custom number
      .range(BATCH_THR_COLORS);

    this.quantize = scaleQuantize().range(BATCH_THR_COLORS); //  .domain(extent(data)) // pass only the extreme values to a scaleQuantize’s domain

    this.quantile = scaleQuantile() // domain(data) // for quantile => whole data
      .range(BATCH_THR_COLORS);
  }

  ngAfterViewInit() {
    // we dont care because nobody is going to change the state
    const data = Object.values(
      this.nodeLoadService.getStateSnapshot().nodeLoad
    );
    const _data = data.map(load => load.relativeLoad);
    this.linearScale.domain(extent(_data)); // 0 is a discutable choice
    this.quantize.domain([0, 1]); // again a discutable choice
    this.quantile.domain(_data);
    (this.container.nativeElement as HTMLElement).appendChild(
      chart(data, this.linearScale)
    );
    (this.container.nativeElement as HTMLElement).appendChild(
      chart(data, this.threshold)
    );
    (this.container.nativeElement as HTMLElement).appendChild(
      chart(data, this.quantize)
    );
    (this.container.nativeElement as HTMLElement).appendChild(
      chart(data, this.quantile)
    );
    console.log(_data);
  }
}

function chart(data, scale) {
  const w = 30;
  const x = scaleBand()
    .domain(range(20))
    .range([0, 20 * w]);
  const chart = create('svg')
    .attr('width', 20 * w)
    .attr('height', 5 * w);

  chart
    .append('g')
    .attr('transform', 'translate(2,2)')
    .attr('style', 'stroke:black; fill:white;')
    .selectAll('rect')
    .data(data)
    .join('rect')
    .attr('width', w - 3)
    .attr('height', w - 3)
    .attr('x', (_, i) => x(i % 20))
    .attr('y', (_, i) => x((i / 20) | 0))
    .style('fill', d => (scale ? scale(d.relativeLoad) : '#222'));
  return chart.node();
}
