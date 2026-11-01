import { Timestamp } from 'firebase/firestore';

import { ICard } from '../interfaces/card.interface';
import { ICardEvent } from '../interfaces/card-event.interface';
import { calculateProjectMetrics } from './metrics.service';

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = new Date('2026-11-01T12:00:00Z');

function ts(date: Date): Timestamp {
  return { toMillis: () => date.getTime() } as Timestamp;
}

function daysAgo(days: number): Date {
  return new Date(NOW.getTime() - days * DAY_MS);
}

function card(id: string, status: ICard['status'], storyPoints: ICard['storyPoints']): ICard {
  return {
    id,
    projectId: 'p1',
    title: id,
    description: '',
    status,
    storyPoints,
    createdAt: ts(daysAgo(10)),
    updatedAt: ts(daysAgo(1)),
    createdBy: 'u1',
  };
}

function moved(
  cardId: string,
  fromStatus: ICardEvent['fromStatus'],
  toStatus: ICardEvent['toStatus'],
  at: Date,
): ICardEvent {
  return {
    id: `${cardId}-${at.getTime()}`,
    cardId,
    projectId: 'p1',
    type: 'moved',
    fromStatus,
    toStatus,
    storyPoints: 3,
    createdBy: 'u1',
    createdAt: ts(at),
  };
}

describe('calculateProjectMetrics', () => {
  it('conta cartões por status, concluídos, story points e WIP', () => {
    const cards = [
      card('a', 'todo', 3),
      card('b', 'inProgress', 5),
      card('c', 'inProgress', 2),
      card('d', 'done', 8),
      card('e', 'done', 1),
    ];

    const metrics = calculateProjectMetrics(cards, [], 7, NOW);

    expect(metrics.totalCards).toBe(5);
    expect(metrics.cardsByStatus).toEqual({ todo: 1, inProgress: 2, review: 0, done: 2 });
    expect(metrics.completedCards).toBe(2);
    expect(metrics.completedStoryPoints).toBe(9);
    expect(metrics.wip).toBe(2);
  });

  it('calcula throughput apenas com eventos "moved -> done" dentro do período', () => {
    const events = [
      moved('a', 'todo', 'inProgress', daysAgo(6)),
      moved('a', 'inProgress', 'done', daysAgo(3)),
      moved('b', 'inProgress', 'done', daysAgo(1)),
      moved('c', 'inProgress', 'done', daysAgo(10)), // fora do período de 7 dias
      moved('d', 'done', 'todo', daysAgo(2)), // reabertura não conta
    ];

    const metrics = calculateProjectMetrics([], events, 7, NOW);

    expect(metrics.throughput).toBe(2);
    expect(metrics.periodStart).toEqual(daysAgo(7));
    expect(metrics.periodEnd).toEqual(NOW);
  });

  it('calcula o cycle time médio entre início e conclusão', () => {
    const events = [
      moved('a', 'todo', 'inProgress', daysAgo(6)),
      moved('a', 'inProgress', 'done', daysAgo(2)), // 4 dias
      moved('b', 'todo', 'inProgress', daysAgo(5)),
      moved('b', 'inProgress', 'done', daysAgo(3)), // 2 dias
    ];

    const metrics = calculateProjectMetrics([], events, 7, NOW);

    expect(metrics.averageCycleTimeDays).toBeCloseTo(3);
    expect(metrics.cycleTimeSampleSize).toBe(2);
  });

  it('devolve cycle time null quando não há histórico suficiente', () => {
    const events = [
      moved('a', 'todo', 'inProgress', daysAgo(2)), // começou, mas não concluiu
      moved('b', 'inProgress', 'done', daysAgo(1)), // concluiu sem início registrado
    ];

    const metrics = calculateProjectMetrics([card('a', 'inProgress', 3)], events, 7, NOW);

    expect(metrics.averageCycleTimeDays).toBeNull();
    expect(metrics.cycleTimeSampleSize).toBe(0);
  });

  it('ignora eventos sem data e cartões antigos sem histórico', () => {
    const events: ICardEvent[] = [
      { ...moved('a', 'todo', 'inProgress', daysAgo(4)), createdAt: null },
      moved('a', 'inProgress', 'done', daysAgo(1)),
    ];

    const metrics = calculateProjectMetrics([card('a', 'done', 5)], events, 7, NOW);

    expect(metrics.throughput).toBe(1);
    expect(metrics.averageCycleTimeDays).toBeNull();
    expect(metrics.completedStoryPoints).toBe(5);
  });

  it('funciona com projeto vazio', () => {
    const metrics = calculateProjectMetrics([], [], 7, NOW);

    expect(metrics.totalCards).toBe(0);
    expect(metrics.throughput).toBe(0);
    expect(metrics.averageCycleTimeDays).toBeNull();
  });
});
