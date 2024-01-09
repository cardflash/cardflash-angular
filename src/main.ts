import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';
import { environment } from './environments/environment';

if (environment.production) {
  enableProdMode();
}

platformBrowserDynamic()
  .bootstrapModule(AppModule)
  .catch((err) => console.error(err));


  function findLink(el: HTMLElement) : HTMLAnchorElement|null {
    if (el.tagName == 'A') {
        return (el as HTMLAnchorElement);
    } else if (el.parentElement) {
        return findLink(el.parentElement);
    } else {
        return null;
    }
};

function callback(ev: MouseEvent) {
  console.log(ev);
  const link = findLink(ev.target as HTMLElement);
  if(link !== null){
    if(link.href.startsWith("https://cardflash.net/") || link.href.startsWith("https://app.cardflash.net/") || link.href.startsWith("http://localhost:4200/")){
      window.location.href = link.href.replace("https://cardflash.net/","/").replace("https://app.cardflash.net/","/").replace("http://localhost:4200/","/");
    }
    ev.preventDefault();
    return true;
  }
  return false;


  // Do something
}

document.addEventListener('click', callback, true);
