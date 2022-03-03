import { Component, ElementRef, EventEmitter, Inject, Input, OnInit, Output, ViewChild } from '@angular/core';
import { CardEntry, CardEntryContent } from 'src/app/data-api.service';
import { StaticCardSideComponent } from '../static-card-side/static-card-side.component';
import {MAT_DIALOG_DATA} from '@angular/material/dialog';

@Component({
  selector: 'app-flip-card',
  templateUrl: './flip-card.component.html',
  styleUrls: ['./flip-card.component.scss']
})
export class FlipCardComponent implements OnInit {

  @Input('card') public card : CardEntry | CardEntryContent = {front: '', back: '',page: 0, hiddenText: '', chapter: '', title: '', creationTime: Date.now()} 

    
  // @Output('edit') public editEmitter: EventEmitter<CardEntry | CardEntryContent> = new EventEmitter<CardEntry | CardEntryContent>();

  // @Output('delete') public deleteEmitter: EventEmitter<CardEntry | CardEntryContent> = new EventEmitter<CardEntry | CardEntryContent>();
  
  @ViewChild('frontSide',{read: ElementRef})
  public frontSide? : ElementRef<HTMLElement>;

  @ViewChild('backSide',{read: ElementRef})
  public backSide? : ElementRef<HTMLElement>;

  public flipped: boolean = false;


  public animate: boolean = true;
  constructor() {

   }

  ngOnInit(): void {
  }


  flipToSideForAnnotation(annotationID: string) {
    if(this.backSide && this.frontSide){
      // const frontSourceEl: HTMLElement =
      // this.frontSide.;
      // const backSourceEl: HTMLElement =
      // this.backSide.;
      const frontEls = this.frontSide.nativeElement.querySelectorAll(`[data-annotationid=_${annotationID}]`)
      const backEls = this.backSide.nativeElement.querySelectorAll(`[data-annotationid=_${annotationID}]`)
      if (frontEls.length > 0 && this.flipped) {
        this.flipped = false;
      } else if (backEls.length > 0 && !this.flipped) {
        this.flipped = true;    
      }
    }
    }

}
