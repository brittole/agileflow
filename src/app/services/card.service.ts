import { Injectable, inject } from '@angular/core';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
  WriteBatch,
} from 'firebase/firestore';
import { Observable, firstValueFrom, of, switchMap } from 'rxjs';

import { environment } from '../../environments/environment';
import { db } from '../core/firebase';
import { CardEventType, ICardEvent } from '../interfaces/card-event.interface';
import { CardStatus, CardStoryPoints, ICreateCard } from '../interfaces/card.interface';
import { Card } from '../models/card.model';
import { CardEvent } from '../models/card-event.model';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class CardService {
  private readonly authService = inject(AuthService);
  private readonly collectionName = 'cards';
  private readonly eventsCollectionName = 'cardEvents';
  // Com eventos, as regras fazem get()/existsAfter() por cartão e o limite é 20 acessos por batch;
  // sem eventos, vale apenas o limite de 500 operações.
  private get deleteChunkSize(): number {
    return environment.cardEventsEnabled ? 8 : 200;
  }

  getCardsByProject$(projectId: string): Observable<Card[]> {
    return this.authService.getUidWhenReady$().pipe(
      switchMap((uid) => (uid ? this.watchCardsByProject$(projectId, uid) : of([] as Card[]))),
    );
  }

  private watchCardsByProject$(projectId: string, uid: string): Observable<Card[]> {
    return new Observable<Card[]>((subscriber) => {
      // A regra de leitura exige que o usuário seja membro do projeto.
      const cardsQuery = query(
        collection(db, this.collectionName),
        where('projectId', '==', projectId),
        orderBy('createdAt', 'asc'),
      );

      const unsubscribe = onSnapshot(
        cardsQuery,
        (snapshot) => subscriber.next(snapshot.docs.map((doc) => Card.fromFirestore(doc))),
        (error) => {
          // Um erro aqui (ex.: permission-denied) mata o listener e congela o quadro silenciosamente.
          console.error('[CardService] listener de cards falhou:', error);
          subscriber.error(error);
        },
      );

      return () => unsubscribe();
    });
  }

  async createCard(projectId: string, data: ICreateCard): Promise<void> {
    const uid = this.authService.getCurrentUser()?.uid;

    if (!uid) {
      throw new Error('Usuário não autenticado.');
    }

    await this.requireProjectOwner(projectId);

    const batch = writeBatch(db);
    const cardRef = doc(collection(db, this.collectionName));

    batch.set(cardRef, {
      projectId,
      title: data.title,
      description: data.description,
      storyPoints: data.storyPoints,
      status: 'todo' satisfies CardStatus,
      createdBy: uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    this.addEventToBatch(batch, uid, {
      cardId: cardRef.id,
      projectId,
      type: 'created',
      fromStatus: null,
      toStatus: 'todo',
      storyPoints: data.storyPoints,
    });

    await batch.commit();
  }

  async updateCardStatus(cardId: string, status: CardStatus): Promise<void> {
    const uid = this.authService.getCurrentUser()?.uid;

    if (!uid) {
      throw new Error('Usuário não autenticado.');
    }

    const cardRef = doc(db, this.collectionName, cardId);
    const current = await getDoc(cardRef);

    if (!current.exists()) {
      throw new Error('Card não encontrado.');
    }

    const { status: fromStatus, projectId, storyPoints } = current.data();

    if (fromStatus !== status) {
      await this.requireCanMoveTo(projectId, status);
    }

    const batch = writeBatch(db);

    const changed = fromStatus !== status;
    const eventId = changed
      ? this.addEventToBatch(batch, uid, {
          cardId,
          projectId,
          type: 'moved',
          fromStatus,
          toStatus: status,
          storyPoints: storyPoints ?? null,
        })
      : null;

    // completedAt só muda quando o status muda, preservando a data de conclusão existente.
    // lastEventId aponta para o evento do mesmo batch; as regras exigem esse vínculo a cada mudança de status.
    batch.update(cardRef, {
      status,
      ...(changed ? { completedAt: status === 'done' ? serverTimestamp() : null } : {}),
      ...(eventId ? { lastEventId: eventId } : {}),
      updatedAt: serverTimestamp()
    });

    await batch.commit();
  }

  async updateCard(
    cardId: string,
    data: { title: string; description: string; storyPoints: CardStoryPoints; assigneeId?: string | null },
  ): Promise<void> {
    const cardRef = doc(db, this.collectionName, cardId);
    const current = await getDoc(cardRef);

    if (!current.exists()) {
      throw new Error('Card não encontrado.');
    }

    await this.requireProjectOwner(current.data()['projectId']);

    // assigneeId deve ser string ou null — nunca undefined (o Firestore rejeita).
    const payload: Record<string, unknown> = {
      title: data.title,
      description: data.description,
      storyPoints: data.storyPoints,
      updatedAt: serverTimestamp(),
    };
    if (data.assigneeId !== undefined) {
      payload['assigneeId'] = data.assigneeId ?? null;
    }

    await updateDoc(cardRef, payload);
  }

  async deleteCard(cardId: string): Promise<void> {
    const uid = this.authService.getCurrentUser()?.uid;

    if (!uid) {
      throw new Error('Usuário não autenticado.');
    }

    const cardRef = doc(db, this.collectionName, cardId);
    const current = await getDoc(cardRef);

    if (!current.exists()) {
      return;
    }

    const { status, projectId, storyPoints } = current.data();

    await this.requireProjectOwner(projectId);

    const batch = writeBatch(db);

    batch.delete(cardRef);

    this.addEventToBatch(batch, uid, {
      cardId,
      projectId,
      type: 'deleted',
      fromStatus: status ?? null,
      toStatus: null,
      storyPoints: storyPoints ?? null,
    });

    await batch.commit();
  }

  // Used when a project is deleted, so no orphan cards remain in Firestore.
  async deleteCardsByProject(projectId: string): Promise<void> {
    const uid = this.authService.getCurrentUser()?.uid;

    if (!uid) {
      throw new Error('Usuário não autenticado.');
    }

    const cardsQuery = query(
      collection(db, this.collectionName),
      where('projectId', '==', projectId),
    );

    const snapshot = await getDocs(cardsQuery);

    for (let i = 0; i < snapshot.docs.length; i += this.deleteChunkSize) {
      const batch = writeBatch(db);

      snapshot.docs.slice(i, i + this.deleteChunkSize).forEach((cardDoc) => {
        const { status, storyPoints } = cardDoc.data();

        batch.delete(cardDoc.ref);

        this.addEventToBatch(batch, uid, {
          cardId: cardDoc.id,
          projectId,
          type: 'deleted',
          fromStatus: status ?? null,
          toStatus: null,
          storyPoints: storyPoints ?? null,
        });
      });

      await batch.commit();
    }
  }

  // Verifica se o usuário é dono do projeto. Lança erro se não for.
  private async requireProjectOwner(projectId: string): Promise<void> {
    const uid = this.authService.getCurrentUser()?.uid;

    if (!uid) {
      throw new Error('Usuário não autenticado.');
    }

    const projectDoc = await getDoc(doc(db, 'projects', projectId));

    if (!projectDoc.exists()) {
      throw new Error('Projeto não encontrado.');
    }

    if (projectDoc.data()['ownerId'] !== uid) {
      throw new Error('Apenas o administrador do projeto pode realizar esta ação.');
    }
  }

  // Verifica se o usuário pode mover um cartão para o status desejado.
  // Participantes não podem mover para "done".
  private async requireCanMoveTo(projectId: string, toStatus: CardStatus): Promise<void> {
    const uid = this.authService.getCurrentUser()?.uid;

    if (!uid) {
      throw new Error('Usuário não autenticado.');
    }

    const projectDoc = await getDoc(doc(db, 'projects', projectId));

    if (!projectDoc.exists()) {
      throw new Error('Projeto não encontrado.');
    }

    const project = projectDoc.data();
    const isOwner = project['ownerId'] === uid;
    const isMember = (project['memberIds'] ?? []).includes(uid);

    if (!isOwner && !isMember) {
      throw new Error('Você não tem acesso a este projeto.');
    }

    if (!isOwner && toStatus === 'done') {
      throw new Error('Apenas o administrador pode finalizar cartões.');
    }
  }

  // Eventos são preservados mesmo após a exclusão do cartão ou do projeto.
  private addEventToBatch(
    batch: WriteBatch,
    uid: string,
    event: Pick<ICardEvent, 'cardId' | 'projectId' | 'fromStatus' | 'toStatus' | 'storyPoints'> & {
      type: CardEventType;
    },
  ): string | null {
    if (!environment.cardEventsEnabled) {
      return null;
    }

    const eventRef = doc(collection(db, this.eventsCollectionName));

    batch.set(eventRef, {
      ...event,
      createdBy: uid,
      createdAt: serverTimestamp()
    });

    return eventRef.id;
  }

  async getProjectEvents(projectId: string): Promise<CardEvent[]> {
    const uid = await firstValueFrom(this.authService.getUidWhenReady$());

    if (!uid) {
      throw new Error('Usuário não autenticado.');
    }

    const snapshot = await getDocs(
      query(
        collection(db, this.eventsCollectionName),
        where('projectId', '==', projectId),
        orderBy('createdAt', 'desc'),
      ),
    );

    return snapshot.docs.map((doc) => CardEvent.fromFirestore(doc));
  }

  // Versão reativa (onSnapshot) para telas que precisam recalcular em tempo real.
  watchProjectEvents$(projectId: string): Observable<CardEvent[]> {
    return this.authService.getUidWhenReady$().pipe(
      switchMap((uid) => (uid ? this.watchEventsByProject$(projectId) : of([] as CardEvent[]))),
    );
  }

  private watchEventsByProject$(projectId: string): Observable<CardEvent[]> {
    return new Observable<CardEvent[]>((subscriber) => {
      const eventsQuery = query(
        collection(db, this.eventsCollectionName),
        where('projectId', '==', projectId),
        orderBy('createdAt', 'desc'),
      );

      const unsubscribe = onSnapshot(
        eventsQuery,
        (snapshot) => subscriber.next(snapshot.docs.map((doc) => CardEvent.fromFirestore(doc))),
        (error) => subscriber.error(error),
      );

      return () => unsubscribe();
    });
  }

  getAllCardsForCurrentUser$(): Observable<Card[]> {
    return this.authService.getUidWhenReady$().pipe(
      switchMap((uid) => (uid ? this.watchAllCards$(uid) : of([] as Card[]))),
    );
  }

  private watchAllCards$(uid: string): Observable<Card[]> {
    return new Observable<Card[]>((subscriber) => {
      const cardsQuery = query(
        collection(db, this.collectionName),
        where('createdBy', '==', uid),
      );

      const unsubscribe = onSnapshot(
        cardsQuery,
        (snapshot) => subscriber.next(snapshot.docs.map((doc) => Card.fromFirestore(doc))),
        (error) => subscriber.error(error),
      );

      return () => unsubscribe();
    });
  }
}
