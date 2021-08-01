import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CardsForDocumentComponent } from './cards-for-document.component';

describe('CardsForDocumentComponent', () => {
  let component: CardsForDocumentComponent;
  let fixture: ComponentFixture<CardsForDocumentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CardsForDocumentComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CardsForDocumentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
