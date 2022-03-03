import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FlipCardWithControlsComponent } from '../card/flip-card-with-controls/flip-card-with-controls.component';
import { FlipCardComponent } from '../card/flip-card/flip-card.component';
import { StaticCardSideComponent } from '../card/static-card-side/static-card-side.component';
import { StaticCardComponent } from '../card/static-card/static-card.component';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatCardModule } from '@angular/material/card';
import { StackedCardsComponent } from '../stacked-cards/stacked-cards.component';
import {DragDropModule} from '@angular/cdk/drag-drop'; 


@NgModule({
  declarations: [StaticCardSideComponent, StaticCardComponent, FlipCardComponent, FlipCardWithControlsComponent, StackedCardsComponent],
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatCardModule,
    DragDropModule
  ],
  exports: [StaticCardSideComponent, StaticCardComponent, FlipCardComponent, FlipCardWithControlsComponent, StackedCardsComponent]
})
export class StaticCardsModule { }
