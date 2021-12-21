import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExtendedPdfComponent } from './extended-pdf.component';

describe('ExtendedPdfComponent', () => {
  let component: ExtendedPdfComponent;
  let fixture: ComponentFixture<ExtendedPdfComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ExtendedPdfComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ExtendedPdfComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
