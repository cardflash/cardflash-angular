import { NgModule } from '@angular/core';
import { ExtraOptions, RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './account/login/login.component';
import { EditCardComponent } from './card/edit-card/edit-card.component';
import { CardsComponent } from './cards/cards.component';
import { CardsForDocumentComponent } from './my/documents/cards-for-document/cards-for-document.component';
import { DocumentsComponent } from './my/documents/documents.component';
import { ExtendedPdfComponent } from './extended-pdf/extended-pdf.component';
const routes: Routes = [
  { path: '', redirectTo: '/cards', pathMatch: 'full' },
  {
    path: 'login',
    component: LoginComponent,
  },
  {
    path: 'create/from-pdf',
    component: ExtendedPdfComponent,
  },
  {
    path: 'cards',
    component: CardsComponent,
  },
  {
    path: 'cards/:id',
    component: EditCardComponent,
  },
  {
    path: 'cards/local/:localid',
    component: EditCardComponent
  },
  {
    path: 'documents',
    component: DocumentsComponent
  },
  {
    path: 'create/from-document/:id',
    component: ExtendedPdfComponent
  },
  {
    path: 'documents/:id/cards',
    component: CardsForDocumentComponent
  },
  {
    path: 'extended-pdf',
    component: ExtendedPdfComponent
  },
  {
    path: 'extended-pdf/:id',
    component: ExtendedPdfComponent
  },
  {
    path: 'doc/:id',
    component: ExtendedPdfComponent
  }
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
