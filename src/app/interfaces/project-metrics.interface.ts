import { CardStatus } from './card.interface';

export interface IProjectMetrics {
  totalCards: number;
  cardsByStatus: Record<CardStatus, number>;  completedCards: number;
  completedStoryPoints: number;
  wip: number;
  // Cartões concluídos dentro do período analisado.
  throughput: number;
  periodDays: number;
  periodStart: Date;
  periodEnd: Date;
  // Média em dias entre a primeira ida para "inProgress" e a primeira conclusão.
  // null quando nenhum cartão tem histórico suficiente.
  averageCycleTimeDays: number | null;
  cycleTimeSampleSize: number;
}
