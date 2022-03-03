import { Component, Input, OnInit } from '@angular/core';
import { DataApiService } from '../data-api.service';
import { TesseractLanguages } from '../data/tesseract-languages';
import { Config } from '../types/config';

@Component({
  selector: 'app-options',
  templateUrl: './options.component.html',
  styleUrls: ['./options.component.scss']
})
export class OptionsComponent implements OnInit {

  public readonly OCR_LANGUAGES: { short: string; long: string }[] =
    TesseractLanguages.LANGS;

    @Input('expanded') expanded: boolean = true;
    
  constructor(public dataApi: DataApiService) {
  }

  ngOnInit(): void {
  }

  async saveConfig() {
    const res = await this.dataApi.saveConfig();
  }

}
