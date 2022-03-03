import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FabExpandButtonComponent } from './fab-expand-button.component';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';



@NgModule({
  declarations: [FabExpandButtonComponent],
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule
  ],
  exports: [FabExpandButtonComponent]
})
export class FabExpandButtonModule { }
