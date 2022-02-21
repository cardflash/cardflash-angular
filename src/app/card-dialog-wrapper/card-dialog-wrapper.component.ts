import { Component, Inject, OnInit } from '@angular/core';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { CardEntry } from '../data-api.service';

@Component({
  selector: 'app-card-dialog-wrapper',
  templateUrl: './card-dialog-wrapper.component.html',
  styleUrls: ['./card-dialog-wrapper.component.scss']
})
export class CardDialogWrapperComponent implements OnInit {

  public card: CardEntry | undefined;
  constructor(@Inject(MAT_DIALOG_DATA) public data: any, public dialog: MatDialogRef<CardDialogWrapperComponent>,public router: Router) {
    if(data && data['card']){
      this.card = data.card;
    }
   }

  ngOnInit(): void {
  }

  editCard(){
    if(this.card){
      this.router.navigate(['cards',this.card?.$id])
      this.dialog.close();
    }
  }

}
