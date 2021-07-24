import { Component, OnInit } from '@angular/core';
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

  async deleteCard(v : any){

  }


  async refresh(){
    this.cardsCollection = await this.dataService.fetchCollection('cards');
    console.log(this.cardsCollection);
  }

}
