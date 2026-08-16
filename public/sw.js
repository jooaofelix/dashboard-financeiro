/**
 * Service worker mínimo.
 *
 * Ele existe por dois motivos, nenhum deles "cache agressivo":
 *
 * 1. O Chrome só considera o app instalável — e só então oferece a BASE no menu
 *    "Compartilhar" do Android — se houver um service worker capaz de responder
 *    quando a rede falha;
 * 2. abrir o app sem sinal e ver a tela de lançamento em vez de erro é a
 *    diferença entre registrar o atendimento e esquecer dele.
 *
 * A estratégia é **rede primeiro**: cada visita busca a versão mais nova e só
 * cai no cache quando a rede não responde. Um app financeiro servindo uma
 * versão velha de si mesmo é pior do que um app offline — o usuário lançaria
 * num código que já não é o que está no ar.
 */

const CACHE = "base-v1";

/** O casco do app: o suficiente para abrir e lançar sem rede. */
const ESSENCIAIS = [
  "/rapido",
  "/manifest.webmanifest",
  "/icone-192.png",
  "/icone-512.png",
];

self.addEventListener("install", (evento) => {
  evento.waitUntil(
    caches
      .open(CACHE)
      // `reload` evita guardar uma cópia que o próprio navegador já tinha em
      // cache HTTP — seria gravar a versão antiga no primeiro dia.
      .then((cache) => cache.addAll(ESSENCIAIS.map((url) => new Request(url, { cache: "reload" }))))
      .catch(() => {
        // Instalar sem o casco é aceitável: o app continua funcionando online.
      })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((chaves) => Promise.all(chaves.filter((c) => c !== CACHE).map((c) => caches.delete(c))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (evento) => {
  const requisicao = evento.request;

  // Só GET do mesmo domínio. O Firestore e o WhatsApp passam direto: um app
  // financeiro não pode responder dado de servidor a partir de cache.
  if (requisicao.method !== "GET") return;
  if (new URL(requisicao.url).origin !== self.location.origin) return;

  evento.respondWith(
    fetch(requisicao)
      .then((resposta) => {
        if (resposta && resposta.ok && resposta.type === "basic") {
          const copia = resposta.clone();
          caches.open(CACHE).then((cache) => cache.put(requisicao, copia)).catch(() => {});
        }
        return resposta;
      })
      .catch(async () => {
        const guardado = await caches.match(requisicao);
        if (guardado) return guardado;
        // Navegação sem rede e sem cópia exata cai no lançamento rápido, que é
        // a tela que faz sentido abrir offline.
        if (requisicao.mode === "navigate") {
          const casco = await caches.match("/rapido");
          if (casco) return casco;
        }
        return Response.error();
      })
  );
});
