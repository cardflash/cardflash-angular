import { KeyValue } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { CardService } from '../card/card.service';
import { DataService } from '../data.service';
import { UserNotifierService } from '../services/notifier/user-notifier.service';
import { Card } from '../types/card';

@Component({
  selector: 'app-cards',
  templateUrl: './cards.component.html',
  styleUrls: ['./cards.component.scss']
})
export class CardsComponent implements OnInit, OnDestroy {
  public cardsCollection: Map<string,Card> = new Map<string,Card>();
  public filteredCards: Card[] = [];
  private subscription : Subscription | undefined;
  constructor(private dataService: DataService, private cardService: CardService, private router: Router, private userNotifier: UserNotifierService) { }

  async ngOnInit() {
    this.userNotifier.loadStatus = 40;
    this.subscription = this.cardService.cards$.subscribe((cards)=> {if(cards !== undefined) this.loadCards(cards)})
  }

  ngOnDestroy(){
    this.subscription?.unsubscribe();
  }


  loadCards(cards: Map<string,Card>){
    this.userNotifier.loadStatus = 80;
    console.log("Loading cards");
    this.cardsCollection = cards;
    this.search("");
    for(const card of cards.values()){
      if(card.imgs){
        const prefixed = card.imgs.map((val) => "__SERVER__:"+val)
        const serverNamingFunc = (i : number) => this.dataService.getFileView(card.imgs![i]).href;
        card.front = CardService.replaceImageLinks(card.front,prefixed,serverNamingFunc);
        card.back = CardService.replaceImageLinks(card.back,prefixed,serverNamingFunc);
      }
  }
  this.userNotifier.loadStatus = 100;
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
    if(card.$id){
      this.router.navigate(["/cards/"+card.$id])
    }else{
      this.router.navigate(["/cards/local/"+card.localID])
    }
  }

  search(query: string){
    query = query.toLowerCase();
    this.filteredCards = [];
    this.cardsCollection.forEach((card) => {
      if(card.front.toLowerCase().includes(query) || card.back.toLowerCase().includes(query) || card.hiddenText.toLowerCase().includes(query) || card.title.toLowerCase().includes(query) || card.chapter.toLowerCase().includes(query)){
        this.filteredCards.push(card);
      }
    })
    this.filteredCards.sort((a,b) => (a.creationTime || 0) < (b.creationTime || 0) ? 1 : (a.creationTime === b.creationTime ? 0 : -1))
  }




}