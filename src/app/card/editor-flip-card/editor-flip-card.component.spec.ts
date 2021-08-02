import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditorFlipCardComponent } from './editor-flip-card.component';

describe('EditorFlipCardComponent', () => {
  let component: EditorFlipCardComponent;
  let fixture: ComponentFixture<EditorFlipCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ EditorFlipCardComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(EditorFlipCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
