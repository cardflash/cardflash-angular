import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CardSideComponent } from './card-side.component';

describe('CardSideComponent', () => {
  let component: CardSideComponent;
  let fixture: ComponentFixture<CardSideComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CardSideComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CardSideComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
