import { Injectable } from '@angular/core';
import { Config } from './types/config';

@Injectable({
  providedIn: 'root'
})
export class DataService {

  public static readonly DEFAULT_CONFIG : Config ={
    drawOnPdf: false,
    selectionOnTop: false,
    autoAddAnki: false,
    deckName : "Default",
    addImageOption: true,
    addTextOption: true,
    addOcrTextOption: false,
    ocrLanguage: "eng",
    addTextAsHidden: true,
    singlePageMode: false
  }
  public config : Config = DataService.DEFAULT_CONFIG;
  
  constructor() { }

  public set(key: any, value: any){

  }
}
