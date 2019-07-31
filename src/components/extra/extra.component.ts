import { ChangeDetectionStrategy, Component } from '@angular/core';
import { scaleBand, scaleLinear, scaleQuantize, scaleOrdinal, scaleQuantile, scaleThreshold } from 'd3-scale';
import { select, create } from 'd3-selection';
import { extent, range } from 'd3-array';
import {NodesLoadService} from '../../app/nodes-load.service';

@Component({
  selector: 'lbl-extra',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div></div>
  `
})
export class ExtraComponent {
  // caching objects so we dont have to recreate them
  private linearScale;
  private threshold;
  private quantize;
  private quantile;

  constructor(private nodeLoadService: NodesLoadService) {}

  ngInit() {
    this.linearScale = scaleLinear()
      .range(["white", "red"]); //   .domain([0, d3.max(data)])

    this.threshold = scaleThreshold()
      .domain([10000, 100000]) // pass your custom number
      .range(["white",  "pink", "red" ]);


    this.quantize = scaleQuantize()
      .range(["white", "pink", "red"]); //  .domain(extent(data)) // pass only the extreme values to a scaleQuantize’s domain

    this.quantile = scaleQuantile() // domain(extent(data)) // pass only the extreme values to a scaleQuantize’s domain
      .range(["white", "pink", "red"])
  }
}


function chart(data, scale) {
  const w = 30;
  const x = scaleBand()
      .domain(range(20))
      .range([0, 20 * w]);
  const chart =
    create("svg")
    .attr("width", 20 * w)
    .attr("height", 5 * w);

  chart
    .append("g")
    .attr("transform", "translate(2,2)")
    .attr("style", "stroke:black; fill:white;")
    .selectAll("rect")
    .data(data)
    .join("rect")
    .attr("width", w - 3)
    .attr("height", w - 3)
    .attr("x", (_, i) => x(i % 20))
    .attr("y", (_, i) => x((i / 20) | 0))
    .style("fill", d => (scale ? scale(d) : "#ddd"));
  return chart.node();
}
