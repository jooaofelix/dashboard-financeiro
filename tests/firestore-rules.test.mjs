import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, collection, getDocs, addDoc, deleteDoc } from 'firebase/firestore';
import fs from 'node:fs';

/**
 * Isolamento entre contas testado onde ele realmente vale: nas regras do
 * Firestore, contra o emulador. O cliente pode ser adulterado; a regra, não.
 *
 *   npm run test:rules
 */

const env = await initializeTestEnvironment({
  projectId: 'base-regras-teste',
  firestore: {
    rules: fs.readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8'),
    host: '127.0.0.1',
    port: 8080,
  },
});

const ok = (n, c) => { console.log((c ? '✓' : '✗') + ' ' + n); if (!c) process.exitCode = 1; };

const ana = env.authenticatedContext('uid-ana').firestore();
const bruno = env.authenticatedContext('uid-bruno').firestore();
const anonimo = env.unauthenticatedContext().firestore();

// semeia o workspace da Ana com privilégio administrativo
await env.withSecurityRulesDisabled(async (ctx) => {
  const d = ctx.firestore();
  await setDoc(doc(d, 'usuarios/uid-ana'), { empresa: 'Clínica da Ana' });
  await setDoc(doc(d, 'usuarios/uid-ana/atendimentos/a1'), { valor: 300 });
  await setDoc(doc(d, 'usuarios/uid-bruno'), { empresa: 'Escritório do Bruno' });
});

let r;
r = await assertSucceeds(getDoc(doc(ana, 'usuarios/uid-ana'))).then(() => true, () => false);
ok('dono lê o próprio workspace', r);

r = await assertSucceeds(getDocs(collection(ana, 'usuarios/uid-ana/atendimentos'))).then(() => true, () => false);
ok('dono lista a própria subcoleção', r);

r = await assertSucceeds(addDoc(collection(ana, 'usuarios/uid-ana/atendimentos'), { valor: 1 })).then(() => true, () => false);
ok('dono escreve na própria subcoleção', r);

r = await assertSucceeds(setDoc(doc(ana, 'usuarios/uid-ana'), { empresa: 'X' }, { merge: true })).then(() => true, () => false);
ok('dono atualiza a própria configuração', r);

// --- isolamento entre contas
r = await assertFails(getDoc(doc(bruno, 'usuarios/uid-ana'))).then(() => true, () => false);
ok('outra conta NÃO lê o workspace alheio', r);

r = await assertFails(getDocs(collection(bruno, 'usuarios/uid-ana/atendimentos'))).then(() => true, () => false);
ok('outra conta NÃO lista a subcoleção alheia', r);

r = await assertFails(getDoc(doc(bruno, 'usuarios/uid-ana/atendimentos/a1'))).then(() => true, () => false);
ok('outra conta NÃO lê documento alheio direto pelo id', r);

r = await assertFails(addDoc(collection(bruno, 'usuarios/uid-ana/atendimentos'), { valor: 9 })).then(() => true, () => false);
ok('outra conta NÃO escreve no workspace alheio', r);

r = await assertFails(deleteDoc(doc(bruno, 'usuarios/uid-ana/atendimentos/a1'))).then(() => true, () => false);
ok('outra conta NÃO apaga dado alheio', r);

r = await assertFails(setDoc(doc(bruno, 'usuarios/uid-ana'), { empresa: 'invadido' }, { merge: true })).then(() => true, () => false);
ok('outra conta NÃO altera a configuração alheia', r);

// --- sem sessão
r = await assertFails(getDoc(doc(anonimo, 'usuarios/uid-ana'))).then(() => true, () => false);
ok('sem autenticação NÃO lê nada', r);

r = await assertFails(addDoc(collection(anonimo, 'usuarios/uid-ana/atendimentos'), { v: 1 })).then(() => true, () => false);
ok('sem autenticação NÃO escreve nada', r);

// --- coleções antigas de raiz continuam negadas
r = await assertFails(getDocs(collection(ana, 'atendimentos'))).then(() => true, () => false);
ok('coleções na raiz (modelo antigo) ficam negadas', r);

r = await assertFails(addDoc(collection(ana, 'qualquer-coisa'), { v: 1 })).then(() => true, () => false);
ok('caminho fora do modelo é negado por padrão', r);

await env.cleanup();
console.log(process.exitCode ? '--- FALHAS nas regras ---' : '--- regras verificadas contra o emulador ---');
