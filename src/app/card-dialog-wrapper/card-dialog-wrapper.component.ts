import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { CardEntry } from '../data-api.service';

@Component({
  selector: 'app-card-dialog-wrapper',
  templateUrl: './card-dialog-wrapper.component.html',
  styleUrls: ['./card-dialog-wrapper.component.scss']
})
export class CardDialogWrapperComponent implements OnInit {

  public card: CardEntry | undefined;
  constructor(@Inject(MAT_DIALOG_DATA) public data: any) {
    if(data && data['card']){
      this.card = data.card;
    }
   }

  ngOnInit(): void {
  }

}
