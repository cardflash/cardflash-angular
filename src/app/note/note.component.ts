import { Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
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
  public noteEntry? : NoteEntry;
  @Input('note') set note(value: NoteEntry) {
    this.noteEntry = value;
    const cleanContent = DOMPurify.sanitize(value.content, {
      ADD_DATA_URI_TAGS: ['img', 'a'],
      ALLOW_UNKNOWN_PROTOCOLS: true,
    });
    this.safeContent = this.domSanitizer.bypassSecurityTrustHtml(cleanContent);
    setTimeout(() => {
      this.renderMath();
    },1)
  }
  constructor(private domSanitizer: DomSanitizer, private dataApi: DataApiService, private actRoute: ActivatedRoute) { }

  async ngOnInit() {
    if(!this.note){
      this.note = await this.dataApi.getNote(this.actRoute.snapshot.params.id);
    }
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
}



