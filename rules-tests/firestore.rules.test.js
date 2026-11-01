// Testes das regras do Firestore. Rodam SOMENTE no emulador local (projeto demo-*),
// nunca contra o Firebase de produção. Execute com: npm run test:rules
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert');
const {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} = require('@firebase/rules-unit-testing');
const {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} = require('firebase/firestore');

const RULES_PATH = path.join(__dirname, '..', 'firestore.rules');
const ALICE = 'alice';
const BOB = 'bob';

let env;

const aliceDb = () => env.authenticatedContext(ALICE).firestore();
const bobDb = () => env.authenticatedContext(BOB).firestore();
const anonDb = () => env.unauthenticatedContext().firestore();

async function seed(fn) {
  await env.withSecurityRulesDisabled(async (ctx) => fn(ctx.firestore()));
}

function cardData(overrides = {}) {
  return {
    projectId: 'p1',
    title: 'Cartão',
    description: '',
    status: 'todo',
    storyPoints: 3,
    createdBy: ALICE,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    ...overrides,
  };
}

async function seedBaseData() {
  await seed(async (db) => {
    await setDoc(doc(db, 'projects/p1'), { name: 'P1', description: '', ownerId: ALICE, memberIds: [] });
    await setDoc(doc(db, 'projects/p2'), { name: 'P2', description: '', ownerId: BOB, memberIds: [] });
    await setDoc(doc(db, 'projects/p3'), { name: 'P3', description: '', ownerId: ALICE, memberIds: [BOB] });
    await setDoc(doc(db, 'cards/c-todo'), cardData({ status: 'todo' }));
    await setDoc(doc(db, 'cards/c-done'), cardData({ status: 'done', completedAt: Timestamp.now() }));
    // Cartão antigo: sem completedAt e sem eventos
    await setDoc(doc(db, 'cards/c-legacy'), cardData({ status: 'inProgress' }));
    await setDoc(doc(db, 'cards/c-bob'), cardData({ projectId: 'p2', createdBy: BOB }));
    // Cartão de projeto com participante
    await setDoc(doc(db, 'cards/c-shared'), cardData({ projectId: 'p3', createdBy: ALICE }));
  });
}

// Payload idêntico ao que CardService.createCard grava
function newCard(overrides = {}) {
  return {
    projectId: 'p1',
    title: 'Novo',
    description: '',
    storyPoints: 3,
    status: 'todo',
    createdBy: ALICE,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ...overrides,
  };
}

// Payload idêntico ao que CardService.addEventToBatch grava
function event(overrides = {}) {
  return {
    cardId: 'c-todo',
    projectId: 'p1',
    type: 'moved',
    fromStatus: 'todo',
    toStatus: 'inProgress',
    storyPoints: 3,
    createdBy: ALICE,
    createdAt: serverTimestamp(),
    ...overrides,
  };
}

const newEventRef = (db) => doc(collection(db, 'cardEvents'));

// Mesma escrita de CardService.updateCardStatus (com mudança de status)
async function moveCard(db, cardId, from, to, eventOverrides = {}, cardOverrides = {}) {
  const batch = writeBatch(db);
  const eventRef = newEventRef(db);
  batch.update(doc(db, 'cards', cardId), {
    status: to,
    completedAt: to === 'done' ? serverTimestamp() : null,
    lastEventId: eventRef.id,
    updatedAt: serverTimestamp(),
    ...cardOverrides,
  });
  batch.set(eventRef, event({ cardId, fromStatus: from, toStatus: to, ...eventOverrides }));
  return batch.commit();
}

