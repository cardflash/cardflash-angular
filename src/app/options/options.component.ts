import { Component, Input, OnInit } from '@angular/core';
import { DataApiService } from '../data-api.service';
import { TesseractLanguages } from '../data/tesseract-languages';
import { Config } from '../types/config';
import { UserNotifierService } from '../services/notifier/user-notifier.service';

@Component({
  selector: 'app-options',
  templateUrl: './options.component.html',
  styleUrls: ['./options.component.scss']
})
export class OptionsComponent implements OnInit {

  public readonly OCR_LANGUAGES: { short: string; long: string }[] =
    TesseractLanguages.LANGS;

    @Input('expanded') expanded: boolean = true;
    
  constructor(public dataApi: DataApiService, public notifierService: UserNotifierService) {
  }

  ngOnInit(): void {
    if(this.dataApi.getProvider() === "appwrite"){
      this.notifierService.notify("Deprecated Storage Provider","The current storage provider (Appwrite/Server) will shut down soon. Please back up your data and switch to local storage. You can use the 'Save online data locally' button in the sidebar.","danger",false);
    }
  }

  async saveConfig() {
    const res = await this.dataApi.saveConfig();
  }

}
