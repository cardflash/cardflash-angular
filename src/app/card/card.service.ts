import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { DataService } from '../data.service';
import { DocumentService } from '../document.service';
import { Card } from '../types/card';

@Injectable({
  providedIn: 'root'
})
export class CardService {

  public cards$ : BehaviorSubject<Map<string,Card>> = new BehaviorSubject<Map<string,Card>>(new Map<string,Card>());

  constructor(private dataService: DataService, private documentService: DocumentService) { 
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
    const res = await this.dataService.createDocument('cards', card);
    this.refresh();
    return res;
  }

  async updateCard(card: Card){
    const res = await this.dataService.updateDocument('cards', card);
    this.refresh();
    return res;
  }

  async deleteCard(card: Card){
    if(card.imgs){
      for(let i = 0; i<card.imgs.length; i++){
        const imgSuccess = await this.dataService.deleteFile(card.imgs[i]);
      }
    }
    await this.dataService.deleteDocument('cards',card);
    this.refresh();
  }

  async refresh(){
    this.documentService.refresh();
    const cards = await this.dataService.fetchCollection('cards');
    if(cards){
      console.log(cards);
      cards.forEach((card) => this.replaceImageLinksForCard(card));
      this.cards$.next(cards);
    }

  }

}
