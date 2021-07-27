import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { Card } from 'src/app/types/card';
import { CardService } from '../card.service';

@Component({
  selector: 'app-edit-card',
  templateUrl: './edit-card.component.html',
  styleUrls: ['./edit-card.component.scss']
})
export class EditCardComponent implements OnInit, OnDestroy {

  public card: Card | undefined;

  private subscription : Subscription | undefined;

  private id: string;

  constructor(private actRoute: ActivatedRoute, private cardService: CardService) {
    this.id = actRoute.snapshot.params.id
  }

  ngOnInit(): void {
    this.subscription = this.cardService.cards$.subscribe((cards)=> this.refresh(cards))
  } 

  ngOnDestroy(){
    this.subscription?.unsubscribe();
  }

  refresh(cards: Map<string,Card>){
    this.card = cards.get(this.id);
  }

  deleteCard(){
    if(this.card){
      this.cardService.deleteCard(this.card);
    }
  }

}
