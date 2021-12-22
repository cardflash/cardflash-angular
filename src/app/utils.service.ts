import { Injectable } from '@angular/core';
declare var LeaderLine: any;

@Injectable({
  providedIn: 'root'
})
export class UtilsService {

  constructor() { }


  isIDInView(id: string){
    const el = document.getElementById(id);
    if (el) {
      const elClientRect = el.getBoundingClientRect();
      const clientRect = document.body.getBoundingClientRect();
      return !(
        elClientRect.top < clientRect.top ||
        elClientRect.bottom > clientRect.bottom ||
        elClientRect.right > clientRect.right ||
        elClientRect.left < clientRect.left
      )
    }else{
      return false;
    }
  }

  scrollIDIntoView(id: string) {
    const el = document.getElementById(id);
    if (el && !this.isIDInView(id)) {
        el.scrollIntoView({ behavior: 'auto',block: 'start' });
    }
  }

  createLineBetweenIds(fromID: string, toID: string, color : string = "#943262"){
    console.log({fromID},{toID})
    const line = new LeaderLine(  
      document.getElementById(fromID),
      document.getElementById(toID),
      {
        startPlug: 'disc',
        endPlug: 'disc',
        color: color,
        // showEffectName: 'draw',
        size: 7,
        startPlugSize: 0.7,
        endPlugSize: 0.7,
        dash: {animation: true},
        path: 'magnet',
        hide: true
        // outline: true,
        // outlineColor: '#000',
        // outlineSize: 0.1
      }
    );
    line.position();
    line.show();
    return line;
  }
}
