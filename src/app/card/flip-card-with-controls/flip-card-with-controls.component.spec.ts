import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FlipCardWithControlsComponent } from './flip-card-with-controls.component';

describe('FlipCardWithControlsComponent', () => {
  let component: FlipCardWithControlsComponent;
  let fixture: ComponentFixture<FlipCardWithControlsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ FlipCardWithControlsComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(FlipCardWithControlsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
