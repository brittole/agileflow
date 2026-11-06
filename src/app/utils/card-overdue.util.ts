import { CardStatus, CardStoryPoints } from '../interfaces/card.interface';
import { ICardEvent } from '../interfaces/card-event.interface';

export type CardOverdueState = 'onTrack' | 'warning' | 'overdue';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Calcula o estado de prazo de um card com base na regra:
 * - Limite de dias = storyPoints (ex.: card de 5 pts tem 5 dias).
 * - Lead time = dias desde que entrou em "Em andamento" (ou desde a criação se nunca saiu do Backlog).
 * - warning: está no penúltimo dia ou depois, mas ainda não estourou o limite, e não está em Revisão/Concluído.
 * - overdue: lead time > storyPoints e não está em Concluído.
 *
 * Retorna 'onTrack' quando não há dados suficientes ou o card está dentro do prazo.
 */
export function getCardOverdueState(
  card: { id: string; status: CardStatus; storyPoints: CardStoryPoints; createdAt: { toMillis(): number } | null },
  events: ICardEvent[],
  now: Date = new Date(),
): CardOverdueState {
  if (card.status === 'done') {
    return 'onTrack';
  }

  // Encontrar quando o card entrou em "Em andamento" pela primeira vez.
  const enteredInProgress = events
    .filter((e) => e.cardId === card.id && e.type === 'moved' && e.toStatus === 'inProgress' && e.createdAt)
    .sort((a, b) => a.createdAt!.toMillis() - b.createdAt!.toMillis())[0];

  const startMs = enteredInProgress
    ? enteredInProgress.createdAt!.toMillis()
    : card.createdAt?.toMillis() ?? null;

  if (startMs === null) {
    return 'onTrack';
  }

  const leadTimeDays = (now.getTime() - startMs) / DAY_MS;
  const limitDays = card.storyPoints;

  if (leadTimeDays > limitDays) {
    return 'overdue';
  }

  // Aviso: está no penúltimo dia (ou depois) e ainda não chegou em Revisão.
  if (leadTimeDays >= limitDays - 1 && card.status !== 'review') {
    return 'warning';
  }

  return 'onTrack';
}

/**
 * Retorna uma mensagem curta para o estado de prazo.
 */
export function getCardOverdueLabel(state: CardOverdueState): string | null {
  if (state === 'warning') {
    return 'Pode atrasar';
  }
  if (state === 'overdue') {
    return 'Atrasado';
  }
  return null;
}
