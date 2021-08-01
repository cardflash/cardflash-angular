import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Card } from 'src/app/types/card';
import { CardService } from '../card.service';

@Component({
  selector: 'app-flip-card',
  templateUrl: './flip-card.component.html',
  styleUrls: ['./flip-card.component.scss']
})
export class FlipCardComponent implements OnInit {

  @Input('card') public card : Card = {localID: '0', front: '', back: '',page: 0, hiddenText: '', chapter: '', title: ''} 

    
  @Output('edit') public editEmitter: EventEmitter<Card> = new EventEmitter<Card>();

  @Output('delete') public deleteEmitter: EventEmitter<Card> = new EventEmitter<Card>();
  
  constructor(public cardService: CardService) { }

  ngOnInit(): void {
  }

  async deleteCard(){
    this.cardService.deleteCard(this.card);
  }

  editCard(){

  }

}
