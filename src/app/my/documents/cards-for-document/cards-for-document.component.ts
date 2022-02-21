import { KeyValue } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { CardDialogWrapperComponent } from 'src/app/card-dialog-wrapper/card-dialog-wrapper.component';
import { CardEntry, CardEntryContent, DataApiService, DocumentEntry } from 'src/app/data-api.service';

@Component({
  selector: 'app-cards-for-document',
  templateUrl: 'cards-for-document.component.html',
  styleUrls: ['cards-for-document.component.scss']
})
export class CardsForDocumentComponent implements OnInit, OnDestroy {

  public document?: DocumentEntry;
  public cards: Promise<CardEntry>[] = []
  public id: string;
  constructor(public dataApi: DataApiService, private actRoute: ActivatedRoute, private router: Router,public dialog: MatDialog){
    this.id = actRoute.snapshot.params.id
   }

  async ngOnInit() {
    this.dataApi.getDocument(this.id).then((doc) => {
      this.document = doc;
      this.cards = [];
      doc.cardIDs?.forEach((cID) => {
        this.cards.push(this.dataApi.getCard(cID))
      })
    })
  }

  ngOnDestroy(){

  }


  creationTimeOrder(a : KeyValue<string,CardEntry | CardEntryContent>, b : KeyValue<string,CardEntry | CardEntryContent>){
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

  deleteCard(card: CardEntry | CardEntryContent){
    if(card.$id){
      this.dataApi.deleteCard(card.$id);
    }
  }

  editCard(card: CardEntry | CardEntryContent){
    this.router.navigate(["/cards/"+card.$id])
  }

  async startStudy(){
    const index = Math.floor(Math.random() * this.cards.length);
    this.dialog.open(CardDialogWrapperComponent,{data: {card: await this.cards[index]}})
  }




}