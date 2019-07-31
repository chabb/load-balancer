import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { combineLatest, map } from 'rxjs/operators';
import { NodesLoadService } from '../../app/nodes-load.service';
import { BehaviorSubject } from 'rxjs';

@Component({
  selector: 'lbl-distribution-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './distribution-table.component.html',
  styleUrls: ['./distribution-table.component.less']
})
export class DistributionTableComponent {
  constructor(private nodeLoadService: NodesLoadService) {}

  onMouseOver(nodeId) {
    this.nodeLoadService.updateSelectedNodes([nodeId]);
  }

  onMouseOut() {
    this.nodeLoadService.updateSelectedNodes([]);
  }

  public color$ = this.nodeLoadService.tableColors$;

  private sortState$ = new BehaviorSubject({
    sortKey: null,
    sortValue: 'ascend'
  });

  public files$ = this.nodeLoadService.nodes().pipe(
    combineLatest(this.sortState$),
    map(([state, { sortKey, sortValue }]) => {
      return this.sort(
        sortKey,
        sortValue,
        Object.keys(state.fileToNode).map(file => {
          return { fileId: file, nodeId: state.fileToNode[file] };
        })
      );
    })
  );

  //TODO(chab) refactor to prevent duplicate
  public highlightNodes$ = this.nodeLoadService
    .nodesToHiglight()
    .pipe(
      map(nodes => nodes.reduce((acc, node) => (acc[node] = true) && acc, {}))
    );

  public onSort({ key, value }): void {
    this.sortState$.next({ sortKey: key, sortValue: value });
  }

  private sort(sortKey, sortValue, data) {
    const valueFunction = d => d[sortKey];
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
