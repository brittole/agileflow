import { Injectable, inject } from '@angular/core';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { Observable } from 'rxjs';

import { db } from '../core/firebase';
import { CardStatus, CardStoryPoints, ICreateCard } from '../interfaces/card.interface';
import { Card } from '../models/card.model';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class CardService {
  private readonly authService = inject(AuthService);
  private readonly collectionName = 'cards';

  getCardsByProject$(projectId: string): Observable<Card[]> {
    return new Observable<Card[]>((subscriber) => {
      const uid = this.authService.getCurrentUser()?.uid;

      if (!uid) {
        subscriber.next([]);
        subscriber.complete();
        return;
      }

      // createdBy must be part of the query filter: Firestore rejects list queries
      // whose security rule can't be proven from the query's own filters.
      const cardsQuery = query(
        collection(db, this.collectionName),
        where('projectId', '==', projectId),
        where('createdBy', '==', uid),
        orderBy('createdAt', 'asc'),
      );

      const unsubscribe = onSnapshot(
        cardsQuery,
        (snapshot) => subscriber.next(snapshot.docs.map((doc) => Card.fromFirestore(doc))),
        (error) => subscriber.error(error),
      );

      return () => unsubscribe();
    });
  }

  async createCard(projectId: string, data: ICreateCard): Promise<void> {
    const uid = this.authService.getCurrentUser()?.uid;

    if (!uid) {
      throw new Error('Usuário não autenticado.');
    }

    await addDoc(collection(db, this.collectionName), {
      projectId,
      title: data.title,
      description: data.description,
      storyPoints: data.storyPoints,
      status: 'todo' satisfies CardStatus,
      createdBy: uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  }

  async updateCardStatus(cardId: string, status: CardStatus): Promise<void> {
    await updateDoc(doc(db, this.collectionName, cardId), {
      status,
      updatedAt: serverTimestamp()
    });
  }

  async updateCard(
    cardId: string,
    data: { title: string; description: string; storyPoints: CardStoryPoints },
  ): Promise<void> {
    await updateDoc(doc(db, this.collectionName, cardId), {
      ...data,
      updatedAt: serverTimestamp()
    });
  }

  async deleteCard(cardId: string): Promise<void> {
    await deleteDoc(doc(db, this.collectionName, cardId));
  }

  // Used when a project is deleted, so no orphan cards remain in Firestore.
  async deleteCardsByProject(projectId: string): Promise<void> {
    const uid = this.authService.getCurrentUser()?.uid;

    if (!uid) {
      throw new Error('Usuário não autenticado.');
    }

    // createdBy must match the delete/read rule's filter, or Firestore rejects this list query outright.
    const cardsQuery = query(
      collection(db, this.collectionName),
      where('projectId', '==', projectId),
      where('createdBy', '==', uid),
    );

    const snapshot = await getDocs(cardsQuery);
    const batch = writeBatch(db);

    snapshot.docs.forEach((cardDoc) => batch.delete(cardDoc.ref));

    await batch.commit();
  }

  getAllCardsForCurrentUser$(): Observable<Card[]> {
    return new Observable<Card[]>((subscriber) => {
      const uid = this.authService.getCurrentUser()?.uid;

      if (!uid) {
        subscriber.next([]);
        subscriber.complete();
        return;
      }

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
