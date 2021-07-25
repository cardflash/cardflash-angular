import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class CardService {

  constructor() { }

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
}
