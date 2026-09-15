/**
 * Decisão de navegação.
 *
 * Executa a função real de src/router/guard.ts. Ela não importa nada do Vue,
 * então o teste roda sem montar a aplicação e sem navegador.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { destinoDaNavegacao, perfilDaSessao, type Sessao } from '../src/router/guard';

/** localStorage falso, com o mínimo que a decisão consulta. */
function sessao(dados: Record<string, string>): Sessao {
  return { getItem: (chave) => (chave in dados ? dados[chave] : null) };
}

const logado = (perfil: string) =>
  sessao({ ponto_token: 'tk', ponto_user: JSON.stringify({ perfil }) });

const deslogado = () => sessao({});

const ADMINISTRATIVA = { requiresAdmin: true };
const COMUM = { requiresAuth: true };
const PUBLICA = {};

describe('rota administrativa', () => {
  // O defeito original: `requiresAdmin` não era lido pelo guard, e como essas
  // rotas não declaram `requiresAuth`, /super-admin abria sem login algum.
  it('manda para o login quem não está autenticado', () => {
    assert.equal(destinoDaNavegacao(ADMINISTRATIVA, deslogado()), '/');
  });

  it('desvia FUNCIONARIO para o dashboard', () => {
    assert.equal(destinoDaNavegacao(ADMINISTRATIVA, logado('FUNCIONARIO')), '/dashboard');
  });

  it('deixa ADMIN passar', () => {
    assert.equal(destinoDaNavegacao(ADMINISTRATIVA, logado('ADMIN')), null);
  });

  it('deixa SUPER_ADMIN passar', () => {
    assert.equal(destinoDaNavegacao(ADMINISTRATIVA, logado('SUPER_ADMIN')), null);
  });

  it('aceita o perfil em qualquer caixa', () => {
    assert.equal(destinoDaNavegacao(ADMINISTRATIVA, logado('super_admin')), null);
  });

  it('desvia quando há token mas não há perfil na sessão', () => {
    assert.equal(destinoDaNavegacao(ADMINISTRATIVA, sessao({ ponto_token: 'tk' })), '/dashboard');
  });

  it('desvia quando ponto_user está corrompido', () => {
    const corrompido = sessao({ ponto_token: 'tk', ponto_user: '{nao é json' });
    assert.equal(destinoDaNavegacao(ADMINISTRATIVA, corrompido), '/dashboard');
  });

  it('desvia quando o perfil não é uma string', () => {
    const estranho = sessao({ ponto_token: 'tk', ponto_user: JSON.stringify({ perfil: 42 }) });
    assert.equal(destinoDaNavegacao(ADMINISTRATIVA, estranho), '/dashboard');
  });
});

describe('rota comum', () => {
  it('manda para o login quem não está autenticado', () => {
    assert.equal(destinoDaNavegacao(COMUM, deslogado()), '/');
  });

  it('deixa FUNCIONARIO passar', () => {
    assert.equal(destinoDaNavegacao(COMUM, logado('FUNCIONARIO')), null);
  });

  it('não exige perfil algum', () => {
    assert.equal(destinoDaNavegacao(COMUM, sessao({ ponto_token: 'tk' })), null);
  });
});

describe('rota pública', () => {
  it('passa sem sessão', () => {
    assert.equal(destinoDaNavegacao(PUBLICA, deslogado()), null);
  });

  it('passa com sessão', () => {
    assert.equal(destinoDaNavegacao(PUBLICA, logado('ADMIN')), null);
  });
});

describe('perfilDaSessao', () => {
  it('normaliza a caixa', () => {
    assert.equal(perfilDaSessao(logado('admin')), 'ADMIN');
  });

  it('devolve null sem ponto_user', () => {
    assert.equal(perfilDaSessao(deslogado()), null);
  });

  it('devolve null com JSON inválido, em vez de estourar', () => {
    assert.equal(perfilDaSessao(sessao({ ponto_user: '<<<' })), null);
  });
});
