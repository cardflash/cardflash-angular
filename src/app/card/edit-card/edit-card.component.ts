import { stringify } from '@angular/compiler/src/util';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { DataService } from 'src/app/data.service';
import { DocumentService } from 'src/app/document.service';
import { Card } from 'src/app/types/card';
import { PDFDocument } from 'src/app/types/pdf-document';
import { CardService } from '../card.service';

@Component({
  selector: 'app-edit-card',
  templateUrl: './edit-card.component.html',
  styleUrls: ['./edit-card.component.scss']
})
export class EditCardComponent implements OnInit, OnDestroy {

  public card: Card | undefined;

  private subscription : Subscription | undefined;

  private id?: string;
  private localID?: string;

  public document: PDFDocument | undefined;

  private documentSubscription: Subscription | undefined;

  constructor(private actRoute: ActivatedRoute, private cardService: CardService, private documentService: DocumentService, public dataService: DataService) {
    this.id = actRoute.snapshot.params.id
    this.localID = actRoute.snapshot.params.localid;
  }

  ngOnInit(): void {
    this.subscription = this.cardService.cards$.subscribe((cards)=> this.refresh(cards))
    this.documentSubscription = this.documentService.documents$.subscribe((docs) => this.refreshDocuments(docs));

  } 

  ngOnDestroy(){
    this.subscription?.unsubscribe();
    this.documentSubscription?.unsubscribe();
  }

  refreshDocuments(docs: Map<string,PDFDocument>){
    docs.forEach((doc) => {
      if(doc.cards){
        const index = doc.cards.findIndex((card) => (card.$id  && card.$id == this.id));
        if(index >= 0){
          this.document = doc;
          return;
        }
      }
    })

  }

  refresh(cards: Map<string,Card>){
    if(this.id){
      this.card = cards.get(this.id);
    }else if(this.localID){
      cards.forEach((card) => {
        if(card.localID === this.localID){
          this.card = card;
        }
      })
    }
  }

  deleteCard(){
    if(this.card){
      this.cardService.deleteCard(this.card);
    }
  }

}
