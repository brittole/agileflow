import { Timestamp } from 'firebase/firestore';

export type CardStatus = 'todo' | 'inProgress' | 'done';

export const CARD_STORY_POINTS = [1, 2, 3, 5, 8] as const;
export type CardStoryPoints = (typeof CARD_STORY_POINTS)[number];

export interface ICard {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: CardStatus;
  storyPoints: CardStoryPoints;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
  createdBy: string;
}

export interface ICreateCard {
  title: string;
  description: string;
  storyPoints: CardStoryPoints;
}
