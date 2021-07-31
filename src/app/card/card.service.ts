import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { DataService } from '../data.service';
import { Card } from '../types/card';

@Injectable({
  providedIn: 'root'
})
export class CardService {

  public cards$ : BehaviorSubject<Map<string,Card>> = new BehaviorSubject<Map<string,Card>>(new Map<string,Card>());

  constructor(private dataService: DataService) { 
  }

  public static replaceImageLinks(content: string, imagelist : string[], naming : (index :number) => string){
    for (let i = 0; i < imagelist.length; i++) {
      const img: string = imagelist[i];
      content = content.replace(
        img,
        naming(i)
      );
    }
    return content;
  }

  public replaceImageLinksForCard(card: Card){
    if(card.imgs){
    const prefixed = card.imgs.map((val) => "__SERVER__:"+val)
    const serverNamingFunc = (i : number) => this.dataService.getFileView(card.imgs![i]).href;
    card.front = CardService.replaceImageLinks(card.front,prefixed,serverNamingFunc);
    card.back = CardService.replaceImageLinks(card.back,prefixed,serverNamingFunc);
  }
  }


  async addCard(card: Card){
    await this.dataService.createDocumentOnline('cards', card);
    this.refresh();
  }

  async updateCard(card: Card){
    await this.dataService.updateDocumentOnline('cards', card);
    this.refresh();
  }

  async deleteCard(card: Card){
    if(card.imgs){
      for(let i = 0; i<card.imgs.length; i++){
        const imgSuccess = await this.dataService.deleteImage(card.imgs[i]);
      }
    }
    await this.dataService.deleteDocumentOnline('cards',card.$id,card);
    this.refresh();
  }

  async refresh(){
    const cards = await this.dataService.fetchOnlineCollection('cards');
    if(cards){
      cards.forEach((card) => this.replaceImageLinksForCard(card));
      this.cards$.next(cards);
    }

  }

}
