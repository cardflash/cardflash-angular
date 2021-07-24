import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './account/login/login.component';
import { CardsComponent } from './cards/cards.component';
import { FromPdfComponent } from './create/from-pdf/from-pdf.component';

const routes: Routes = [
  {
    path: 'login',
    component: LoginComponent
  },
  {
    path: 'create/from-pdf',
    component: FromPdfComponent
  },
  {
    path: 'cards',
    component: CardsComponent
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
