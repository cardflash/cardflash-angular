import { Injectable } from '@angular/core';
declare var LeaderLine: any;

@Injectable({
  providedIn: 'root'
})
export class UtilsService {

  readonly settings = {
    animateLines: true
  }

  public availableAnnotationColors: { hex: string; marker: string }[] = [
    { hex: '#f3ea504f', marker: 'marker-light-yellow' },
    { hex: '#5eacf94f', marker: 'marker-light-blue' },
    { hex: '#5ef98c4f', marker: 'marker-light-green' },
    { hex: '#f95ef34f', marker: 'marker-light-pink' },
  ];
  
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

  createLineBetweenIds(fromID: string, toID: string, color : string = "#943262", size = 7, dash = true, animate = true){
    // console.log({fromID},{toID})
    const line = new LeaderLine(  
      document.getElementById(fromID),
      document.getElementById(toID),
      {
        startPlug: 'disc',
        endPlug: 'disc',
        color: color.substring(0, 7) + 'ba',
        showEffectName: 'draw',
        size: size,
        startPlugSize: 0.7,
        endPlugSize: 0.7,
        dash: dash ? (animate ? {animation: true} : true) : undefined,
        path: 'magnet',
        hide: true,
        animOptions: {duration: 500, timing: [0.58, 0, 0.42, 1]}
        // outline: true,
        // outlineColor: outlineColor,
        // outlineSize: 0.1
      }
    );
    line.position();
    if (this.settings.animateLines){
      line.show('draw',{duration: 250, timing: [0.58, 0, 0.42, 1]});
    }else{
      line.show();
    }
    return line;
  }
}
