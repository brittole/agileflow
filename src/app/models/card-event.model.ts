import { DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';

import { CardEventType, ICardEvent } from '../interfaces/card-event.interface';

export class CardEvent implements ICardEvent {
  constructor(
    public id: string,
    public cardId: string,
    public projectId: string,
    public type: CardEventType,
    public fromStatus: ICardEvent['fromStatus'],
    public toStatus: ICardEvent['toStatus'],
    public storyPoints: ICardEvent['storyPoints'],
    public createdBy: string,
    public createdAt: ICardEvent['createdAt'],
  ) {}

  static fromFirestore(snapshot: QueryDocumentSnapshot<DocumentData>): CardEvent {
    const data = snapshot.data();

    return new CardEvent(
      snapshot.id,
      data['cardId'],
      data['projectId'],
      data['type'],
      data['fromStatus'] ?? null,
      data['toStatus'] ?? null,
      data['storyPoints'] ?? null,
      data['createdBy'],
      data['createdAt'] ?? null,
    );
  }
}
