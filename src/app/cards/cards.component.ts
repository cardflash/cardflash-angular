import { KeyValue } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { CardDialogWrapperComponent } from '../card-dialog-wrapper/card-dialog-wrapper.component';
import { FlipCardComponent } from '../card/flip-card/flip-card.component';
import { StaticCardComponent } from '../card/static-card/static-card.component';
import { CardEntry, CardEntryContent, DataApiService } from '../data-api.service';
import { UserNotifierService } from '../services/notifier/user-notifier.service';

@Component({
  selector: 'app-cards',
  templateUrl: './cards.component.html',
  styleUrls: ['./cards.component.scss']
})
export class CardsComponent implements OnInit, OnDestroy {
  public cards : CardEntry[]  = [];
  public filteredCards : CardEntry[]  = [];
  public newestFirst: boolean = true;
  constructor(private dataApi: DataApiService, private router: Router, private userNotifier: UserNotifierService,public dialog: MatDialog) { }

  async ngOnInit() {
    this.refresh()
  }

  ngOnDestroy(){
  }

  async refresh(){
    this.cards = await this.dataApi.listCards(this.newestFirst)
    this.filteredCards = this.cards;
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
      this.router.navigate(["/cards/"+card.$id])
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
    const index = Math.floor(Math.random() * this.filteredCards.length);
  this.dialog.open(CardDialogWrapperComponent,{data: {card: this.filteredCards[index]}, backdropClass: 'focusBackdrop'})
  }

}