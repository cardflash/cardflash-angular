import { NgModule } from '@angular/core';
import { ExtraOptions, RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './account/login/login.component';
import { CardsComponent } from './cards/cards.component';

import { CardsForDocumentComponent } from './my/documents/cards-for-document/cards-for-document.component';
import { ExtendedPdfComponent } from './extended-pdf/extended-pdf.component';
import { StudyCardUiComponent } from './study-card-ui/study-card-ui.component';
import { StudyComponent } from './study/study.component';
const routes: Routes = [
  { path: '', redirectTo: '/documents', pathMatch: 'full' },
  {
    path: 'login',
    component: LoginComponent,
  },
  // {
  //   path: 'create/from-pdf',
  //   component: ExtendedPdfComponent,
  // },
  {
    path: 'cards',
    component: CardsComponent,
  },
  // {
  //   path: 'cards/:id',
  //   component: EditCardComponent,
  // },
  // {
  //   path: 'cards/local/:localid',
  //   component: EditCardComponent
  // },
  // {
  //   path: 'documents',
  //   component: DocumentsComponent
  // },
  // {
  //   path: 'create/from-document/:id',
  //   component: ExtendedPdfComponent
  // },
  {
    path: 'doc/:id/cards',
    component: CardsForDocumentComponent
  },
  // {
  //   path: 'extended-pdf',
  //   component: ExtendedPdfComponent
  // },
  // {
  //   path: 'extended-pdf/:id',
  //   component: ExtendedPdfComponent
  // },
  {
    path: 'study',
    component: StudyComponent
  },
  { path: 'documents', loadChildren: () => import('./documents/documents.module').then(m => m.DocumentsModule) },
  { path: 'doc/:id', loadChildren: () => import('./extended-pdf/extended-pdf.module').then(m => m.ExtendedPdfModule) },
  { path: 'doc', loadChildren: () => import('./extended-pdf/extended-pdf.module').then(m => m.ExtendedPdfModule) },
  { path: 'cards/:id', loadChildren: () => import('./edit-card/edit-card.module').then(m => m.EditCardModule) }
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
