import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { GraphRoutingModule } from './graph-routing.module';
import { GraphComponent } from './graph.component';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';


@NgModule({
  declarations: [
    GraphComponent
  ],
  imports: [
    CommonModule,
    GraphRoutingModule,
    MatButtonModule,
    MatIconModule
  ],
  exports: [GraphComponent]
})
export class GraphModule { }
