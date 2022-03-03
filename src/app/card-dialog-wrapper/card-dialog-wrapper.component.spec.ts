import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CardDialogWrapperComponent } from './card-dialog-wrapper.component';

describe('CardDialogWrapperComponent', () => {
  let component: CardDialogWrapperComponent;
  let fixture: ComponentFixture<CardDialogWrapperComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CardDialogWrapperComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CardDialogWrapperComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
