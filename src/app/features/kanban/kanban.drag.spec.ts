import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ApplicationRef, NgZone, provideZoneChangeDetection } from '@angular/core';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { Subject, of } from 'rxjs';

import { CardStatus } from '../../interfaces/card.interface';
import { Card } from '../../models/card.model';
import { Project } from '../../models/project.model';
import { AuthService } from '../../services/auth.service';
import { CardService } from '../../services/card.service';
import { ProjectService } from '../../services/project.service';
import { Kanban } from './kanban';

// Testes de diagnóstico do drag-and-drop: reproduzem o fluxo real
// onDrop -> updateCardStatus -> onSnapshot emite -> cards.set() -> DOM.
// A emissão fora da zona do Angular simula o callback do Firestore, que não
// é capturado pelo Zone.js (SDK assíncrono próprio).
describe('Kanban - drag and drop (atualização da UI)', () => {
  let fixture: ComponentFixture<Kanban>;
  let component: Kanban;
  let ngZone: NgZone;
  let cardsSubject: Subject<Card[]>;
  let updateCardStatusSpy: jasmine.Spy;

  const owner = { uid: 'owner-1', email: 'owner@teste.com', displayName: null, photoURL: null };
  const project = new Project('p1', 'Projeto', '', 'owner-1', [], {}, null, null);

  function makeCard(status: CardStatus): Card {
    return new Card('c1', 'p1', 'Card de teste', '', status, 3, null, null, 'owner-1');
  }

  function columnText(index: number): string {
    const columns = fixture.nativeElement.querySelectorAll('.kanban-column');
    return columns[index]?.textContent ?? '';
  }

  function fakeDragEvent(): DragEvent {
    return {
      preventDefault: () => {},
      currentTarget: document.createElement('div'),
      dataTransfer: {
        setData: () => {},
        getData: () => 'c1',
        effectAllowed: '',
      },
    } as unknown as DragEvent;
  }

  beforeEach(async () => {
    cardsSubject = new Subject<Card[]>();
    updateCardStatusSpy = jasmine.createSpy('updateCardStatus').and.resolveTo();

    await TestBed.configureTestingModule({
      imports: [Kanban],
      providers: [
        provideZoneChangeDetection({ eventCoalescing: true }),
        { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ projectId: 'p1' })) } },
        { provide: AuthService, useValue: { getCurrentUser: () => owner } },
        { provide: ProjectService, useValue: { getProjectById$: () => of(project) } },
        {
          provide: CardService,
          useValue: {
            getCardsByProject$: () => cardsSubject.asObservable(),
            updateCardStatus: updateCardStatusSpy,
            watchProjectEvents$: () => of([]),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Kanban);
    component = fixture.componentInstance;
    ngZone = TestBed.inject(NgZone);

    // Faz a fixture participar dos ticks automáticos do agendador, como uma
    // view real da aplicação (sem isso, _tick ignora fixtures de teste).
    fixture.autoDetectChanges();

    fixture.detectChanges();
    cardsSubject.next([makeCard('todo')]);
    fixture.detectChanges();
  });

  it('renderiza o card inicialmente na coluna Backlog', () => {
    expect(columnText(0)).toContain('Card de teste');
    expect(columnText(1)).not.toContain('Card de teste');
  });

  it('atualiza a coluna quando a emissão ocorre DENTRO da zona do Angular', async () => {
    const appRef = TestBed.inject(ApplicationRef);
    const tickSpy = spyOn(appRef as unknown as { _tick: () => void }, '_tick').and.callThrough();

    await component.onDrop(fakeDragEvent(), 'inProgress');
    expect(updateCardStatusSpy).toHaveBeenCalledWith('c1', 'inProgress');

    // Simula o onSnapshot entregando o card movido dentro da zona.
    ngZone.run(() => cardsSubject.next([makeCard('inProgress')]));

    // Sem fixture.detectChanges(): depende apenas do agendador de CD.
    await new Promise((resolve) => setTimeout(resolve, 200));

    console.log('[DENTRO] _tick chamado:', tickSpy.calls.count(), '| isStable:', ngZone.isStable);
    expect(columnText(1)).withContext('coluna "Em andamento"').toContain('Card de teste');
    expect(columnText(0)).withContext('coluna "Backlog"').not.toContain('Card de teste');
  });

  it('atualiza a coluna quando a emissão ocorre FORA da zona do Angular (callback do Firestore)', async () => {
    const appRef = TestBed.inject(ApplicationRef);
    const tickSpy = spyOn(appRef as unknown as { _tick: () => void }, '_tick').and.callThrough();

    await component.onDrop(fakeDragEvent(), 'inProgress');
    expect(updateCardStatusSpy).toHaveBeenCalledWith('c1', 'inProgress');

    // Simula o onSnapshot do Firestore, cujo callback roda fora do NgZone.
    ngZone.runOutsideAngular(() => cardsSubject.next([makeCard('inProgress')]));

    // Sem fixture.detectChanges(): se o agendador não rodar, o DOM fica velho.
    await new Promise((resolve) => setTimeout(resolve, 200));

    console.log('[FORA] _tick chamado:', tickSpy.calls.count(), '| isStable:', ngZone.isStable);
    expect(columnText(1)).withContext('coluna "Em andamento"').toContain('Card de teste');
    expect(columnText(0)).withContext('coluna "Backlog"').not.toContain('Card de teste');
  });

  it('confirma que os dados chegam: após detectChanges manual o DOM reflete a emissão', async () => {
    ngZone.runOutsideAngular(() => cardsSubject.next([makeCard('inProgress')]));

    await new Promise((resolve) => setTimeout(resolve, 200));
    fixture.detectChanges();

    expect(columnText(1)).withContext('coluna "Em andamento"').toContain('Card de teste');
    expect(columnText(0)).withContext('coluna "Backlog"').not.toContain('Card de teste');
  });
});
