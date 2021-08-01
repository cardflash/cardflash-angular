import { KeyValue } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { CardService } from 'src/app/card/card.service';
import { DataService } from 'src/app/data.service';
import { DocumentService } from 'src/app/document.service';
import { Card } from 'src/app/types/card';
import { PDFDocument } from 'src/app/types/pdf-document';

@Component({
  selector: 'app-cards-for-document',
  templateUrl: './cards-for-document.component.html',
  styleUrls: ['./cards-for-document.component.scss']
})
export class CardsForDocumentComponent implements OnInit, OnDestroy {

  public document?: PDFDocument;
  private documentsSubscription : Subscription | undefined;
  public id: string;
  constructor(private dataService: DataService, private cardService: CardService, private actRoute: ActivatedRoute, private documentService: DocumentService, private router: Router){
    this.id = actRoute.snapshot.params.id
   }

  async ngOnInit() {
  this.documentsSubscription = this.documentService.documents$.subscribe((docs)=> this.loadDocuments(docs))
  }

  ngOnDestroy(){
      this.documentsSubscription?.unsubscribe();
  }

  async loadDocuments(docs: Map<string,PDFDocument>){
    console.log(docs);
    this.document = docs.get(this.id);
  }

  async loadDocument(){
    this.document = await this.dataService.getOnlineDocument('documents',this.id);
}

  creationTimeOrder(a : KeyValue<string,Card>, b : KeyValue<string,Card>){
    if(a.value.creationTime && b.value.creationTime){
      return a.value.creationTime < b.value.creationTime ?
            1 : ( a.value.creationTime > b.value.creationTime ? -1 : 0)
    }else{
      if(a.value.creationTime){
        return -1;
      }else if(b.value.creationTime){
        return 1;
      }else{
        return 0;
      }
    }
  }

  deleteCard(card: Card){
    this.cardService.deleteCard(card);
  }

  editCard(card: Card){
    this.router.navigate(["/cards/"+card.$id])
  }




}