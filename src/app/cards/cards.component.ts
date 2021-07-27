import { KeyValue } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { CardService } from '../card/card.service';
import { DataService } from '../data.service';
import { Card } from '../types/card';

@Component({
  selector: 'app-cards',
  templateUrl: './cards.component.html',
  styleUrls: ['./cards.component.scss']
})
export class CardsComponent implements OnInit, OnDestroy {
  public cardsCollection: Map<string,Card> = new Map<string,Card>();
  private subscription : Subscription | undefined;
  constructor(private dataService: DataService, private cardService: CardService) { }

  async ngOnInit() {
    this.subscription = this.cardService.cards$.subscribe((cards)=> this.loadCards(cards))
  }

  ngOnDestroy(){
    this.subscription?.unsubscribe();
  }


  loadCards(cards: Map<string,Card>){
    console.log("Loading cards");
    this.cardsCollection = cards;
    for(const card of cards.values()){
      if(card.imgs){
        const prefixed = card.imgs.map((val) => "__SERVER__:"+val)
        const serverNamingFunc = (i : number) => this.dataService.getFileView(card.imgs![i]).href;
        card.front = CardService.replaceImageLinks(card.front,prefixed,serverNamingFunc);
        card.back = CardService.replaceImageLinks(card.back,prefixed,serverNamingFunc);
      }
  }
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




}