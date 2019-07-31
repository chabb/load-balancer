import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Observable } from 'rxjs';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map, startWith, tap } from 'rxjs/operators';

interface NavBarItem {
  label: string;
  icon: string;
  target: string;
}
const NAV_BAR: NavBarItem[] = [
  { icon: 'dashboard', label: 'Dashboard', target: 'dashboard' },
  { icon: 'sliders', label: 'Extras', target: 'extras' },
  { icon: 'setting', label: 'Settings', target: 'settings' }
];

@Component({
  selector: 'lbl-app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.less']
})
export class AppComponent {
  public title = 'load-balancer';
  public navItems = NAV_BAR;

  private activeRoute$ = new Observable<string>();
  public routeToApp = NAV_BAR.reduce((acc, app) => {
    acc[app.target] = app.label;
    return acc;
  }, {});

  constructor(private router: Router) {
    this.activeRoute$ = this.router.events.pipe(
      filter((evt: NavigationEnd) => evt instanceof NavigationEnd),
      map(event => event.urlAfterRedirects),
      startWith(this.router.url),
      map(url => url.replace(/^\//, '')),
    );
  }
}
