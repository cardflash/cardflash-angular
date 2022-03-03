import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CardEntry, CardEntryContent } from 'src/app/data-api.service';

@Component({
  selector: 'app-static-card',
  templateUrl: './static-card.component.html',
  styleUrls: ['./static-card.component.scss']
})
export class StaticCardComponent implements OnInit {

  @Input('card') public card : (CardEntry | CardEntryContent) = { front: '', back: '',page: 0, hiddenText: '', chapter: '', title: '', creationTime: Date.now()} 
  
  @Output('edit') public editEmitter: EventEmitter<CardEntry | CardEntryContent> = new EventEmitter<CardEntry | CardEntryContent>();

  @Output('delete') public deleteEmitter: EventEmitter<CardEntry | CardEntryContent> = new EventEmitter<CardEntry | CardEntryContent>();

  constructor() { }

  ngOnInit(): void {
  }

}
