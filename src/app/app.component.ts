import { AfterViewInit, Component, OnDestroy} from '@angular/core';
import { DataApiService } from './data-api.service';
import { AccountService } from './services/account.service';
import { UserNotifierService } from './services/notifier/user-notifier.service';
import { UtilsService } from './utils.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements AfterViewInit, OnDestroy {
  currentLocale : 'en' | 'de' = 'en';
  constructor(public accountService: AccountService, public userNotifier : UserNotifierService, public utilService: UtilsService, public dataApi: DataApiService){
    this.dataApi.fetchConfig()
    this.accountService.updateAcc();
    if(window.location.href.includes('/de/')){
      this.currentLocale = 'de';
    }
  }
  ngOnDestroy(): void {
  }

  ngAfterViewInit(): void {

  }


  async logout(){
    await this.accountService.logout();
  }
  getFlagImgURL(locale: string){
    // return this.dataService.getFlagURL(locale).href;
    return ''
  }

  changeLocale(locale: 'de' | 'en'){
    console.log("LOCALE CHANGE",locale);
    if(this.currentLocale === locale){
      return;
    }
    window.addEventListener('beforeunload', function(e){
      e.preventDefault();
      e.returnValue = '';
    })
    let url;
    if(this.currentLocale === 'de'){
      url = window.location.href.replace('/de/',"/"+locale+"/");
    }else{
      url = window.location.href.replace('/en/',"/"+locale+"/")
    }
    console.log("LOCALE CHANGE URL",url);
    window.location.assign(url);
  }
}