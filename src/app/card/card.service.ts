import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { CardEntry, CardEntryContent } from '../data-api.service';
import { DataService } from '../data.service';
import { DocumentService } from '../document.service';

@Injectable({
  providedIn: 'root'
})
export class CardService {

  public cards$ : BehaviorSubject<Map<string,any> | undefined> = new BehaviorSubject<Map<string,any> | undefined>(undefined);

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

  public replaceImageLinksForCard(card: CardEntry | CardEntryContent){
    if(card.imgIDs){
    const prefixed = card.imgIDs.map((val) => "__SERVER__:"+val)
    const serverNamingFunc = (i : number) => this.dataService.getFileView(card.imgIDs![i]).href;
    card.front = CardService.replaceImageLinks(card.front,prefixed,serverNamingFunc);
    card.back = CardService.replaceImageLinks(card.back,prefixed,serverNamingFunc);
  }
  }


  async addCard(card: CardEntry | CardEntryContent){
    // const res = await this.dataService.createDocument('cards', card);
    // this.refresh();
    // return res;
  }

  async updateCard(card:  CardEntry | CardEntryContent){
    // const res = await this.dataService.updateDocument('cards', card);
    // this.refresh();
    // return res;
  }

  async deleteCard(card:  CardEntry | CardEntryContent){

  }

  async refresh(){
  //   this.documentService.refresh();
  //   const cards = await this.dataService.fetchCollection('cards');
  //   if(cards){
  //     console.log(cards);
  //     cards.forEach((card) => this.replaceImageLinksForCard(card));
  //     this.cards$.next(cards);
  //   }

 }

}
