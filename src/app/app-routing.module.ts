import { NgModule } from '@angular/core';
import { ExtraOptions, RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './account/login/login.component';
import { EditCardComponent } from './card/edit-card/edit-card.component';
import { CardsComponent } from './cards/cards.component';
import { FromPdfComponent } from './create/from-pdf/from-pdf.component';

const routes: Routes = [
  { path: '', redirectTo: '/cards', pathMatch: 'full' },
  {
    path: 'login',
    component: LoginComponent,
  },
  {
    path: 'create/from-pdf',
    component: FromPdfComponent,
  },
  {
    path: 'cards',
    component: CardsComponent,
  },
  {
    path: 'cards/:id',
    component: EditCardComponent,
  },
];

const routerOptions: ExtraOptions = {
  anchorScrolling: 'enabled',
  onSameUrlNavigation: 'reload',
  scrollPositionRestoration: 'enabled',
};

@NgModule({
  imports: [RouterModule.forRoot(routes, routerOptions)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
