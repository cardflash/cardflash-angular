import { Component, OnInit } from '@angular/core';
import { DataService } from '../data.service';
import { TesseractLanguages } from '../data/tesseract-languages';
import { Config } from '../types/config';

@Component({
  selector: 'app-options',
  templateUrl: './options.component.html',
  styleUrls: ['./options.component.scss']
})
export class OptionsComponent implements OnInit {

  public config: Config = DataService.DEFAULT_CONFIG;
  public readonly OCR_LANGUAGES: { short: string; long: string }[] =
    TesseractLanguages.LANGS;
    
  constructor(public dataService: DataService) {
    this.dataService.init().then(async () => {
      if (this.dataService.prefs['config']) {
        this.config = this.dataService.prefs['config'];
      }
    });
  }

  ngOnInit(): void {
  }

  async saveConfig() {
    const res = await this.dataService.savePrefs({ config: this.config });
  }

}
