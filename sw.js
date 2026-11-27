/* ==========================================================================
   MotoCare — sw.js (Service Worker)

   Estratégia:
   - INSTALL: pré-carrega (precache) todo o "app shell" em um cache versionado.
   - FETCH (mesma origem, GET): rede primeiro; se funcionar, atualiza o cache;
     se a rede falhar (offline), responde com o que está no cache.
     Navegações sem cache caem no index.html.
   - FETCH (outras origens, ex.: API da NHTSA): NÃO é interceptado — passa direto
     para a rede, para que o app trate o erro de conexão e avise o usuário.
   - ACTIVATE: apaga caches de versões antigas.

   >>> Para publicar uma nova versão: altere VERSAO abaixo (ex.: 'v1.0.1'). <<<
   ========================================================================== */
const VERSAO = 'v1.0.0';
const PREFIXO_CACHE = 'motocare-';
const NOME_CACHE = `${PREFIXO_CACHE}${VERSAO}`;

const ARQUIVOS_ESSENCIAIS = [
  './',
  'index.html',
  'manifest.json',
  'css/style.css',
  'js/storage.js',
  'js/validation.js',
  'js/api.js',
  'js/app.js',
  'icons/icon-192.png',
  'icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(NOME_CACHE).then((cache) =>
      // cache: 'reload' ignora o cache HTTP do navegador e garante arquivos novos
      cache.addAll(ARQUIVOS_ESSENCIAIS.map((url) => new Request(url, { cache: 'reload' })))
    )
  );
  // Sem skipWaiting aqui: uma versão nova espera o usuário clicar em "Atualizar".
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((nomes) =>
        Promise.all(
          nomes
            .filter((nome) => nome.startsWith(PREFIXO_CACHE) && nome !== NOME_CACHE)
            .map((nome) => caches.delete(nome))
        )
      )
      .then(() => self.clients.claim())
  );
});

// O app envia esta mensagem quando o usuário aceita atualizar
self.addEventListener('message', (event) => {
  if (event.data && event.data.tipo === 'PULAR_ESPERA') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const requisicao = event.request;
  if (requisicao.method !== 'GET') return;

  const url = new URL(requisicao.url);
  if (url.origin !== self.location.origin) return; // API externa: direto na rede

  event.respondWith(redePrimeiroComCache(event, requisicao));
});

async function redePrimeiroComCache(event, requisicao) {
  const cache = await caches.open(NOME_CACHE);

  try {
    const resposta = await fetch(requisicao);
    if (resposta && resposta.status === 200 && resposta.type === 'basic') {
      event.waitUntil(cache.put(requisicao, resposta.clone()).catch(() => {}));
    }
    return resposta;
  } catch (erro) {
    const emCache = await cache.match(requisicao, { ignoreSearch: true });
    if (emCache) return emCache;

    if (requisicao.mode === 'navigate') {
      const pagina = await cache.match('index.html');
      if (pagina) return pagina;
    }

    return new Response('Sem conexão e recurso não disponível offline.', {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  }
}
