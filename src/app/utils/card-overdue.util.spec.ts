import { getCardOverdueState, getCardOverdueLabel } from './card-overdue.util';
import { ICardEvent } from '../interfaces/card-event.interface';

// Testes da lógica de card atrasado, sem depender de dados reais do Firestore.
describe('card-overdue.util', () => {
  const now = new Date('2026-11-06T12:00:00Z');
  const DAY_MS = 24 * 60 * 60 * 1000;

  function makeEvent(cardId: string, toStatus: string, daysAgo: number): ICardEvent {
    return {
      id: `evt-${cardId}-${toStatus}`,
      cardId,
      projectId: 'p1',
      type: 'moved',
      fromStatus: 'todo',
      toStatus: toStatus as ICardEvent['toStatus'],
      storyPoints: 3,
      createdBy: 'uid1',
      createdAt: { toMillis: () => now.getTime() - daysAgo * DAY_MS } as ICardEvent['createdAt'],
    };
  }

  function makeCard(overrides: Partial<Parameters<typeof getCardOverdueState>[0]> = {}) {
    return {
      id: 'c1',
      status: 'inProgress' as const,
      storyPoints: 3 as const,
      createdAt: { toMillis: () => now.getTime() - 10 * DAY_MS },
      ...overrides,
    };
  }

  it('card concluído nunca está atrasado', () => {
    const card = makeCard({ status: 'done' });
    expect(getCardOverdueState(card, [], now)).toBe('onTrack');
  });

  it('card dentro do prazo está onTrack', () => {
    const card = makeCard();
    const events = [makeEvent('c1', 'inProgress', 1)]; // entrou há 1 dia, limite 3 → dentro do prazo
    expect(getCardOverdueState(card, events, now)).toBe('onTrack');
  });

  it('card no penúltimo dia sem estar em Revisão está warning', () => {
    const card = makeCard();
    const events = [makeEvent('c1', 'inProgress', 2.5)]; // 2.5 dias, limite 3 → penúltimo dia
    expect(getCardOverdueState(card, events, now)).toBe('warning');
    expect(getCardOverdueLabel('warning')).toBe('Pode atrasar');
  });

  it('card no penúltimo dia mas já em Revisão está onTrack', () => {
    const card = makeCard({ status: 'review' });
    const events = [makeEvent('c1', 'inProgress', 2.5)];
    expect(getCardOverdueState(card, events, now)).toBe('onTrack');
  });

  it('card que passou do limite está overdue', () => {
    const card = makeCard();
    const events = [makeEvent('c1', 'inProgress', 4)]; // 4 dias, limite 3 → atrasado
    expect(getCardOverdueState(card, events, now)).toBe('overdue');
    expect(getCardOverdueLabel('overdue')).toBe('Atrasado');
  });

  it('card sem evento de entrada em andamento usa createdAt', () => {
    const card = makeCard({ createdAt: { toMillis: () => now.getTime() - 5 * DAY_MS } });
    expect(getCardOverdueState(card, [], now)).toBe('overdue');
  });

  it('card sem createdAt nem evento fica onTrack', () => {
    const card = makeCard({ createdAt: null });
    expect(getCardOverdueState(card, [], now)).toBe('onTrack');
  });
});
