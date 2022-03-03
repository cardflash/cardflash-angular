import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ExtendedPdfComponent } from './extended-pdf.component';

const routes: Routes = [{ path: '', component: ExtendedPdfComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ExtendedPdfRoutingModule { }
