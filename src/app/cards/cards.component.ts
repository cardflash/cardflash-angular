import { KeyValue } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { CardDialogWrapperComponent } from '../card-dialog-wrapper/card-dialog-wrapper.component';
import { FlipCardComponent } from '../card/flip-card/flip-card.component';
import { StaticCardComponent } from '../card/static-card/static-card.component';
import { CardEntry, CardEntryContent, DataApiService } from '../data-api.service';
import { UserNotifierService } from '../services/notifier/user-notifier.service';
import { ENTRY_TYPES } from '../types/data-api-provider';

@Component({
  selector: 'app-cards',
  templateUrl: './cards.component.html',
  styleUrls: ['./cards.component.scss']
})
export class CardsComponent implements OnInit, OnDestroy {
  public cards : CardEntry[]  = [];
  public filteredCards : CardEntry[]  = [];
  public newestFirst: boolean = true;

  public isLoadingCards: boolean = true;
  public limit = 100;
  public totalNumCards = 0;
  constructor(private dataApi: DataApiService, private router: Router, private userNotifier: UserNotifierService,public dialog: MatDialog) { }

  async ngOnInit() {
    this.refresh()
  }

  ngOnDestroy(){
  }

  async refresh(){
    this.cards = await this.dataApi.listCards(this.newestFirst,this.limit)
    this.totalNumCards = (await this.dataApi.getProviderInstance().listEntries<CardEntry>(ENTRY_TYPES.CARDS, undefined, true)).sum;
    this.filteredCards = this.cards;
    this.isLoadingCards = false;
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
      this.cards = this.cards.filter((c) => c.$id !== card.$id)
      this.filteredCards = this.filteredCards.filter((c) => c.$id !== card.$id)
      this.dataApi.deleteCard(card.$id)
    }
  }

  editCard(card: CardEntry | CardEntryContent){
    if(card.$id){
      this.router.navigate(["/cards/"+card.$id+"/edit"])
    }
  }

  viewCard(card: CardEntry | CardEntryContent){
    if(card.$id){
      this.router.navigate(["/cards/"+card.$id])
    }
  }

  cardClicked(event: any, card: CardEntry | CardEntryContent){
    console.log({event})
    if(event.target && event.target.tagName !== 'MAT-ICON' && event.target.tagName !== 'BUTTON'){
      event.preventDefault();
      this.viewCard(card);
    }
  }

  trackyByCardId(index: number, card: CardEntry | CardEntryContent){
    return card.$id || index;
  }

  search(query: string){
    if(query.length === 0){
      this.filteredCards = this.cards;
    }else{
      const lower = query.toLowerCase();
      this.filteredCards = this.cards.filter((card) => {
        return card.front.toLowerCase().indexOf(lower) >= 0 || card.back.toLowerCase().indexOf(lower) >= 0 || card.hiddenText.toLowerCase().indexOf(lower) >= 0;
      })
          }
  }

  startStudy(){
  this.dialog.open(CardDialogWrapperComponent,{data: {cards: this.filteredCards}, backdropClass: 'focusBackdrop', panelClass: 'fullscreenPanel'})
  }

}