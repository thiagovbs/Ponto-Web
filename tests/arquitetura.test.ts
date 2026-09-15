/**
 * Testes de arquitetura.
 *
 * Não exercitam comportamento: leem o código e afirmam invariantes. Existem
 * porque o defeito que motivou tudo — `requiresAdmin` declarado nas rotas e
 * nunca lido pelo guard — não seria pego por nenhum teste funcional do guard:
 * a função estava certa, quem estava errado era quem a chamava.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// O projeto e ESM ("type": "module"), entao __dirname nao existe.
const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(AQUI, '..');
const ler = (caminho: string) => readFileSync(join(RAIZ, caminho), 'utf-8');

const router = () => ler(join('src', 'router', 'index.ts'));
const guard = () => ler(join('src', 'router', 'guard.ts'));

/** Extrai cada rota declarada com sua meta. */
function rotasDeclaradas(): { path: string; meta: string }[] {
  const texto = router();
  const rotas: { path: string; meta: string }[] = [];

  for (const m of texto.matchAll(/path:\s*'([^']+)'([\s\S]*?)(?=\{\s*path:|\];)/g)) {
    const meta = m[2].match(/meta:\s*\{([^}]*)\}/);
    rotas.push({ path: m[1], meta: meta ? meta[1].trim() : '' });
  }

  return rotas;
}

describe('rotas e guard', () => {
  it('há rotas declaradas para inspecionar', () => {
    assert.ok(rotasDeclaradas().length >= 5, 'A extração de rotas não encontrou nada — o teste ficaria vazio.');
  });

  // Se uma meta nova for inventada e o guard não a tratar, a rota fica sem
  // proteção em silêncio. Foi exatamente o que aconteceu com requiresAdmin.
  it('toda meta usada nas rotas é tratada pelo guard', () => {
    const chaves = new Set<string>();
    for (const { meta } of rotasDeclaradas()) {
      for (const m of meta.matchAll(/(\w+)\s*:/g)) chaves.add(m[1]);
    }

    const logica = guard();
    const ignoradas = [...chaves].filter((chave) => !logica.includes(chave));

    assert.deepEqual(
      ignoradas,
      [],
      'Metas declaradas nas rotas que o guard nunca lê: ' + ignoradas.join(', ')
    );
  });

  it('as telas administrativas estão marcadas como tal', () => {
    const esperadas = ['/afastamentos', '/fiscalizacao', '/setores', '/filiais', '/super-admin'];
    const rotas = rotasDeclaradas();
    const desmarcadas: string[] = [];

    for (const path of esperadas) {
      const rota = rotas.find((r) => r.path === path);
      assert.ok(rota, `Rota ${path} não encontrada — se foi renomeada, ajuste este teste.`);
      if (!rota!.meta.includes('requiresAdmin')) desmarcadas.push(path);
    }

    assert.deepEqual(desmarcadas, [], 'Telas administrativas sem requiresAdmin: ' + desmarcadas.join(', '));
  });

  it('nenhuma rota fica sem meta por engano, exceto o login', () => {
    const semMeta = rotasDeclaradas().filter((r) => r.meta === '' && r.path !== '/');

    assert.deepEqual(
      semMeta.map((r) => r.path),
      [],
      'Rotas sem meta são públicas: confirme que é intencional.'
    );
  });

  it('o guard delega a decisão ao módulo isolado', () => {
    // Procurar o nome no arquivo inteiro não basta: a linha de import já o
    // contém, então o teste passaria mesmo com a chamada removida do corpo.
    const texto = router();
    const inicio = texto.indexOf('router.beforeEach');
    assert.notEqual(inicio, -1, 'beforeEach não encontrado no router.');

    const corpo = texto.slice(inicio);
    assert.ok(
      /destinoDaNavegacao\s*\(/.test(corpo),
      'A decisão deve vir de router/guard.ts, que é o que os testes exercitam. ' +
        'Reimplementá-la em index.ts deixaria os testes verdes e o app desprotegido.'
    );
  });

  it('o módulo de decisão não depende do Vue', () => {
    assert.ok(
      !/from\s+'vue/.test(guard()),
      'guard.ts precisa continuar testável sem montar a aplicação.'
    );
  });
});

describe('sessão', () => {
  it('o token só é lido pela camada de API e pelo guard', () => {
    // Espalhar leitura de token pelas views torna impossível trocar a forma de
    // armazenar a sessão sem caçar ocorrências.
    const permitidos = [
      join('src', 'services', 'api.ts'),      // anexa o token em toda chamada
      join('src', 'router', 'guard.ts'),      // decide navegação pela sessão
      join('src', 'views', 'LoginView.vue'),  // grava a sessão
      join('src', 'components', 'SidebarComponent.vue'), // encerra a personificação
      join('src', 'views', 'SuperAdminView.vue'),        // inicia a personificação
    ];

    // Comentários citam `ponto_token` ao explicar que o interceptor cuida dele;
    // só a leitura em código conta.
    const semComentarios = (texto: string) =>
      texto
        .split(/\r?\n/)
        .filter((l) => {
          const t = l.trimStart();
          return !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*');
        })
        .join('\n');

    const encontrados: string[] = [];

    const varrer = (dir: string) => {
      for (const nome of readdirSync(join(RAIZ, dir))) {
        const rel = join(dir, nome);
        if (statSync(join(RAIZ, rel)).isDirectory()) varrer(rel);
        else if (/\.(ts|vue)$/.test(nome) && semComentarios(ler(rel)).includes('ponto_token')) {
          encontrados.push(rel);
        }
      }
    };
    varrer('src');

    const inesperados = encontrados.filter((f) => !permitidos.includes(f));
    assert.deepEqual(inesperados, [], 'Leitura de ponto_token fora dos lugares previstos: ' + inesperados.join(', '));
  });
});
