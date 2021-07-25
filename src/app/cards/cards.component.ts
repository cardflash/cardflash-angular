import { Component, OnInit } from '@angular/core';
import { CardService } from '../card/card.service';
import { DataService } from '../data.service';
import { Card } from '../types/card';

@Component({
  selector: 'app-cards',
  templateUrl: './cards.component.html',
  styleUrls: ['./cards.component.scss']
})
export class CardsComponent implements OnInit {
  public cardsCollection: Map<string,Card> = new Map<string,Card>();

  constructor(private dataService: DataService) { }

  async ngOnInit() {
    this.refresh();
  }



  async refresh(){
    await this.dataService.init();
    this.cardsCollection = await this.dataService.fetchCollection('cards');
    for(const card of this.cardsCollection.values()){
      if(card.imgs){
        const serverNamingFunc = (i : number) => this.dataService.getFileView(card.imgs![i]).href;
        let newFrontContent = CardService.replaceImageLinks(card.front,card.imgs,serverNamingFunc);
        let newBackContent = CardService.replaceImageLinks(card.back,card.imgs,serverNamingFunc);
        card.front = newFrontContent;
        card.back = newBackContent;
        console.log(card.back)
      }
    }
  
    console.log(this.cardsCollection);
  }


  async deleteCard(card: Card){
    console.log(card);
    if(card.imgs){
      for(let i = 0; i<card.imgs.length; i++){
        const imgSuccess = await this.dataService.deleteImage(card.imgs[i]);
      }
    }
    await this.dataService.deleteDocument('cards',card);
    this.refresh();
  }
  

}
