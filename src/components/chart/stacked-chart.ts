import { scaleBand, scaleLinear, scaleQuantize, scaleOrdinal } from 'd3-scale';
import { stack, stackOrderNone, stackOffsetNone } from 'd3-shape';
import { select, event } from 'd3-selection';
import { axisLeft, axisBottom } from 'd3-axis';
import 'd3-transition'; // this is needed to augment selection prototype with transition
import { schemePaired } from 'd3-scale-chromatic';
import { max } from 'd3-array';

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
  wholeBin: boolean;
  scaleNodes: boolean;
  displayFilesInChart: boolean;
  scale;
  scalingMethod;
}

export enum EventType {
  MOUSEOVER = 'mouseover',
  MOUSEOUT = 'mouseout',
  MOUSECLICK = 'mouseclick'
}

const speed = 100;
let TOOLTIP_ID = 0;
const TOOLTIP_CLASS = 'chart-tip';

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
  private nodesToBin;

  private subscription;

  private tooltip;

  public eventBus: Subject<{ event: EventType; payload?: any }> = new Subject<{
    event: EventType;
    payload;
  }>();

  constructor(private chartOptions, state, nls) {
    TOOLTIP_ID++;
    this.buildDomNodes();
    this.render(state);
    this.subscription = nls
      .nodesToHiglight()
      .pipe(pairwise())
      .subscribe(n => {
        if (n[0].length >= 1) {
          n[0].forEach(id => select(`#${id}`).attr('fill', this.chartOptions.scale(id[0])));
        }
        if (n[1].length >= 1) {
          n[1].forEach(id => select(`#${id}`).attr('fill', '#e6f7ff'));
        }
      });
    this.tooltip = select('.chart')
      .append('div')
      .attr('class', TOOLTIP_CLASS)
      .attr('id', `${TOOLTIP_ID}__${TOOLTIP_CLASS}`)
      .style('opacity', 0)
      .style('display', 'none');
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

    // to find the domain, we need not find how the node fall into the buckets
    // 0 ->x`

    // find the bins
    this.nodeToBinScale = scaleQuantize()
      .domain([0, 1000]) // determine the domain dynamically
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
    this.thresholds.push([
      this.thresholds[this.thresholds.length - 1][1],
      this.nodeToBinScale.domain()[1]
    ]);

    const bins = Object.keys(state.nodeLoad).reduce((acc, nodeId) => {
      const bin = this.nodeToBinScale(state.nodeLoad[nodeId].absoluteLoad);
      const nodeLoad = state.nodeLoad[nodeId];
      acc[bin][nodeId] = nodeLoad;
      return acc;
    }, Array.from({ length: this.chartOptions.binNumbers }, (v, k) => ({ bin: k })));

    // TOD(chab) re-think the view model
    const nodeToBin = bins.reduce((acc, b) => {
      Object.keys(b).forEach((key) => {
        if (key !== 'bin') {
          acc[key] = b.bin;
        }
      }, []);
      acc[b.bin] = Object.keys(b).filter(k => k !== 'bin');

      return acc;
    }, {});
    this.nodesToBin = nodeToBin;

    const stackLayout = stack()
      .keys(Object.keys(state.nodes))
      .value((d, key) => {
        return !!d[key]
          ? this.chartOptions.scaleNodes
            ? this.chartOptions.scalingMethod === 'ABSOLUTE'
              ? d[key].absoluteLoad
              : d[key].relativeLoad
            : 1
          : 0;
      }) // see above comment
      .order(stackOrderNone)
      .offset(stackOffsetNone)(bins);
    const rmax = max(
      stackLayout[0].map(a =>
        Object.keys(a.data).reduce((acc, key) => {
          if (key.indexOf('node') < 0) {
            return acc;
          } else {
            return (
              acc +
              (this.chartOptions.scaleNodes
                ? this.chartOptions.scalingMethod === 'ABSOLUTE'
                  ? a.data[key].absoluteLoad
                  : a.data[key].relativeLoad
                : 1)
            );
          }
        }, 0)
      )
    );
    this.yRenderingScale.domain([0, rmax]);

    this.stackLayout = stackLayout;
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
        if (!self.chartOptions.wholeBin) {
          self.eventBus.next({ event: EventType.MOUSEOVER, payload: [d.key] });
        } else {
          self.eventBus.next({ event: EventType.MOUSEOVER, payload: self.nodesToBin[self.nodesToBin[d.key]]});
        }
        self.showTooltip(d);
      })
      .on('mouseout', function(d, i) {
        self.eventBus.next({ event: EventType.MOUSEOUT });
        self.hideTooltip();
      })
      .merge(group)
      .attr('id', d => d.key)
      .transition()
      .duration(speed)
      .attr('fill', d => this.chartOptions.scale(d.key));

    const bars = this.svgNode
      .selectAll('g.layer')
      .selectAll('g.node-group')
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

    let b = bars
      .enter()
      .append('g')
      .classed('node-group', true);

    b.append('rect')
      .classed('node', true)
      .attr('width', this.xRenderingScale.bandwidth());

    b.append('g').classed('files-group', true);

    b = b.merge(bars);

    b.select('rect.node')
      .transition()
      .duration(speed)
      .attr('x', d => this.xRenderingScale(d.data.bin))
      .attr('y', d => this.yRenderingScale(d[1]))
      .attr(
        'height',
        d => this.yRenderingScale(d[0]) - this.yRenderingScale(d[1])
      );

    b.select('.files-group')
      .transition()
      .duration(speed)
      .attr('transform', d => `translate(${this.xRenderingScale(d.data.bin)}, ${this.yRenderingScale(d[1])})`);


    // TODO(chab) rewrite
    const scale = scaleLinear()
      .domain([0, 1])
      .range([0, this.xRenderingScale.bandwidth()]);

    const t = this.svgNode
      .selectAll('g.layer')
      .selectAll('g.node-group')
      .selectAll('g.files-group')
      .selectAll('.files')
      .data((d) => {

        if (d.data[d.node] && this.chartOptions.displayFilesInChart) {
          let start = 0;
          const r = d.data[d.node].files.reduce((acc, file) => {
            const fileSize = this.cachedState.files[file];
            const node = this.cachedState.nodes[d.node];
            const end = scale(fileSize / node);
            const height = this.yRenderingScale(d[0]) - this.yRenderingScale(d[1]); //
            acc.push({ x1: start, x2: end, height});
            start = start + end;
            return acc;
          }, []);
          return r;
        } else {
          return [];
        } // we will compute the layout here
      });

    t.exit().remove();

    const entering = t.enter().append('rect').classed('files', true);
      entering.merge(t)
      .transition()
      .duration(speed)
      .attr('x', d => d.x1)
      .attr('height', d => d.height)
      .attr('width', d => d.x2);
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

  private showTooltip(d) {
    d = this.cachedState.nodeLoad[d.key];
    this.tooltip
      .style('display', 'block')
      .html(`${d.nodeId} - Load : ${d.absoluteLoad} bytes`)
      .transition()
      .duration(200)
      .style('left', event.pageX + 'px')
      .style('top', event.pageY - 28 + 'px')
      .style('opacity', 0.9);
  }

  private hideTooltip() {
    this.tooltip
      .html('')
      .transition()
      .duration(200)
      .style('opacity', 0.0)
      .transition()
      .style('display', 'none');
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
      .call(
        axisLeft(this.yRenderingScale).ticks(
          this.chartOptions.scaleNodes
            ? null
            : this.yRenderingScale.domain()[1],
          this.chartOptions.scaleNodes ? 's' : 'd'
        )
      );

    this.thresholds = this.thresholds.map(t => `${t[0]} -> ${t[1]}`);
    this.svgNode
      .selectAll('.x-axis')
      .transition()
      .duration(speed)
      .call(
        axisBottom(this.xRenderingScale)
          .tickSizeOuter(0)
          .tickFormat(d => this.thresholds[d])
      );
  }

  public destroy() {
    this.subscription.unsubscribe();
    this.tooltip.node();
  }
}

// we can use a stack layout, each node is a key
// we pass an array of nodes => [nodeId, absoluteLoad]
// each node will fall in a particular bin
