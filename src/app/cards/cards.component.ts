import { KeyValue } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { CardEntry, CardEntryContent, DataApiService } from '../data-api.service';
import { DataService } from '../data.service';
import { UserNotifierService } from '../services/notifier/user-notifier.service';

@Component({
  selector: 'app-cards',
  templateUrl: './cards.component.html',
  styleUrls: ['./cards.component.scss']
})
export class CardsComponent implements OnInit, OnDestroy {
  public cards : CardEntry[]  = [];
  constructor(private dataApi: DataApiService, private router: Router, private userNotifier: UserNotifierService) { }

  async ngOnInit() {
    this.refresh()
  }

  ngOnDestroy(){
  }

  async refresh(){
    this.cards = await this.dataApi.listCards()
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
}




}