import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CardEntry, CardEntryContent } from 'src/app/data-api.service';

@Component({
  selector: 'app-flip-card',
  templateUrl: './flip-card.component.html',
  styleUrls: ['./flip-card.component.scss']
})
export class FlipCardComponent implements OnInit {

  @Input('card') public card : CardEntry | CardEntryContent = {front: '', back: '',page: 0, hiddenText: '', chapter: '', title: '', creationTime: Date.now()} 

    
  @Output('edit') public editEmitter: EventEmitter<CardEntry | CardEntryContent> = new EventEmitter<CardEntry | CardEntryContent>();

  @Output('delete') public deleteEmitter: EventEmitter<CardEntry | CardEntryContent> = new EventEmitter<CardEntry | CardEntryContent>();
  
  constructor() { }

  ngOnInit(): void {
  }

  async deleteCard(){
  }

  editCard(){

  }

}
