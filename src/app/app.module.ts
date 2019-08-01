import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { NgZorroAntdModule, NZ_I18N, en_US } from 'ng-zorro-antd';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { registerLocaleData } from '@angular/common';
import en from '@angular/common/locales/en';

import { NodeTableComponent } from '../components/node-table/node-table.component';
import { NodesLoadService } from './nodes-load.service';
import { DistributionTableComponent } from '../components/distribution-table/distribution-table.component';
import { SettingsComponent } from '../components/settings/settings.component';
import { DashboardComponent } from '../components/dashboard/dashboard.component';
import { ExtraComponent } from '../components/extra/extra.component';
import { PageNotFoundComponent } from './page-not-found.component';
import { CodemirrorComponent, CodemirrorModule } from '@ctrl/ngx-codemirror';

registerLocaleData(en);

@NgModule({
  declarations: [
    AppComponent,
    NodeTableComponent,
    DistributionTableComponent,
    SettingsComponent,
    DashboardComponent,
    ExtraComponent,
    PageNotFoundComponent
  ],
  imports: [
    BrowserModule,
    CodemirrorModule,
    AppRoutingModule,
    NgZorroAntdModule,
    FormsModule,
    HttpClientModule,
    BrowserAnimationsModule
  ],
  providers: [{ provide: NZ_I18N, useValue: en_US }, NodesLoadService],
  bootstrap: [AppComponent]
})
export class AppModule {}

console.log('stf--');
