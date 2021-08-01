import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { DataService } from 'src/app/data.service';
import { Card } from 'src/app/types/card';
import { CardService } from '../card.service';

@Component({
  selector: 'app-static-card',
  templateUrl: './static-card.component.html',
  styleUrls: ['./static-card.component.scss']
})
export class StaticCardComponent implements OnInit {

  @Input('card') public card : Card = {localID: '0', front: '', back: '',page: 0, hiddenText: '', chapter: '', title: ''} 
  
  @Output('edit') public editEmitter: EventEmitter<Card> = new EventEmitter<Card>();

  @Output('delete') public deleteEmitter: EventEmitter<Card> = new EventEmitter<Card>();

  constructor(public cardService: CardService) { }

  ngOnInit(): void {
  }

}
