import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StackedCardsComponent } from './stacked-cards.component';

describe('StackedCardsComponent', () => {
  let component: StackedCardsComponent;
  let fixture: ComponentFixture<StackedCardsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ StackedCardsComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(StackedCardsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
