import { DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';

import { CardStatus, CardStoryPoints, ICard } from '../interfaces/card.interface';

export class Card implements ICard {
  constructor(
    public id: string,
    public projectId: string,
    public title: string,
    public description: string,
    public status: CardStatus,
    public storyPoints: CardStoryPoints,
    public createdAt: ICard['createdAt'],
    public updatedAt: ICard['updatedAt'],
    public createdBy: string,
  ) {}

  static fromFirestore(snapshot: QueryDocumentSnapshot<DocumentData>): Card {
    const data = snapshot.data();

    return new Card(
      snapshot.id,
      data['projectId'],
      data['title'],
      data['description'] ?? '',
      data['status'],
      data['storyPoints'],
      data['createdAt'] ?? null,
      data['updatedAt'] ?? null,
      data['createdBy'],
    );
  }
}
