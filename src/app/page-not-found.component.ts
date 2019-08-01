import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'lbl-page-not-found',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nz-result
      nzStatus="404"
      nzTitle="404"
      nzSubTitle="Sorry, the page you visited does not exist."
    >
      <div nz-result-extra>
        <button (click)="navigateHome()" nz-button nzType="primary">
          Back Home
        </button>
      </div>
    </nz-result>
  `
})
export class PageNotFoundComponent {
  constructor(private router: Router) {}
  public navigateHome() {
    this.router.navigateByUrl('/');
  }
}