describe('firestore.rules', function () {
  this.timeout(60000);

  before(async () => {
    env = await initializeTestEnvironment({
      projectId: 'demo-agileflow-rules',
      firestore: { rules: fs.readFileSync(RULES_PATH, 'utf8') },
    });
  });

  after(async () => {
    await env.cleanup();
  });

  beforeEach(async () => {
    await env.clearFirestore();
    await seedBaseData();
  });

  describe('cartões: criação', () => {
    it('permite criar cartão válido', async () => {
      await assertSucceeds(setDoc(doc(aliceDb(), 'cards/new'), newCard()));
    });

    it('nega sem autenticação', async () => {
      await assertFails(setDoc(doc(anonDb(), 'cards/new'), newCard()));
    });

    it('nega criar em projeto de outro usuário', async () => {
      await assertFails(setDoc(doc(aliceDb(), 'cards/new'), newCard({ projectId: 'p2' })));
    });

    it('nega createdBy de outro usuário', async () => {
      await assertFails(setDoc(doc(aliceDb(), 'cards/new'), newCard({ createdBy: BOB })));
    });

    it('nega status inicial diferente de todo', async () => {
      await assertFails(setDoc(doc(aliceDb(), 'cards/new'), newCard({ status: 'done' })));
      await assertFails(setDoc(doc(aliceDb(), 'cards/new'), newCard({ status: 'blocked' })));
    });

    it('nega storyPoints fora de 1,2,3,5,8', async () => {
      await assertFails(setDoc(doc(aliceDb(), 'cards/new'), newCard({ storyPoints: 4 })));
      await assertFails(setDoc(doc(aliceDb(), 'cards/new'), newCard({ storyPoints: '3' })));
    });

    it('nega título vazio ou de tipo errado', async () => {
      await assertFails(setDoc(doc(aliceDb(), 'cards/new'), newCard({ title: '' })));
      await assertFails(setDoc(doc(aliceDb(), 'cards/new'), newCard({ title: 5 })));
    });

    it('nega campo extra', async () => {
      await assertFails(setDoc(doc(aliceDb(), 'cards/new'), newCard({ admin: true })));
    });

    it('nega createdAt escolhido pelo cliente', async () => {
      await assertFails(
        setDoc(doc(aliceDb(), 'cards/new'), newCard({ createdAt: Timestamp.fromDate(new Date('2020-01-01')) })),
      );
    });
  });

  describe('cartões: leitura e atualização', () => {
    it('dono lê e lista os próprios cartões (query atual do Kanban)', async () => {
      await assertSucceeds(getDoc(doc(aliceDb(), 'cards/c-todo')));
      await assertSucceeds(
        getDocs(query(collection(aliceDb(), 'cards'), where('projectId', '==', 'p1'))),
      );
    });

    it('participante lê cartões do projeto compartilhado', async () => {
      await assertSucceeds(getDoc(doc(bobDb(), 'cards/c-shared')));
      await assertSucceeds(
        getDocs(query(collection(bobDb(), 'cards'), where('projectId', '==', 'p3'))),
      );
    });

    it('outro usuário não lê nem lista cartões alheios', async () => {
      await assertFails(getDoc(doc(bobDb(), 'cards/c-todo')));
      await assertFails(
        getDocs(query(collection(bobDb(), 'cards'), where('projectId', '==', 'p1'))),
      );
    });

    it('permite editar título, descrição e story points (fluxo do card-detail)', async () => {
      await assertSucceeds(
        updateDoc(doc(aliceDb(), 'cards/c-todo'), {
          title: 'Editado',
          description: 'x',
          storyPoints: 5,
          updatedAt: serverTimestamp(),
        }),
      );
    });

    it('nega mover cartões sem evento, inclusive antigos (o vínculo com evento é obrigatório)', async () => {
      await assertFails(
        updateDoc(doc(aliceDb(), 'cards/c-legacy'), {
          status: 'done',
          completedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }),
      );
      await assertFails(
        updateDoc(doc(aliceDb(), 'cards/c-done'), {
          status: 'todo',
          completedAt: null,
          updatedAt: serverTimestamp(),
        }),
      );
    });

    it('nega status inválido, story points inválidos e título vazio', async () => {
      const ref = doc(aliceDb(), 'cards/c-todo');
      await assertFails(updateDoc(ref, { status: 'blocked', updatedAt: serverTimestamp() }));
      await assertFails(updateDoc(ref, { storyPoints: 4, updatedAt: serverTimestamp() }));
      await assertFails(updateDoc(ref, { title: '', updatedAt: serverTimestamp() }));
    });

    it('nega alterar campos protegidos', async () => {
      const ref = doc(aliceDb(), 'cards/c-todo');
      await assertFails(updateDoc(ref, { createdAt: Timestamp.now(), updatedAt: serverTimestamp() }));
      await assertFails(updateDoc(ref, { createdBy: BOB, updatedAt: serverTimestamp() }));
      await assertFails(updateDoc(ref, { projectId: 'p2', updatedAt: serverTimestamp() }));
      await assertFails(updateDoc(ref, { extra: 1, updatedAt: serverTimestamp() }));
    });

    it('nega completedAt arbitrário e updatedAt do cliente', async () => {
      const ref = doc(aliceDb(), 'cards/c-todo');
      await assertFails(
        updateDoc(ref, { completedAt: Timestamp.fromDate(new Date('2020-01-01')), updatedAt: serverTimestamp() }),
      );
      await assertFails(updateDoc(ref, { status: 'inProgress', updatedAt: Timestamp.now() }));
    });

    it('outro usuário não atualiza nem exclui', async () => {
      await assertFails(updateDoc(doc(bobDb(), 'cards/c-todo'), { title: 'x', updatedAt: serverTimestamp() }));
      await assertFails(deleteDoc(doc(bobDb(), 'cards/c-todo')));
    });

    it('participante não edita nem exclui cartões', async () => {
      await assertFails(updateDoc(doc(bobDb(), 'cards/c-shared'), { title: 'x', updatedAt: serverTimestamp() }));
      await assertFails(deleteDoc(doc(bobDb(), 'cards/c-shared')));
    });

    it('participante move entre todo, inProgress e review, mas não para done', async () => {
      await assertSucceeds(moveCard(bobDb(), 'c-shared', 'todo', 'inProgress', { createdBy: BOB }));
      await assertSucceeds(moveCard(bobDb(), 'c-shared', 'inProgress', 'review', { createdBy: BOB }));
      await assertFails(moveCard(bobDb(), 'c-shared', 'review', 'done', { createdBy: BOB }));
    });

    it('admin move para done e devolve de review para inProgress', async () => {
      await assertSucceeds(moveCard(aliceDb(), 'c-shared', 'todo', 'review'));
      await assertSucceeds(moveCard(aliceDb(), 'c-shared', 'review', 'inProgress'));
      await assertSucceeds(moveCard(aliceDb(), 'c-shared', 'inProgress', 'done'));
    });

    it('dono exclui cartão sem evento (fluxo com flag desligado)', async () => {
      await assertSucceeds(deleteDoc(doc(aliceDb(), 'cards/c-todo')));
    });
  });

  describe('cartões: vínculo obrigatório com evento (lastEventId)', () => {
    const ref = (id) => doc(aliceDb(), 'cards', id);

    it('nega mudança de status sem lastEventId (cliente sem eventos)', async () => {
      await assertFails(updateDoc(ref('c-todo'), { status: 'inProgress', updatedAt: serverTimestamp() }));
    });

    it('nega mudança de status com lastEventId, mas sem criar o evento', async () => {
      await assertFails(
        updateDoc(ref('c-todo'), { status: 'inProgress', lastEventId: 'fantasma', updatedAt: serverTimestamp() }),
      );
    });

    it('nega lastEventId que não é string', async () => {
      await assertFails(
        updateDoc(ref('c-todo'), { status: 'inProgress', lastEventId: 123, updatedAt: serverTimestamp() }),
      );
    });

    it('nega evento inconsistente: toStatus, fromStatus, cardId, createdBy e type errados', async () => {
      await assertFails(moveCard(aliceDb(), 'c-todo', 'todo', 'done', {}, { status: 'inProgress' }));
      await assertFails(moveCard(aliceDb(), 'c-todo', 'done', 'inProgress'));
      await assertFails(moveCard(aliceDb(), 'c-todo', 'todo', 'inProgress', { cardId: 'c-legacy' }));
      await assertFails(moveCard(aliceDb(), 'c-todo', 'todo', 'inProgress', { createdBy: BOB }));
      await assertFails(moveCard(aliceDb(), 'c-todo', 'todo', 'inProgress', { type: 'deleted', toStatus: null }));
    });

    it('nega evento criado para outro cartão no mesmo batch (cardId do evento de outro cartão)', async () => {
      const db = aliceDb();
      const batch = writeBatch(db);
      const eventRef = newEventRef(db);
      batch.update(doc(db, 'cards/c-todo'), {
        status: 'inProgress',
        completedAt: null,
        lastEventId: eventRef.id,
        updatedAt: serverTimestamp(),
      });
      batch.set(eventRef, event({ cardId: 'c-legacy', fromStatus: 'inProgress', toStatus: 'done' }));
      await assertFails(batch.commit());
    });

    it('nega reutilizar o evento de uma movimentação anterior', async () => {
      const db = aliceDb();
      const first = newEventRef(db);
      const batch = writeBatch(db);
      batch.update(doc(db, 'cards/c-todo'), {
        status: 'inProgress',
        completedAt: null,
        lastEventId: first.id,
        updatedAt: serverTimestamp(),
      });
      batch.set(first, event());
      await assertSucceeds(batch.commit());

      // Mesma movimentação seguinte apontando para o evento antigo, sem criar um novo
      await assertFails(
        updateDoc(ref('c-todo'), {
          status: 'done',
          completedAt: serverTimestamp(),
          lastEventId: first.id,
          updatedAt: serverTimestamp(),
        }),
      );
      // Tentar recriar o mesmo id vira update de evento, que é negado
      const reuse = writeBatch(db);
      reuse.update(doc(db, 'cards/c-todo'), {
        status: 'done',
        completedAt: serverTimestamp(),
        lastEventId: first.id,
        updatedAt: serverTimestamp(),
      });
      reuse.set(doc(db, 'cardEvents', first.id), event({ fromStatus: 'inProgress', toStatus: 'done' }));
      await assertFails(reuse.commit());
    });

    it('nega usar o evento de um cartão para mover outro cartão', async () => {
      const db = aliceDb();
      const first = newEventRef(db);
      const batch = writeBatch(db);
      batch.update(doc(db, 'cards/c-todo'), {
        status: 'inProgress',
        completedAt: null,
        lastEventId: first.id,
        updatedAt: serverTimestamp(),
      });
      batch.set(first, event());
      await batch.commit();

      await assertFails(
        updateDoc(ref('c-legacy'), {
          status: 'done',
          completedAt: serverTimestamp(),
          lastEventId: first.id,
          updatedAt: serverTimestamp(),
        }),
      );
    });

    it('nega gravar evento "moved" sem que o cartão aponte para ele (lastEventId diferente)', async () => {
      await assertFails(moveCard(aliceDb(), 'c-todo', 'todo', 'inProgress', {}, { lastEventId: 'outro-id' }));
    });

    it('nega alterar lastEventId sem mudar o status', async () => {
      await assertFails(updateDoc(ref('c-todo'), { lastEventId: 'x', updatedAt: serverTimestamp() }));
    });

    it('nega criar cartão já com lastEventId', async () => {
      await assertFails(setDoc(doc(aliceDb(), 'cards/new'), newCard({ lastEventId: 'x' })));
    });

    it('permite editar título, descrição e story points sem evento, em cartão novo ou antigo', async () => {
      await assertSucceeds(updateDoc(ref('c-legacy'), { title: 'Editado', storyPoints: 8, updatedAt: serverTimestamp() }));
      await assertSucceeds(updateDoc(ref('c-todo'), { description: 'ok', updatedAt: serverTimestamp() }));
    });

    it('cartão antigo (sem lastEventId) pode ser movido com evento, e depois movido de novo', async () => {
      await assertSucceeds(moveCard(aliceDb(), 'c-legacy', 'inProgress', 'done'));
      await assertSucceeds(moveCard(aliceDb(), 'c-legacy', 'done', 'inProgress'));
    });

    it('mover com status igual ao atual e sem evento (sem mudança) continua permitido', async () => {
      await assertSucceeds(updateDoc(ref('c-todo'), { status: 'todo', updatedAt: serverTimestamp() }));
    });
  });

  describe('cardEvents: criação junto com o cartão (writeBatch)', () => {
    it('created: cartão + evento no mesmo batch', async () => {
      const db = aliceDb();
      const batch = writeBatch(db);
      const cardRef = doc(collection(db, 'cards'));
      batch.set(cardRef, newCard());
      batch.set(
        newEventRef(db),
        event({ cardId: cardRef.id, type: 'created', fromStatus: null, toStatus: 'todo' }),
      );
      await assertSucceeds(batch.commit());
    });

    it('moved: todo→inProgress→done→todo', async () => {
      await assertSucceeds(moveCard(aliceDb(), 'c-todo', 'todo', 'inProgress'));
      await assertSucceeds(moveCard(aliceDb(), 'c-todo', 'inProgress', 'done'));
      await assertSucceeds(moveCard(aliceDb(), 'c-todo', 'done', 'todo'));
    });

    it('moved: cartão antigo, sem completedAt', async () => {
      await assertSucceeds(moveCard(aliceDb(), 'c-legacy', 'inProgress', 'done'));
    });

    it('deleted: exclusão + evento no mesmo batch', async () => {
      const db = aliceDb();
      const batch = writeBatch(db);
      batch.delete(doc(db, 'cards/c-todo'));
      batch.set(
        newEventRef(db),
        event({ cardId: 'c-todo', type: 'deleted', fromStatus: 'todo', toStatus: null }),
      );
      await assertSucceeds(batch.commit());
    });

    it('o evento sobrevive à exclusão do cartão e é legível pelo autor', async () => {
      const db = aliceDb();
      const evRef = newEventRef(db);
      const batch = writeBatch(db);
      batch.delete(doc(db, 'cards/c-todo'));
      batch.set(evRef, event({ cardId: 'c-todo', type: 'deleted', fromStatus: 'todo', toStatus: null }));
      await batch.commit();
      const snap = await assertSucceeds(getDoc(evRef));
      assert.strictEqual(snap.exists(), true);
    });
  });

  describe('cardEvents: negações', () => {
    it('nega evento sem autenticação', async () => {
      await assertFails(setDoc(newEventRef(anonDb()), event()));
    });

    it('nega evento avulso sem alterar o cartão', async () => {
      await assertFails(setDoc(newEventRef(aliceDb()), event()));
    });

    it('nega evento created sem cartão correspondente no batch', async () => {
      await assertFails(
        setDoc(newEventRef(aliceDb()), event({ cardId: 'inexistente', type: 'created', fromStatus: null, toStatus: 'todo' })),
      );
    });

    it('nega evento created para cartão que já existia', async () => {
      await assertFails(
        setDoc(newEventRef(aliceDb()), event({ cardId: 'c-todo', type: 'created', fromStatus: null, toStatus: 'todo' })),
      );
    });

    it('nega moved com fromStatus diferente do estado real', async () => {
      await assertFails(moveCard(aliceDb(), 'c-todo', 'done', 'inProgress'));
    });

    it('nega moved com toStatus diferente do status final do cartão', async () => {
      const db = aliceDb();
      const batch = writeBatch(db);
      const eventRef = newEventRef(db);
      batch.update(doc(db, 'cards/c-todo'), {
        status: 'inProgress',
        completedAt: null,
        lastEventId: eventRef.id,
        updatedAt: serverTimestamp(),
      });
      batch.set(eventRef, event({ cardId: 'c-todo', fromStatus: 'todo', toStatus: 'done' }));
      await assertFails(batch.commit());
    });

    it('nega moved com fromStatus igual a toStatus', async () => {
      await assertFails(moveCard(aliceDb(), 'c-todo', 'todo', 'todo'));
    });

    it('nega deleted sem excluir o cartão', async () => {
      await assertFails(
        setDoc(newEventRef(aliceDb()), event({ cardId: 'c-todo', type: 'deleted', fromStatus: 'todo', toStatus: null })),
      );
    });

    it('nega projectId incoerente com o cartão', async () => {
      await assertFails(moveCard(aliceDb(), 'c-todo', 'todo', 'inProgress', { projectId: 'p2' }));
    });

    it('nega evento de cartão de outro usuário', async () => {
      const db = bobDb();
      const batch = writeBatch(db);
      const eventRef = newEventRef(db);
      batch.update(doc(db, 'cards/c-todo'), {
        status: 'inProgress',
        lastEventId: eventRef.id,
        updatedAt: serverTimestamp(),
      });
      batch.set(eventRef, event({ createdBy: BOB, cardId: 'c-todo', projectId: 'p1' }));
      await assertFails(batch.commit());
    });

    it('nega createdBy forjado', async () => {
      await assertFails(moveCard(aliceDb(), 'c-todo', 'todo', 'inProgress', { createdBy: BOB }));
    });

    it('nega status inválido, story points inválidos, tipo inválido e campo extra', async () => {
      await assertFails(moveCard(aliceDb(), 'c-todo', 'todo', 'blocked'));
      await assertFails(moveCard(aliceDb(), 'c-todo', 'todo', 'inProgress', { storyPoints: 4 }));
      await assertFails(moveCard(aliceDb(), 'c-todo', 'todo', 'inProgress', { type: 'edited' }));
      await assertFails(moveCard(aliceDb(), 'c-todo', 'todo', 'inProgress', { extra: true }));
    });

    it('nega createdAt escolhido pelo cliente', async () => {
      await assertFails(
        moveCard(aliceDb(), 'c-todo', 'todo', 'inProgress', {
          createdAt: Timestamp.fromDate(new Date('2020-01-01')),
        }),
      );
    });
  });

  describe('cardEvents: imutabilidade e leitura', () => {
    let eventId;

    beforeEach(async () => {
      const db = aliceDb();
      const ref = newEventRef(db);
      eventId = ref.id;
      const batch = writeBatch(db);
      batch.update(doc(db, 'cards/c-todo'), {
        status: 'inProgress',
        completedAt: null,
        lastEventId: ref.id,
        updatedAt: serverTimestamp(),
      });
      batch.set(ref, event());
      await batch.commit();
    });

    it('nega atualizar evento, até pelo autor', async () => {
      await assertFails(updateDoc(doc(aliceDb(), 'cardEvents', eventId), { toStatus: 'done' }));
    });

    it('nega excluir evento, até pelo autor', async () => {
      await assertFails(deleteDoc(doc(aliceDb(), 'cardEvents', eventId)));
    });

    it('autor lista seus eventos com filtro createdBy + projectId', async () => {
      const snap = await assertSucceeds(
        getDocs(query(collection(aliceDb(), 'cardEvents'), where('projectId', '==', 'p1'), where('createdBy', '==', ALICE))),
      );
      assert.strictEqual(snap.size, 1);
    });

    it('outro usuário não lê nem lista eventos alheios', async () => {
      await assertFails(getDoc(doc(bobDb(), 'cardEvents', eventId)));
      await assertFails(
        getDocs(query(collection(bobDb(), 'cardEvents'), where('projectId', '==', 'p1'), where('createdBy', '==', ALICE))),
      );
    });

    it('nega listagem sem filtro por createdBy', async () => {
      await assertFails(getDocs(collection(aliceDb(), 'cardEvents')));
    });

    it('nega acesso sem autenticação', async () => {
      await assertFails(getDoc(doc(anonDb(), 'cardEvents', eventId)));
    });
  });

  describe('exclusão de cartões em lotes (limites de acessos das regras)', () => {
    async function seedCards(count) {
      await seed(async (db) => {
        for (let i = 0; i < count; i += 1) {
          await setDoc(doc(db, `cards/bulk-${i}`), cardData({ status: 'todo' }));
        }
      });
    }

    const idsOf = (n) => Array.from({ length: n }, (_, i) => `bulk-${i}`);

    // Mesma escrita de CardService.deleteCardsByProject, por lote
    function deleteChunk(db, ids, withEvents) {
      const batch = writeBatch(db);
      ids.forEach((id) => {
        batch.delete(doc(db, 'cards', id));
        if (withEvents) {
          batch.set(newEventRef(db), event({ cardId: id, type: 'deleted', fromStatus: 'todo', toStatus: null }));
        }
      });
      return batch.commit();
    }

    it('sem eventos (flag desligado): lote de 200 cartões é aceito', async () => {
      await seedCards(200);
      await assertSucceeds(deleteChunk(aliceDb(), idsOf(200), false));
    });

    it('com eventos: lote de 8 cartões (tamanho usado pelo CardService) é aceito', async () => {
      await seedCards(8);
      await assertSucceeds(deleteChunk(aliceDb(), idsOf(8), true));
    });

    it('mede o limite real de cartões por lote com eventos', async () => {
      let lastOk = 0;
      let firstFail = null;

      for (let n = 1; n <= 40; n += 1) {
        await env.clearFirestore();
        await seedBaseData();
        await seedCards(n);

        try {
          await deleteChunk(aliceDb(), idsOf(n), true);
          lastOk = n;
        } catch {
          firstFail = n;
          break;
        }
      }

      console.log(`      limite medido: ${lastOk} cartões/lote aceitos; primeira falha em: ${firstFail ?? 'nenhuma até 40'}`);
      assert.ok(lastOk >= 8, 'o tamanho de lote usado pelo CardService (8) precisa ser aceito');
      assert.ok(firstFail !== null, 'esperava que lotes grandes com eventos excedessem o limite de acessos');
    });

    it('lote com eventos acima do limite é rejeitado inteiro (nada é excluído)', async () => {
      await seedCards(40);
      await assertFails(deleteChunk(aliceDb(), idsOf(40), true));
      await seed(async (db) => {
        assert.strictEqual((await getDoc(doc(db, 'cards/bulk-0'))).exists(), true);
      });
    });

    it('outro usuário não exclui cartões do projeto alheio', async () => {
      await seedCards(3);
      await assertFails(deleteChunk(bobDb(), idsOf(2), false));
    });
  });
});
