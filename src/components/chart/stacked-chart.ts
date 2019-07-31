import { scaleBand, scaleLinear, scaleQuantize, scaleOrdinal } from 'd3-scale';
import { stack, stackOrderNone, stackOffsetNone } from 'd3-shape';
import { select } from 'd3-selection';
import { axisLeft, axisBottom } from 'd3-axis';
import 'd3-transition'; // this is needed to augment selection prototype with transition
import { schemePaired } from 'd3-scale-chromatic';

import { SystemState } from '../../app/nodes-load.service';
import { Subject } from 'rxjs';
import { pairwise } from 'rxjs/operators';

export interface ChartConfig {
  margin: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  binNumbers: number;
  colorizeNodes: boolean;
  scaleNodes: boolean;
  scale;
  scalingMethod;
}

export enum EventType {
  MOUSEOVER = 'mouseover',
  MOUSEOUT = 'mouseout',
  MOUSECLICK = 'mouseclick'
}

const speed = 100;

// TODO(chab) decouple business logic from rendering logic

export class Chart {
  // d3 scales
  private xRenderingScale;
  private yRenderingScale;
  private nodeToBinScale;
  private nodeColorScale;
  // d3 selection;
  private svgNode;
  private xAxis;
  private yAxis;

  //
  private width: number;
  private height: number;
  private thresholds;
  private stackLayout;

  private cachedState: SystemState;

  private subscription;

  public eventBus: Subject<{ event: EventType; payload?: any }> = new Subject<{
    event: EventType;
    payload;
  }>();

  constructor(private chartOptions, state, nls) {
    this.buildDomNodes();
    this.render(state);
    this.subscription = nls.nodesToHiglight().pipe(pairwise()).subscribe((n) => {
        if (n[0].length === 1) {
          select(`#${n[0]}`).attr('fill', this.chartOptions.scale(n[0]));
        }
        if (n[1].length === 1) {
          select(`#${n[1]}`).attr('fill', 'red');
        }
    });
  }

  public render(state) {
    this.buildShell(state);
    this.updateAxisTicks();
    this.updateStacks(this.stackLayout);
  }

  public updateConfig(config: ChartConfig) {
    this.chartOptions = config;
    this.render(this.cachedState);
  }

  private buildShell(state: SystemState) {
    this.cachedState = state;

    this.xRenderingScale = scaleBand()
      .range([
        this.chartOptions.margin.left,
        this.width - this.chartOptions.margin.right
      ])
      .padding(0.1);

    this.xRenderingScale.domain(
      Array.from({ length: this.chartOptions.binNumbers }, (v, k) => k)
    );
    this.yRenderingScale = scaleLinear().rangeRound([
      this.height - this.chartOptions.margin.bottom,
      this.chartOptions.margin.top
    ]);
    this.yRenderingScale.domain([0, this.chartOptions.scaleNodes
      ? (this.chartOptions.scalingMethod === 'RELATIVE' ? this.chartOptions.binNumbers : 1000)
      : this.chartOptions.binNumbers]); // TODO find max number of nodes

    // to find the domain, we need not find how the node fall into the buckets
    // 0 ->x`

    // find the bins
    this.nodeToBinScale = scaleQuantize()
      .domain([0, 1000])
      .range(Array.from({ length: this.chartOptions.binNumbers }, (v, k) => k));
    this.xRenderingScale.domain(
      Array.from({ length: this.chartOptions.binNumbers }, (v, k) => k)
    );

    // construct the legend for each bin
    this.thresholds = this.nodeToBinScale
      .thresholds()
      .map((threshold, index, array) => [
        index === 0 ? this.nodeToBinScale.domain()[0] : array[index - 1],
        threshold
      ]);
    this.thresholds.push([this.thresholds[this.thresholds.length - 1][1], this.nodeToBinScale.domain()[1]]);
    /*  stack just compute y0-y1 interval */
    /*node1:
     absoluteLoad: 696
    files: ["file11"]
    nodeId: "node1"
    relativeLoad: 0.5640194489465153*/

    // we need to have the data in that save { bin:, nodeX: { absoluteLoad:, relativeLoad: } }
    // we're going to cheat a bit, we know that bin is a ordinal value between 0 - numberOfBins,
    // we can leverage that fact to avoid doing two loops

    const bins = Object.keys(state.nodeLoad).reduce((acc, nodeId) => {
      const bin = this.nodeToBinScale(state.nodeLoad[nodeId].absoluteLoad);
      const nodeLoad = state.nodeLoad[nodeId];
      acc[bin][nodeId] = nodeLoad;
      return acc;
    }, Array.from({ length: this.chartOptions.binNumbers }, (v, k) => ({ bin: k })));

    // value accessor .. if we consider node per se, we just return 1 or 0
    // if we want the y of nodes to match absolute/relative load, we use absolute/relative load
    // if we want to just see the size of node, we use the size of the load(would be interesting to have tree map,
    // that shows what's happening into it (file size + unused size))

    const stackLayout = stack()
      .keys(Object.keys(state.nodes))
      .value((d, key) => {
        return (!!d[key] ? (this.chartOptions.scaleNodes ?
          (this.chartOptions.scalingMethod === 'ABSOLUTE' ?  d[key].absoluteLoad  : d[key].relativeLoad) : 1) : 0);
      }) // see above comment
      .order(stackOrderNone)
      .offset(stackOffsetNone)(bins);
    this.stackLayout = stackLayout;
    // index of the series match the node number
    // index inside the serie match the bin
    // a node can only be in one bin, so there should only one [n][0] -> [x,y] ( where y - x is one )

    // .attr("x", d => x(d.data.bin)) // or simply the index
    //  .attr("y", d => y(d[1]))
    //  .attr("height", d => y(d[0]) - y(d[1]))

    // color index



    // using quantize give us X bins, with equal distribution
    // using quantile give us X bins, with an equal ( best-effort) frequency
    // using threshold let the user defines its own interval

    // one interesting thing is that if we render a square for each node, we might want to
    // switch between absolute/relative view
  }

