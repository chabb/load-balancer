/**
 *
 *  This service holds the global state of the nodes / files / repartition
 *
 */

import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { schemePaired } from 'd3-scale-chromatic';
import { scaleBand, scaleLinear, scaleQuantize, scaleOrdinal } from 'd3-scale';

export enum RepartitionValidity {
  VALID = 'VALID',
  INVALID = 'INVALID'
}

interface Nodes { [nodeId: string]: number };
interface Files  { [fileId: string]: number };
interface Distribution  { [fileId: string]: string };

export interface SystemState {
  nodes: Nodes;
  files: Files;
  fileToNode: Files;
  nodeLoad: { [nodeId: string]: NodeLoad };
  validity: RepartitionValidity;
}

export interface NodeLoad {
  files: string[];
  absoluteLoad: number;
  relativeLoad: number;
  nodeId: string;
}

const NODES_CAPACITY: Nodes = {
  node1: 1234,
  node2: 1432,
  node3: 999,
  node4: 111,
  node5: 888,
  node6: 222,
  node7: 777,
  node8: 333,
  node9: 667,
  node10: 444
};

const FILES_SIZE: Files = {
  file1: 25,
  file2: 252,
  file3: 525,
  file4: 363,
  file5: 36,
  file6: 47,
  file7: 474,
  file8: 907,
  file9: 585,
  file10: 69,
  file11: 696
};

const DISTRIBUTION: Distribution = {
  file1: 'node8',
  file5: 'node8',
  file6: 'node4',
  file10: 'node6',
  file2: 'node10',
  file4: 'node9',
  file7: 'node7',
  file9: 'node2',
  file11: 'node1',
  file3: 'node5',
  file8: 'node3'
};

@Injectable()
export class NodesLoadService {
  private readonly onNodeUpdate$ = new Subject();
  private readonly onFileUpdate$ = new Subject();
  private readonly onDistributionUpdate$ = new Subject();

  private readonly systemState$: BehaviorSubject<
    SystemState
  > = new BehaviorSubject(
    this.computeState(NODES_CAPACITY, FILES_SIZE, DISTRIBUTION)
  );

  private readonly selectionState$: BehaviorSubject<
    string[]
  > = new BehaviorSubject<string[]>([]);

  private readonly configState$: BehaviorSubject<any> = new BehaviorSubject<any>(this.getScale(false));

  public readonly tableColors$ = this.configState$.pipe((map((s) =>
       (nodeId) =>  (s.colorizeNodes) ? s.scale(nodeId) : ''
  )));

  // TOD  proper reducer functions
  constructor() {
    combineLatest(
      this.onNodeUpdate$,
      this.onFileUpdate$,
      this.onDistributionUpdate$
    )
      .pipe(
        map(([nodes, files, distributions]) => {
          return this.computeState(nodes, files, distributions);
        })
      )
      .subscribe(s => {
        this.systemState$.next(s);
      });

    this.onNodeUpdate$.next(NODES_CAPACITY);
    this.onDistributionUpdate$.next(DISTRIBUTION);
    this.onFileUpdate$.next(FILES_SIZE);
  }

  // Note(chab) this is meant to be used in specific use-case, e.g, you
  // want to grab the state and then edit it. In that case, you WANT a snapshot,
  // otherwise the state would keep changing, providing a very weird experience to
  // the end user

  public resetState() {
    this.systemState$.next(this.computeState(NODES_CAPACITY, FILES_SIZE, DISTRIBUTION));
  }

  public updateColorMapping(colorizeNodes: boolean) {
    this.configState$.next(this.getScale(colorizeNodes));
  }

  public getCurrentScale() {
    return this.configState$.getValue();
  }

  private getScale(colorizeNodes: boolean) {
    return { scale:scaleOrdinal()
      .range(colorizeNodes ? schemePaired : ['steelblue'])
      .domain([0, Object.keys(this.getStateSnapshot().nodes)]), colorizeNodes};
  }

  public getStateSnapshot(): SystemState {
    return this.systemState$.getValue();
  }

  public nodes() {
    return this.systemState$.asObservable();
  }

  public nodesToHiglight() {
    return this.selectionState$.asObservable();
  }

  public updateSelectedNodes(nodes: string[]) {
    this.selectionState$.next(nodes);
  }

  public updateNodes(nodes) {
    this.onNodeUpdate$.next(nodes);
  }

  public updateDistribution(d) {
    this.onDistributionUpdate$.next(d);
  }

  public updateFiles(files) {
    this.onFileUpdate$.next(files);
  }

  public getNodeCapacity(nodeId: string): number {
    const value = this.systemState$.getValue().nodes[nodeId];
    if (value !== 0 && !value) {
      console.error('Unknow node id', nodeId);
    }
    return value;
  }

  public getFileSize(fileId: string): number {
    const value = this.systemState$.getValue().files[fileId];
    if (value !== 0 && !value) {
      console.error('Unknow file id', fileId);
    }
    return value;
  }

  private computeState(nodes, files, distribution): SystemState {
    const validity = checkDistribution(nodes, files, distribution);
    switch (validity) {
      case RepartitionValidity.VALID: {
        console.warn('Invalid repartition');
        return {
          validity,
          nodes,
          files,
          fileToNode: distribution,
          nodeLoad: computeState(nodes, files, distribution)
        };
      }
      case RepartitionValidity.INVALID: {
        console.warn('Invalid repartition');
        return getInvalidState(nodes, files);
      }
      default: {
        console.error('Unknown validity state');
        return getInvalidState(nodes, files);
      }
    }
  }
}

// ensure that the distribution is valid
function checkDistribution(
  nodes: Nodes,
  files: Files,
  distribution: Distribution
): RepartitionValidity {
  return Object.keys(distribution).some(
    fileId => !files[fileId] || !nodes[distribution[fileId]]
  )
    ? RepartitionValidity.INVALID
    : RepartitionValidity.VALID;
}
// if distribution is correct, we compute a new state
function computeState(
  nodes: Nodes,
  files: Files,
  distribution: Distribution
): { [nodeId: string]: NodeLoad } {
  // first pass compute absolute load
  const computedDistribution = Object.keys(distribution).reduce(
    (acc: { [nodeId: string]: NodeLoad }, fileId) => {
      const nodeId = distribution[fileId];
      if (acc[nodeId]) {
        acc[distribution[fileId]].files.push(fileId);
        acc[distribution[fileId]].absoluteLoad += files[fileId];
      } else {
        acc[distribution[fileId]] = {
          files: [fileId],
          absoluteLoad: files[fileId],
          relativeLoad: null,
          nodeId
        };
      }
      return acc;
    },
    {}
  );
  // second pass compute relative load
  // this could be done in the above loop ^^, but we would have to recompute a few times
  Object.values(computedDistribution).map((nodeLoad: NodeLoad) => {
    nodeLoad.relativeLoad = nodeLoad.absoluteLoad / nodes[nodeLoad.nodeId];
  });
  return computedDistribution;
}

function getInvalidState(nodes, files) {
  return {
    validity: RepartitionValidity.INVALID,
    nodes,
    files,
    fileToNode: {},
    nodeLoad: {}
  };
}
