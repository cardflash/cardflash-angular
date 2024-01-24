import { AfterViewInit, Component, HostListener, OnDestroy} from '@angular/core';
import { Router } from '@angular/router';
import { environment } from 'src/environments/environment';
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
  constructor(public accountService: AccountService, public userNotifier : UserNotifierService, public utilService: UtilsService, public dataApi: DataApiService, private router: Router){
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

  @HostListener('window:click', ['$event'])
  click(event: KeyboardEvent) {
    const path = event.composedPath() as Array<any>;
    const firstAnchor : HTMLAnchorElement | null = path.find(p => p && p.tagName && p.tagName.toLowerCase() === 'a');
    if (firstAnchor && !firstAnchor.hasAttribute('routerlink')) {
      const href = firstAnchor.getAttribute('href');
      if(href?.indexOf(environment.BASE_URL) === 0){
        console.log('internal link pressed',href)
        this.router.navigateByUrl(href.replace(environment.BASE_URL,''));
        event.preventDefault();
      }
    }
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
      url = window.location.href.replace('cardflash.net/de/',"cardflash.net/");
    }else{
      url = window.location.href.replace('cardflash.net/',"cardflash.net/"+locale+"/")
    }
    console.log("LOCALE CHANGE URL",url);
    window.location.assign(url);
  }
}