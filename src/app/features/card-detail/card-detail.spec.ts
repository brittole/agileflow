import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CardDetail } from './card-detail';
import { Card } from '../../models/card.model';

describe('CardDetail', () => {
  let component: CardDetail;
  let fixture: ComponentFixture<CardDetail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CardDetail]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CardDetail);
    fixture.componentRef.setInput('card', new Card('c1', 'p1', 'Título', '', 'todo', 1, null, null, 'u1'));
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
