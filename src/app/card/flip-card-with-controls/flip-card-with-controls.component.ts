import { Component, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import { CardEntry, CardEntryContent } from 'src/app/data-api.service';
import { FlipCardComponent } from '../flip-card/flip-card.component';

@Component({
  selector: 'app-flip-card-with-controls',
  templateUrl: './flip-card-with-controls.component.html',
  styleUrls: ['./flip-card-with-controls.component.scss']
})
export class FlipCardWithControlsComponent implements OnInit {
  @Input('card') public card : CardEntry | CardEntryContent = {front: '', back: '',page: 0, hiddenText: '', chapter: '', title: '', creationTime: Date.now()} 

  @Output('edit') public editEmitter: EventEmitter<CardEntry | CardEntryContent> = new EventEmitter<CardEntry | CardEntryContent>();

  @Output('delete') public deleteEmitter: EventEmitter<CardEntry | CardEntryContent> = new EventEmitter<CardEntry | CardEntryContent>();
  

  @ViewChild('flipCard') 
  private flipCard?: FlipCardComponent;



  constructor() { }

  ngOnInit(): void {
  }


  flip(){
    if(this.flipCard){
      this.flipCard.flipped = !this.flipCard.flipped;
    }
  }



  flipToSideForAnnotation(annotationID: string){
    this.flipCard?.flipToSideForAnnotation(annotationID);
  }

}
