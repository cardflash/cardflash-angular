import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FromPdfComponent } from './from-pdf.component';

describe('FromPdfComponent', () => {
  let component: FromPdfComponent;
  let fixture: ComponentFixture<FromPdfComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ FromPdfComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(FromPdfComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
