import { Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ActivatedRoute, Params } from '@angular/router';
import DOMPurify from 'dompurify';
import { DataApiService, NoteEntry } from '../data-api.service';
import { UtilsService } from '../utils.service';

@Component({
  selector: 'app-note',
  templateUrl: './note.component.html',
  styleUrls: ['./note.component.scss']
})
export class NoteComponent implements OnInit {

  @ViewChild('innerNoteEl') innerNoteEl? : ElementRef<HTMLDivElement>;


  public safeContent: SafeHtml = '';
  public folderPath: string = '';
  public noteEntry? : NoteEntry;
  @Input('note') set note(value: NoteEntry) {
    this.noteEntry = value;
    const cleanContent = DOMPurify.sanitize(value.content, {
      ADD_DATA_URI_TAGS: ['img', 'a'],
      ALLOW_UNKNOWN_PROTOCOLS: true,
    });
    this.safeContent = this.domSanitizer.bypassSecurityTrustHtml(cleanContent);
    console.log(this.safeContent)
    const path = (value.path || '').split('/');
    path.pop();
    this.folderPath = path.join('/');
    setTimeout(() => {
      this.renderMath();
    },1)
  }
  constructor(private domSanitizer: DomSanitizer, private dataApi: DataApiService, private actRoute: ActivatedRoute) { }

  async ngOnInit() {
    this.actRoute.params.subscribe(async (para : Params) => {
      console.log('hi');
      try{
        this.note = await this.dataApi.getNote(para.id);
      }catch(e){
        console.error('could not get note for note compontent',para.id)
      }finally{
        console.log('okay?!')
      }
      console.log(this.note,'this.note')
    })
    // if(!this.note){
    //   this.note = await this.dataApi.getNote(this.actRoute.snapshot.params.id);
    // }
  }


  ngAfterViewInit(): void {
    this.renderMath();
  }

  ngOnChanges(): void {
    setTimeout(() => {
      this.renderMath();
    }, 0);
  }

  renderMath() {
    console.log('renderMath',this.innerNoteEl)
    if (this.innerNoteEl?.nativeElement) {
      (window as any).renderMathInElement(this.innerNoteEl.nativeElement);
    }
  }

  downloadMD(){
    if(this.noteEntry){
      this.dataApi.noteToMarkdown(this.noteEntry);
    }
  }
}



