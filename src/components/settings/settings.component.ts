import {
  ChangeDetectionStrategy, ChangeDetectorRef,
  Component, ElementRef, ViewChild,
  ViewEncapsulation
} from '@angular/core';
import 'codemirror/addon/lint/lint';
import 'codemirror/addon/lint/json-lint';
import 'codemirror/mode/javascript/javascript';
import 'codemirror/addon/lint/lint';
import 'codemirror/addon/lint/javascript-lint';
import * as CodeMirror from 'codemirror';

import * as jsonlint from 'jsonlint-mod';
import { NodesLoadService } from '../../app/nodes-load.service';
// hack to make code-mirror work :(
(<any>window).jsonlint = jsonlint;

@Component({
  selector: 'lbl-settings',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './setting.component.html',
  styleUrls: ['./style.less']
})
export class SettingsComponent {
  options;
  contentFile;
  contentNode;
  contentDist;

  // TODO(chab) re-use the older codemirror component instead
  @ViewChild('cma', { static: false}) cma: ElementRef;
  @ViewChild('cmb', { static: false}) cmb: ElementRef;
  @ViewChild('cmc', { static: false}) cmc: ElementRef;

  constructor(private nodesLoadService: NodesLoadService, private cdr: ChangeDetectorRef) {

    this.getSnapshottedState();

    this.options = {
      mode: 'application/json',
      lineNumbers: true,
      lineWrapping: true,
      autoCloseBrackets: true,
      gutters: ['CodeMirror-lint-markers'],
      lint: true
    };
  }

  public resetState() {
    // it turns out that the code mirror component is not good

    this.nodesLoadService.resetState();
    this.getSnapshottedState();
    (<any>this.cma).value = this.contentFile;
    (<any>this.cma).codeMirror.setValue(this.contentFile);
    (<any>this.cmb).value = this.contentFile;
    (<any>this.cmb).codeMirror.setValue(this.contentNode);
    (<any>this.cmc).value = this.contentFile;
    (<any>this.cmc).codeMirror.setValue(this.contentDist);
  }


  private getSnapshottedState() {
    const state = this.nodesLoadService.getStateSnapshot();
    this.contentFile = JSON.stringify(state.files);
    this.contentNode = JSON.stringify(state.nodes);
    this.contentDist = JSON.stringify(state.fileToNode);
  }

  // TODO(chab) refactor
  public onFileChange($event) {
    try {
      const files = JSON.parse($event);
      this.nodesLoadService.updateFiles(files);
    } catch (e) {}
  }
  public onDistChange($event) {
    try {
      const d = JSON.parse($event);
      this.nodesLoadService.updateDistribution(d);
    } catch (e) {}
  }
  public onNodeChange($event) {
    try {
      const nodes = JSON.parse($event);
      this.nodesLoadService.updateNodes(nodes);
    } catch (e) {}
  }
}
