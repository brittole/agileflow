import { Timestamp } from 'firebase/firestore';

import { CardStatus, CardStoryPoints } from './card.interface';

export type CardEventType = 'created' | 'moved' | 'deleted';

export interface ICardEvent {
  id: string;
  cardId: string;
  projectId: string;
  type: CardEventType;
  fromStatus: CardStatus | null;
  toStatus: CardStatus | null;
  storyPoints: CardStoryPoints | null;
  createdBy: string;
  createdAt: Timestamp | null;
}