  private updateStacks(stackLayout) {
    const group = this.svgNode
      .selectAll('g.layer')
      .data(stackLayout, d => d.key);
    group.exit().remove();

    group
      .enter()
      .append('g')
      .classed('layer', true)
      .attr('fill', d => this.chartOptions.scale(d.key))
      .on('mouseover', function(d, i, j) {
        // we use a function in order to acces DOM node via this
        select(this).attr('fill', 'red');
        self.eventBus.next({ event: EventType.MOUSEOVER, payload: [d.key] });
      })
      .on('mouseout', function(d, i) {
        select(this).attr('fill', function() {
          // we use a function in order to acces DOM node via this
          return self.chartOptions.scale(d.key);
        });
        self.eventBus.next({ event: EventType.MOUSEOUT });
      })
      .merge(group)
      .attr('id', d => d.key)
      .transition()
      .duration(speed)
      .attr('fill', d => this.chartOptions.scale(d.key));


    const bars = this.svgNode
      .selectAll('g.layer')
      .selectAll('rect')
      .data(
        (d, i, j) => {
          const t = d.map(item => (item.node = d.key) && item); // KIND OF HACK
          return t;
        },
        e => e.data.bin
      );

    bars.exit().remove();

    const self = this;

    // every layer match a particular node

    bars
      .enter()
      .append('rect')
      .classed('node', true)
      .attr('width', this.xRenderingScale.bandwidth())
      .merge(bars)
      .transition()
      .duration(speed)
      .attr('x', d => this.xRenderingScale(d.data.bin))
      .attr('y', d => this.yRenderingScale(d[1]))
      .attr(
        'height',
        d => this.yRenderingScale(d[0]) - this.yRenderingScale(d[1])
      );
  }

  private buildDomNodes() {
    this.svgNode = select('#chart');
    const margin = this.chartOptions.margin;
    // first Iteration, chart has a fixed width/height
    this.xAxis = this.svgNode.append('g').attr('class', 'x-axis');
    this.yAxis = this.svgNode.append('g').attr('class', 'y-axis');
    this.cacheContainerSize();
    this.updateAxisLocation();
  }

  private updateAxisLocation() {
    this.yAxis.attr(
      'transform',
      `translate(${this.chartOptions.margin.left},0)`
    );
    this.xAxis.attr(
      'transform',
      `translate(0,${this.height - this.chartOptions.margin.bottom})`
    );
  }

  private cacheContainerSize() {
    const margin = this.chartOptions.margin;
    this.width = this.svgNode.attr('width') - margin.left - margin.right;
    this.height = this.svgNode.attr('height') - margin.top - margin.bottom;
  }

  private updateAxisTicks() {
    this.svgNode
      .selectAll('.y-axis')
      .transition()
      .duration(speed)
      .call(axisLeft(this.yRenderingScale).ticks(null, 's'));

    this.thresholds = this.thresholds.map(t => `${t[0]} -> ${t[1]}`);
    this.svgNode
      .selectAll('.x-axis')
      .transition()
      .duration(speed)
      .call(axisBottom(this.xRenderingScale)
        .tickSizeOuter(0)
        .tickFormat(d => this.thresholds[d]));

  }

  public destroy() {
    this.subscription.unsubscribe();
  }
}

// we can use a stack layout, each node is a key
// we pass an array of nodes => [nodeId, absoluteLoad]
// each node will fall in a particular bin
