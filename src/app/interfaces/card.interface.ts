import { Timestamp } from 'firebase/firestore';

export type CardStatus = 'todo' | 'inProgress' | 'review' | 'done';

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
  // Ausente em cartões antigos; definido ao mover para "done" e limpo ao reabrir.
  completedAt?: Timestamp | null;
  // Id do evento "moved" gravado no mesmo batch da última mudança de status; ausente em cartões antigos.
  lastEventId?: string | null;
  // Uid do membro responsável pelo card; null = sem responsável. Só o gestor atribui.
  assigneeId?: string | null;
}

export interface ICreateCard {
  title: string;
  description: string;
  storyPoints: CardStoryPoints;
}
