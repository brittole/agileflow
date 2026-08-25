import { Injectable, inject } from '@angular/core';
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { Observable } from 'rxjs';

import { db } from '../core/firebase';
import { CardStatus, ICreateCard } from '../interfaces/card.interface';
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
      const cardsQuery = query(
        collection(db, this.collectionName),
        where('projectId', '==', projectId),
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

  // Reserved for a future step (status updates via drag and drop).
  async updateCardStatus(cardId: string, status: CardStatus): Promise<void> {
    await updateDoc(doc(db, this.collectionName, cardId), {
      status,
      updatedAt: serverTimestamp()
    });
  }
}
