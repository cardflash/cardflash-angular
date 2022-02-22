import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StudyCardUiComponent } from './study-card-ui.component';

describe('StudyCardUiComponent', () => {
  let component: StudyCardUiComponent;
  let fixture: ComponentFixture<StudyCardUiComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ StudyCardUiComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(StudyCardUiComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
