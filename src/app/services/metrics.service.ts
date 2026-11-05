import { Injectable, inject } from '@angular/core';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { firstValueFrom } from 'rxjs';

import { db } from '../core/firebase';
import { ICard } from '../interfaces/card.interface';
import { ICardEvent } from '../interfaces/card-event.interface';
import { IProjectMetrics } from '../interfaces/project-metrics.interface';
import { Card } from '../models/card.model';
import { CardEvent } from '../models/card-event.model';
import { AuthService } from './auth.service';

const DAY_MS = 24 * 60 * 60 * 1000;

// Função pura: recebe cartões e eventos já carregados e devolve as métricas.
// Não inventa dados: cycle time fica null quando nenhum cartão tem histórico suficiente.
export function calculateProjectMetrics(
  cards: ICard[],
  events: ICardEvent[],
  periodDays: number,
  now: Date = new Date(),
): IProjectMetrics {
  const cardsByStatus: IProjectMetrics['cardsByStatus'] = { todo: 0, inProgress: 0, review: 0, done: 0 };

  for (const card of cards) {
    cardsByStatus[card.status] += 1;
  }

  const doneCards = cards.filter((card) => card.status === 'done');
  const periodEnd = now;
  const periodStart = new Date(now.getTime() - periodDays * DAY_MS);

  const sortedEvents = events
    .filter((event) => event.createdAt)
    .slice()
    .sort((a, b) => a.createdAt!.toMillis() - b.createdAt!.toMillis());

  const throughput = sortedEvents.filter(
    (event) =>
      event.type === 'moved' &&
      event.toStatus === 'done' &&
      event.createdAt!.toMillis() >= periodStart.getTime() &&
      event.createdAt!.toMillis() <= periodEnd.getTime(),
  ).length;

  const cycleTimes: number[] = [];
  const eventsByCard = new Map<string, ICardEvent[]>();
  for (const event of sortedEvents) {
    const list = eventsByCard.get(event.cardId) ?? [];
    list.push(event);
    eventsByCard.set(event.cardId, list);
  }

  for (const cardEvents of eventsByCard.values()) {
    const started = cardEvents.find((event) => event.type === 'moved' && event.toStatus === 'inProgress');
    const finished = cardEvents.find(
      (event) =>
        event.type === 'moved' &&
        event.toStatus === 'done' &&
        started !== undefined &&
        event.createdAt!.toMillis() >= started.createdAt!.toMillis(),
    );

    if (started && finished) {
      cycleTimes.push((finished.createdAt!.toMillis() - started.createdAt!.toMillis()) / DAY_MS);
    }
  }

  return {
    totalCards: cards.length,
    cardsByStatus,
    completedCards: doneCards.length,
    completedStoryPoints: doneCards.reduce((sum, card) => sum + card.storyPoints, 0),
    wip: cardsByStatus.inProgress,
    throughput,
    periodDays,
    periodStart,
    periodEnd,
    averageCycleTimeDays:
      cycleTimes.length > 0
        ? cycleTimes.reduce((sum, days) => sum + days, 0) / cycleTimes.length
        : null,
    cycleTimeSampleSize: cycleTimes.length,
  };
}

@Injectable({
  providedIn: 'root',
})
export class MetricsService {
  private readonly authService = inject(AuthService);

  async getProjectMetrics(projectId: string, periodDays = 7): Promise<IProjectMetrics> {
    const uid = await firstValueFrom(this.authService.getUidWhenReady$());

    if (!uid) {
      throw new Error('Usuário não autenticado.');
    }

    // As regras de leitura verificam se o usuário é membro do projeto; não filtrar por createdBy,
    // senão as métricas só veriam os cartões e eventos do próprio usuário.
    const [cardsSnapshot, eventsSnapshot] = await Promise.all([
      getDocs(
        query(
          collection(db, 'cards'),
          where('projectId', '==', projectId),
        ),
      ),
      getDocs(
        query(
          collection(db, 'cardEvents'),
          where('projectId', '==', projectId),
        ),
      ),
    ]);

    const cards = cardsSnapshot.docs.map((doc) => Card.fromFirestore(doc));
    const events = eventsSnapshot.docs.map((doc) => CardEvent.fromFirestore(doc));

    return calculateProjectMetrics(cards, events, periodDays);
  }
}
