import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { DataApiService } from './data-api.service';
import { Annotation } from './types/annotation';
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
  
  constructor(private dataApi: DataApiService) { }


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
    const from = document.getElementById(fromID);
    const to = document.getElementById(toID);
    console.log({from},{to})
    if(from == undefined || to == undefined){
      return;
    }
    const line = new LeaderLine(  
      from,
     to,
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

  generateReferenceFromAnnotation(annotation: Annotation, documentID: string){
    let reference = '';
    if (annotation.imgID) {
      reference = `<figure class="image"><img src="${this.dataApi.getFileView(annotation.imgID).href}"  data-imageid="${annotation.imgID}"></figure>`;
    }
    const color = this.availableAnnotationColors.find(
      (val) => val.hex === annotation?.color
    );
    let innerEl = '';
    if (color) {
      innerEl = `[<mark class="${color.marker}">${
        annotation?.text || annotation.id
      }</mark>]`;
    } else {
      innerEl = `[${annotation?.text || annotation.id}]`;
    }
    reference += `<a href="${environment.PDF_ANNOT_URL}/${documentID}#${annotation?.id}"><span data-annotationid="${annotation.id}" >${innerEl}</span></a><span>&nbsp;</span>`;
    return reference;
}
}