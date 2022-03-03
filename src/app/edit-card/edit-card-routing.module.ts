import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { EditCardComponent } from './edit-card.component';

const routes: Routes = [{ path: '', component: EditCardComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class EditCardRoutingModule { }
