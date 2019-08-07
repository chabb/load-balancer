import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { NodesLoadService } from '../../app/nodes-load.service';
import { combineLatest, map, tap } from 'rxjs/operators';
import { BehaviorSubject, merge } from 'rxjs';
import { percentFormatter } from '../../utils/formatter';

@Component({
  selector: 'lbl-node-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './node-table.component.html',
  styleUrls: ['./node-table.component.less']
})
export class NodeTableComponent {
  public readonly mapOfExpandData: { [key: string]: boolean } = {};
  public percentFormatter = percentFormatter;
  private sortState$ = new BehaviorSubject({
    sortKey: null,
    sortValue: 'ascend'
  });

  public nodes$ = merge(
    this.nodeLoadService.nodes().pipe(
      combineLatest(this.sortState$),
      map(([state, { sortKey, sortValue }]) => {
        return this.sort(sortKey, sortValue, Object.values(state.nodeLoad));
      })
    )
  );

  public color$ = this.nodeLoadService.tableColors$;

  public highlightNodes$ = this.nodeLoadService
    .nodesToHiglight()
    .pipe(
      map(nodes => nodes.reduce((acc, node) => {
        acc[node] = true;
        return acc;
      }, {}))
    );

  constructor(private nodeLoadService: NodesLoadService) {}

  onMouseOver($event) {
    this.nodeLoadService.updateSelectedNodes([$event]);
  }

  onMouseOut() {
    this.nodeLoadService.updateSelectedNodes([]);
  }

  public getNodeCapacity(nodeId: string): number {
    return this.nodeLoadService.getNodeCapacity(nodeId);
  }

  public getFileSize(fileId: string): number {
    return this.nodeLoadService.getFileSize(fileId);
  }

  public onSort({ key, value }): void {
    this.sortState$.next({ sortKey: key, sortValue: value });
  }

  private sort(sortKey, sortValue, data) {
    const valueFunction =
      sortKey === 'capacity'
        ? d => this.getNodeCapacity(d.nodeId)
        : d => d[sortKey];

    return !!sortKey
      ? data.sort((a, b) =>
          sortValue === 'ascend'
            ? valueFunction(a) > valueFunction(b)
              ? 1
              : -1
            : valueFunction(b) > valueFunction(a)
            ? 1
            : -1
        )
      : data;
  }
}
