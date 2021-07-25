import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StaticCardSideComponent } from './static-card-side.component';

describe('StaticCardSideComponent', () => {
  let component: StaticCardSideComponent;
  let fixture: ComponentFixture<StaticCardSideComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ StaticCardSideComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(StaticCardSideComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
