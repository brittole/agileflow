import { TestBed } from '@angular/core/testing';
import {
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import {
  addDoc,
  collection,
  connectFirestoreEmulator,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  where,
} from 'firebase/firestore';

import { environment } from '../../environments/environment';
import { auth, db } from '../core/firebase';
import { CardStatus } from '../interfaces/card.interface';
import { CardService } from './card.service';

// Estes testes usam o CardService real contra os emuladores locais de Firestore e Auth
// (npm run test:service). Sem emuladores ativos, todos são ignorados: nada é enviado ao Firebase real.
const FIRESTORE_URL = 'http://127.0.0.1:8080';
const AUTH_URL = 'http://127.0.0.1:9099';

async function isUp(url: string): Promise<boolean> {
  try {
    await fetch(url, { mode: 'no-cors' });
    return true;
  } catch {
    return false;
  }
}

describe('CardService + regras (emuladores)', () => {
  let emulatorsUp = false;
  let service: CardService;
  let alice: string;
  let bobEmail: string;
  const password = 'senha-de-teste-123';

  async function newUser(label: string): Promise<{ uid: string; email: string }> {
    const email = `${label}-${Date.now()}-${Math.random().toString(36).slice(2)}@teste.local`;
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    return { uid: credential.user.uid, email };
  }

  async function newProject(ownerId: string): Promise<string> {
    const ref = await addDoc(collection(db, 'projects'), {
      name: 'Projeto de teste',
      description: '',
      ownerId,
      memberIds: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return ref.id;
  }

  async function cardsOf(projectId: string, uid: string) {
    const snap = await getDocs(
      query(collection(db, 'cards'), where('projectId', '==', projectId), where('createdBy', '==', uid)),
    );
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Record<string, any>);
  }

  async function eventsOf(projectId: string, uid: string) {
    const snap = await getDocs(
      query(collection(db, 'cardEvents'), where('projectId', '==', projectId), where('createdBy', '==', uid)),
    );
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Record<string, any>);
  }

  beforeAll(async () => {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 30000;
    emulatorsUp = (await isUp(FIRESTORE_URL)) && (await isUp(AUTH_URL));

    if (emulatorsUp) {
      connectFirestoreEmulator(db, '127.0.0.1', 8080);
      connectAuthEmulator(auth, AUTH_URL, { disableWarnings: true });
    }
  });

  beforeEach(async () => {
    if (!emulatorsUp) {
      pending('emuladores do Firestore/Auth não estão ativos (use npm run test:service)');
    }

    service = TestBed.inject(CardService);
    const user = await newUser('alice');
    alice = user.uid;
    bobEmail = (await newUser('bob')).email;
    await signInWithEmailAndPassword(auth, user.email, password);
    environment.cardEventsEnabled = true;
  });

  afterEach(() => {
    environment.cardEventsEnabled = false;
  });

  async function createCardAndGet(projectId: string, title = 'Cartão') {
    await service.createCard(projectId, { title, description: '', storyPoints: 3 });
    const cards = await cardsOf(projectId, alice);
    return cards.find((c) => c['title'] === title)!;
  }

  it('createCard grava o cartão e o evento "created" no mesmo batch', async () => {
    const projectId = await newProject(alice);
    const card = await createCardAndGet(projectId);

    const events = await eventsOf(projectId, alice);
    expect(events.length).toBe(1);
    expect(events[0]['type']).toBe('created');
    expect(events[0]['cardId']).toBe(card['id']);
    expect(events[0]['toStatus']).toBe('todo');
    expect(card['lastEventId']).toBeUndefined();
  });

  it('updateCardStatus grava evento "moved" e aponta lastEventId para ele; completedAt segue o status', async () => {
    const projectId = await newProject(alice);
    const card = await createCardAndGet(projectId);

    await service.updateCardStatus(card['id'], 'inProgress');
    let current = (await getDoc(doc(db, 'cards', card['id']))).data()!;
    expect(current['status']).toBe('inProgress');
    expect(current['completedAt'] ?? null).toBeNull();

    await service.updateCardStatus(card['id'], 'done');
    current = (await getDoc(doc(db, 'cards', card['id']))).data()!;
    expect(current['completedAt']).toBeTruthy();

    const moved = (await eventsOf(projectId, alice)).filter((e) => e['type'] === 'moved');
    expect(moved.length).toBe(2);
    const last = moved.find((e) => e['id'] === current['lastEventId'])!;
    expect(last['fromStatus']).toBe('inProgress');
    expect(last['toStatus']).toBe('done');

    await service.updateCardStatus(card['id'], 'todo');
    current = (await getDoc(doc(db, 'cards', card['id']))).data()!;
    expect(current['status']).toBe('todo');
    expect(current['completedAt']).toBeNull();
  });

  it('mover para o mesmo status não gera evento nem erro e preserva completedAt', async () => {
    const projectId = await newProject(alice);
    const card = await createCardAndGet(projectId);
    await service.updateCardStatus(card['id'], 'done');
    const before = (await getDoc(doc(db, 'cards', card['id']))).data()!;
    const eventsBefore = (await eventsOf(projectId, alice)).length;

    await service.updateCardStatus(card['id'], 'done');

    const after = (await getDoc(doc(db, 'cards', card['id']))).data()!;
    expect((await eventsOf(projectId, alice)).length).toBe(eventsBefore);
    expect(after['completedAt'].isEqual(before['completedAt'])).toBeTrue();
    expect(after['lastEventId']).toBe(before['lastEventId']);
  });

  it('cartão antigo (criado sem eventos e sem lastEventId) pode ser movido depois que o histórico é ligado', async () => {
    const projectId = await newProject(alice);
    environment.cardEventsEnabled = false;
    const legacy = await createCardAndGet(projectId, 'Antigo');
    expect((await eventsOf(projectId, alice)).length).toBe(0);

    environment.cardEventsEnabled = true;
    await service.updateCardStatus(legacy['id'], 'inProgress');

    const current = (await getDoc(doc(db, 'cards', legacy['id']))).data()!;
    expect(current['status']).toBe('inProgress');
    expect(current['lastEventId']).toBeTruthy();
    expect((await eventsOf(projectId, alice)).map((e) => e['type'])).toEqual(['moved']);
  });

  it('editar título, descrição e story points não exige evento nem altera lastEventId', async () => {
    const projectId = await newProject(alice);
    const card = await createCardAndGet(projectId);
    await service.updateCardStatus(card['id'], 'inProgress');
    const before = (await getDoc(doc(db, 'cards', card['id']))).data()!;
    const eventsBefore = (await eventsOf(projectId, alice)).length;

    await service.updateCard(card['id'], { title: 'Novo título', description: 'x', storyPoints: 5 });

    const after = (await getDoc(doc(db, 'cards', card['id']))).data()!;
    expect(after['title']).toBe('Novo título');
    expect(after['lastEventId']).toBe(before['lastEventId']);
    expect((await eventsOf(projectId, alice)).length).toBe(eventsBefore);
  });

  it('deleteCard remove o cartão e preserva o evento "deleted"', async () => {
    const projectId = await newProject(alice);
    const card = await createCardAndGet(projectId);

    await service.deleteCard(card['id']);

    expect((await cardsOf(projectId, alice)).length).toBe(0);
    const deleted = (await eventsOf(projectId, alice)).filter((e) => e['type'] === 'deleted');
    expect(deleted.length).toBe(1);
    expect(deleted[0]['cardId']).toBe(card['id']);
    expect(deleted[0]['fromStatus']).toBe('todo' satisfies CardStatus);
  });

  it('deleteCardsByProject apaga 20 cartões em lotes (limite de acessos às regras) e preserva os eventos', async () => {
    const projectId = await newProject(alice);

    for (let i = 0; i < 20; i += 1) {
      await service.createCard(projectId, { title: `Card ${i}`, description: '', storyPoints: 2 });
    }
    expect((await cardsOf(projectId, alice)).length).toBe(20);

    await service.deleteCardsByProject(projectId);

    expect((await cardsOf(projectId, alice)).length).toBe(0);
    const events = await eventsOf(projectId, alice);
    expect(events.filter((e) => e['type'] === 'deleted').length).toBe(20);
    expect(events.filter((e) => e['type'] === 'created').length).toBe(20);
  });

  it('com o histórico desligado, as regras atuais rejeitam movimentações (regras e flag devem ser publicados juntos)', async () => {
    const projectId = await newProject(alice);
    const card = await createCardAndGet(projectId);
    environment.cardEventsEnabled = false;

    await expectAsync(service.updateCardStatus(card['id'], 'inProgress')).toBeRejected();

    expect((await getDoc(doc(db, 'cards', card['id']))).data()!['status']).toBe('todo');
  });

  it('outro usuário não consegue mover cartões alheios pelo serviço', async () => {
    const projectId = await newProject(alice);
    const card = await createCardAndGet(projectId);

    await signInWithEmailAndPassword(auth, bobEmail, password);

    await expectAsync(service.updateCardStatus(card['id'], 'done')).toBeRejected();
  });
});
