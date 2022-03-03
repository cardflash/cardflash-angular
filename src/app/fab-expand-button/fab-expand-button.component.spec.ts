import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FabExpandButtonComponent } from './fab-expand-button.component';

describe('FabExpandButtonComponent', () => {
  let component: FabExpandButtonComponent;
  let fixture: ComponentFixture<FabExpandButtonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ FabExpandButtonComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(FabExpandButtonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
