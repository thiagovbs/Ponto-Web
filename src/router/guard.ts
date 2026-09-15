/**
 * Decisão de navegação, isolada do Vue Router.
 *
 * Fica num módulo próprio, sem importar nada do Vue, por dois motivos: pode ser
 * testada sem montar a aplicação, e a regra de quem entra onde fica num lugar
 * só, legível de cima a baixo.
 *
 * Isto é proteção de navegação, não de dados: quem decide o que cada perfil lê
 * e escreve é a API. Aqui apenas evitamos abrir telas que o usuário não tem
 * como usar.
 */

export const PERFIS_ADMINISTRATIVOS = ['ADMIN', 'SUPER_ADMIN'];

export type MetaRota = {
  requiresAuth?: boolean;
  requiresAdmin?: boolean;
};

/** O mínimo de localStorage que a decisão precisa — facilita testar. */
export type Sessao = {
  getItem(chave: string): string | null;
};

/** Perfil do usuário autenticado, conforme gravado no login em `ponto_user`. */
export function perfilDaSessao(sessao: Sessao): string | null {
  try {
    const bruto = sessao.getItem('ponto_user');
    if (!bruto) return null;

    const perfil = JSON.parse(bruto)?.perfil;
    return typeof perfil === 'string' ? perfil.toUpperCase() : null;
  } catch {
    // ponto_user corrompido equivale a não ter sessão.
    return null;
  }
}

/**
 * Para onde a navegação deve ser desviada, ou `null` para seguir.
 *
 * O guard anterior lia apenas `requiresAuth`. Como as cinco rotas
 * administrativas — inclusive /super-admin — declaram `requiresAdmin` e não
 * `requiresAuth`, nenhuma delas era protegida: abriam sem login algum.
 */
export function destinoDaNavegacao(meta: MetaRota, sessao: Sessao): string | null {
  const autenticado = !!sessao.getItem('ponto_token');
  const exigeLogin = meta.requiresAuth === true || meta.requiresAdmin === true;

  if (exigeLogin && !autenticado) return '/';

  if (meta.requiresAdmin === true) {
    const perfil = perfilDaSessao(sessao);
    if (perfil === null || !PERFIS_ADMINISTRATIVOS.includes(perfil)) return '/dashboard';
  }

  return null;
}
