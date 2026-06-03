<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import SidebarComponent from '../components/SidebarComponent.vue';
import api from '../services/api';

interface Empresa {
  id: string;
  razaoSocial: string;
  cnpj: string;
  tokenTotem: string;
  ativo: boolean;
  createdAt: string;
}

interface MembroEquipe {
  id: string;
  nome: string;
  cpf: string;
  createdAt: string;
}

// Controle de Navegação de Abas Internas (UX Unificada)
const abaAtiva = ref<'empresas' | 'equipe'>('empresas');

const carregando = ref(false);
const mensagemSucesso = ref('');
const erroGeral = ref('');

// Dados de retorno do provisionamento para você copiar e mandar pro cliente
// 🟢 CORREÇÃO: Removidas as barras invertidas que causavam o erro de escape Unicode
const dadosTenantCriado = ref<{
  empresaId: string;
  tokenTotemConfiguracao: string;
  administradorVinculado: string;
} | null>(null);

// Formulário de Setup Corporativo
const formulario = reactive({
  razaoSocial: '',
  cnpj: '',
  nomeAdmin: '',
  cpfAdmin: '',
  senhaAdmin: ''
});

// Formulário de Nova Credencial Super Admin (Equipe)
const formularioEquipe = reactive({
  nome: '',
  cpf: '',
  senha: ''
});

const empresas = ref<Empresa[]>([]);
const equipe = ref<MembroEquipe[]>([]);
const carregandoLista = ref(false);
const carregandoEquipe = ref(false);

// Controle do Modal de Redefinição de Senha
const modalSenha = reactive({
  aberto: false,
  empresaId: '',
  usuarioAdminId: '',
  novaSenha: '',
  carregando: false,
  erro: '',
  sucesso: ''
});

// Busca todas as empresas parceiras cadastradas no ecossistema
const carregarEmpresas = async () => {
  try {
    carregandoLista.value = true;
    const resposta = await api.get('/super/empresas');
    empresas.value = resposta.data;
  } catch (error: any) {
    console.error('Erro ao listar empresas:', error);
  } finally {
    carregandoLista.value = false;
  }
};

// Busca todos os integrantes de suporte cadastrados na matriz
const carregarEquipeMaster = async () => {
  try {
    carregandoEquipe.value = true;
    const resposta = await api.get('/super/equipe');
    equipe.value = resposta.data;
  } catch (error: any) {
    console.error('Erro ao buscar equipe técnica:', error);
  } finally {
    carregandoEquipe.value = false;
  }
};

const provisionarNovaEmpresa = async () => {
  erroGeral.value = '';
  mensagemSucesso.value = '';
  dadosTenantCriado.value = null;

  if (!formulario.razaoSocial || !formulario.cnpj || !formulario.nomeAdmin || !formulario.cpfAdmin || !formulario.senhaAdmin) {
    erroGeral.value = 'Por favor, preencha todos os campos para executar o provisionamento.';
    return;
  }

  try {
    carregando.value = true;
    const resposta = await api.post('/super/empresa', formulario);
    
    mensagemSucesso.value = 'Estrutura multi-tenant inicializada com sucesso!';
    dadosTenantCriado.value = {
      empresaId: resposta.data.empresaId,
      tokenTotemConfiguracao: resposta.data.tokenTotemConfiguracao,
      administradorVinculado: resposta.data.administradorVinculado
    };

    formulario.razaoSocial = '';
    formulario.cnpj = '';
    formulario.nomeAdmin = '';
    formulario.cpfAdmin = '';
    formulario.senhaAdmin = '';

    await carregarEmpresas();
  } catch (error: any) {
    console.error(error);
    if (error.response && error.response.data && error.response.data.erro) {
      erroGeral.value = error.response.data.erro;
    } else {
      erroGeral.value = 'Falha crítica ao conectar com a API. Verifique os logs.';
    }
  } finally {
    carregando.value = false;
  }
};

const adicionarMembroEquipe = async () => {
  erroGeral.value = '';
  mensagemSucesso.value = '';

  if (!formularioEquipe.nome || !formularioEquipe.cpf || !formularioEquipe.senha || formularioEquipe.senha.trim().length < 6) {
    erroGeral.value = 'Preencha Nome, CPF e uma senha de suporte válida (mínimo 6 dígitos).';
    return;
  }

  try {
    carregando.value = true;
    await api.post('/super/equipe', formularioEquipe);
    mensagemSucesso.value = 'Novo membro integrado com sucesso à equipe de Super Admins!';
    
    formularioEquipe.nome = '';
    formularioEquipe.cpf = '';
    formularioEquipe.senha = '';

    await carregarEquipeMaster();
  } catch (error: any) {
    console.error(error);
    erroGeral.value = error.response?.data?.erro || 'Erro ao tentar integrar membro de suporte.';
  } finally {
    carregando.value = false;
  }
};

const alternarStatusEmpresa = async (empresa: Empresa) => {
  try {
    const novoStatus = !empresa.ativo;
    await api.put(`/super/empresa/${empresa.id}`, { ativo: novoStatus });
    empresa.ativo = novoStatus;
  } catch (error: any) {
    alert('Erro ao alterar o status operacional da empresa.');
  }
};

const abrirModalSenha = (empresaId: string) => {
  modalSenha.empresaId = empresaId;
  modalSenha.usuarioAdminId = ''; 
  modalSenha.novaSenha = '';
  modalSenha.erro = '';
  modalSenha.sucesso = '';
  modalSenha.aberto = true;
};

const fecharModalSenha = () => {
  modalSenha.aberto = false;
};

const ejecutarTrocaSenhaAdmin = async () => {
  modalSenha.erro = '';
  modalSenha.sucesso = '';

  if (!modalSenha.usuarioAdminId || !modalSenha.novaSenha || modalSenha.novaSenha.trim().length < 6) {
    modalSenha.erro = 'O ID do usuário Admin e uma nova senha válida (mínimo 6 dígitos) são obrigatórios.';
    return;
  }

  try {
    modalSenha.carregando = true;
    const resposta = await api.post('/super/empresa/redefinir-senha', {
      empresaId: modalSenha.empresaId,
      usuarioAdminId: modalSenha.usuarioAdminId.trim(),
      novaSenha: modalSenha.novaSenha
    });

    modalSenha.sucesso = resposta.data.mensagem || 'Senha redefinida com sucesso!';
    modalSenha.novaSenha = '';
    modalSenha.usuarioAdminId = '';
  } catch (error: any) {
    if (error.response && error.response.data && error.response.data.erro) {
      modalSenha.erro = error.response.data.erro;
    } else {
      modalSenha.erro = 'Erro interno ao tentar atualizar a senha de acesso.';
    }
  } finally {
    modalSenha.carregando = false;
  }
};

const entrarComoEmpresa = async (idEmpresa: string) => {
  try {
    const tokenOriginal = localStorage.getItem('ponto_token');
    if (!tokenOriginal) return;

    localStorage.setItem('token_master_backup', tokenOriginal);

    const res = await api.post('/super/personificar', { empresaIdAlvo: idEmpresa });
    localStorage.setItem('ponto_token', res.data.token);
    
    window.location.href = '/funcionarios';
  } catch (error: any) {
    alert(error.response?.data?.erro || 'Falha ao entrar no modo de personificação.');
  }
};

const trocarAba = (novaAba: 'empresas' | 'equipe') => {
  abaAtiva.value = novaAba;
  erroGeral.value = '';
  mensagemSucesso.value = '';
};

onMounted(() => {
  carregarEmpresas();
  carregarEquipeMaster();
});
</script>

<template>
  <div class="superadmin-layout">
    <SidebarComponent />

    <main class="conteudo-principal">
      <header class="header-pagina">
        <h1>Painel do Proprietário (Super Admin)</h1>
        <p>Gerencie a infraestrutura SaaS, ative organizações ou gerencie seu time técnico de suporte.</p>
      </header>

      <div class="abas-navegacao">
        <button :class="['btn-aba', { active: abaAtiva === 'empresas' }]" @click="trocarAba('empresas')">
          🏢 Organizações Clientes (Tenants)
        </button>
        <button :class="['btn-aba', { active: abaAtiva === 'equipe' }]" @click="trocarAba('equipe')">
          👥 Equipe Técnica de Suporte
        </button>
      </div>

      <div v-if="abaAtiva === 'empresas'" class="fade-in-content">
        <div class="grid-superadmin">
          <div class="card-painel">
            <h3>🚀 Provisionar Nova Organização (Tenant)</h3>
            <p class="subtitulo">Abaixo você cria o banco lógico isolado da empresa e o primeiro usuário gerente.</p>

            <form @submit.prevent="provisionarNovaEmpresa" class="form-super">
              <div class="grupo-input">
                <label>Razão Social da Empresa</label>
                <input type="text" v-model="formulario.razaoSocial" placeholder="Ex: Tecno Ponto Ltda" />
              </div>

              <div class="grupo-input">
                <label>CNPJ Corporativo</label>
                <input type="text" v-model="formulario.cnpj" placeholder="Apenas números" />
              </div>

              <div class="divisor-form">
                <span>ADMINISTRADOR MASTER DO CLIENTE</span>
              </div>

              <div class="grupo-input">
                <label>Nome do Gestor Comercial</label>
                <input type="text" v-model="formulario.nomeAdmin" placeholder="Ex: Carlos Alberto" />
              </div>

              <div class="grupo-input">
                <label>CPF do Gestor</label>
                <input type="text" v-model="formulario.cpfAdmin" placeholder="Apenas números" />
              </div>

              <div class="grupo-input">
                <label>Senha Provisória de Acesso</label>
                <input type="password" v-model="formulario.senhaAdmin" placeholder="Mínimo 6 caracteres" />
              </div>

              <div v-if="erroGeral && abaAtiva === 'empresas'" class="alert alert-erro">{{ erroGeral }}</div>
              <div v-if="mensagemSucesso && abaAtiva === 'empresas'" class="alert alert-sucesso">{{ mensagemSucesso }}</div>

              <button type="submit" :disabled="carregando" class="btn-provisionar">
                {{ carregando ? 'Processando Setup Atômico...' : 'Inicializar Infraestrutura SaaS' }}
              </button>
            </form>
          </div>

          <div class="card-painel container-chaves">
            <h3>🔑 Dados do Último Provisionamento</h3>
            <p class="subtitulo">Copie com atenção os dados abaixo e envie diretamente para o cliente configurar o Totem Mobile.</p>

            <div v-if="dadosTenantCriado" class="card-chaves">
              <h4>Empresa Criada com Sucesso!</h4>
              <p class="aviso-chave">As credenciais abaixo não serão exibidas novamente por questões de privacidade e segurança da informação.</p>

              <div class="bloco-chave">
                <label>ID DA ORGANIZAÇÃO (DATABASE)</label>
                <input type="text" readonly :value="dadosTenantCriado.empresaId" class="input-readonly" />
              </div>

              <div class="bloco-chave">
                <label>TOKEN EXCLUSIVO DO TOTEM (FLUTTER APP)</label>
                <input type="text" readonly :value="dadosTenantCriado.tokenTotemConfiguracao" class="input-readonly" />
              </div>

              <div class="bloco-chave">
                <label>ADMINISTRADOR MESTRE DO SISTEMA</label>
                <input type="text" readonly :value="dadosTenantCriado.administradorVinculado" class="input-readonly" />
              </div>
            </div>

            <div v-else class="sem-chaves">
              <p>Nenhuma empresa foi criada nesta sessão ainda. Aguardando novo setup corporativo.</p>
            </div>
          </div>
        </div>

        <div class="card-painel tabela-empresas-container">
          <h3>🏢 Empresas Clientes no Ecossistema</h3>
          <p class="subtitulo">Monitore, inative inadimplentes (bloqueio lógico de login) ou resete senhas dos clientes.</p>

          <div v-if="carregandoLista" class="carregando-dados">Carregando carteira de clientes...</div>
          <div v-else-if="empresas.length === 0" class="sem-chaves">Nenhuma empresa localizada na base de dados de produção.</div>

          <div v-else class="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>Razão Social</th>
                  <th>CNPJ</th>
                  <th>Token Totem</th>
                  <th>Status Operacional</th>
                  <th style="text-align: center; width: 15%;">Ações de Suporte</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="empresa in empresas" :key="empresa.id">
                  <td class="bold-text">{{ empresa.razaoSocial }}</td>
                  <td>{{ empresa.cnpj }}</td>
                  <td class="token-cell"><code>{{ empresa.tokenTotem }}</code></td>
                  <td>
                    <span :class="['badge-status', empresa.ativo ? 'status-ativo' : 'status-inativo']">
                      {{ empresa.ativo ? 'Ativo' : 'Inativo' }}
                    </span>
                  </td>
                  <td>
                    <div class="acoes-row">
                      <button class="btn-impersonate" @click="entrarComoEmpresa(empresa.id)" title="Acessar painel como esta empresa (Suporte)">👁️</button>
                      <button class="btn-senha" @click="abrirModalSenha(empresa.id)" title="Resetar Senha Admin">🔑</button>
                      <button :class="['btn-status', empresa.ativo ? 'btn-bloquear' : 'btn-ativar']" @click="alternarStatusEmpresa(empresa)" :title="empresa.ativo ? 'Inativar Organização' : 'Reativar Organização'">
                        {{ empresa.ativo ? '🚫' : '✅' }}
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div v-else class="fade-in-content">
        <div class="grid-superadmin">
          <div class="card-painel">
            <h3>👥 Integrar Integrante Técnico (Super Admin)</h3>
            <p class="subtitulo">Cadastre sócios ou analistas seniores. Eles herdarão os mesmos acessos padrão e globais da sua conta mestre.</p>

            <form @submit.prevent="adicionarMembroEquipe" class="form-super">
              <div class="grupo-input">
                <label>Nome Completo do Membro</label>
                <input type="text" v-model="formularioEquipe.nome" placeholder="Ex: Roberto Silveira" />
              </div>

              <div class="grupo-input">
                <label>CPF Individual</label>
                <input type="text" v-model="formularioEquipe.cpf" placeholder="Apenas números" />
              </div>

              <div class="grupo-input">
                <label>Senha de Acesso ao SaaS</label>
                <input type="password" v-model="formularioEquipe.senha" placeholder="Mínimo 6 caracteres" />
              </div>

              <div v-if="erroGeral && abaAtiva === 'equipe'" class="alert alert-erro">{{ erroGeral }}</div>
              <div v-if="mensagemSucesso && abaAtiva === 'equipe'" class="alert alert-sucesso">{{ mensagemSucesso }}</div>

              <button type="submit" :disabled="carregando" class="btn-provisionar">
                {{ carregando ? 'Conectando Integrante...' : 'Conceder Credencial Super Admin' }}
              </button>
            </form>
          </div>

          <div class="card-painel container-chaves">
            <h3>🛡️ Escopo de Atuação do Time</h3>
            <div class="info-seguranca-equipe">
              <h4>Regras de Segurança Master:</h4>
              <ul>
                <li>Membros cadastrados nesta aba possuem controle irrestrito.</li>
                <li>Eles herdarão a mesma organização "Matriz" que a sua conta principal para evitar registros nulos no banco Neon.</li>
                <li>Eles conseguem executar personificação (Suporte Técnico) em qualquer empresa da plataforma.</li>
                <li>Por motivos de integridade corporativa, exclusões técnicas de suporte devem ser realizadas diretamente via banco de dados.</li>
              </ul>
            </div>
          </div>
        </div>

        <div class="card-painel tabela-empresas-container">
          <h3>👥 Analistas Técnicos com Poder Master Ativo</h3>
          <p class="subtitulo">Abaixo estão listados todos os administradores com passe livre corporativo global ativo.</p>

          <div v-if="carregandoEquipe" class="carregando-dados">Buscando equipe técnica...</div>
          <div v-else-if="equipe.length === 0" class="sem-chaves">Nenhum outro membro de suporte cadastrado na base ainda.</div>

          <div v-else class="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>Nome do Analista Master</th>
                  <th>CPF Registrado</th>
                  <th>Perfil Operacional</th>
                  <th>Data de Admissão no SaaS</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="membro in equipe" :key="membro.id">
                  <td class="bold-text">{{ membro.nome }}</td>
                  <td style="font-family: monospace;">{{ membro.cpf }}</td>
                  <td>
                    <span class="badge-status status-ativo" style="background-color: #f3e8ff; color: #6b21a8; border: 1px solid #e9d5ff;">
                      SUPER_ADMIN
                    </span>
                  </td>
                  <td>{{ new Date(membro.createdAt).toLocaleDateString('pt-BR') }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>

    <div v-if="modalSenha.aberto" class="modal-overlay">
      <div class="modal-card">
        <h3>🔑 Trocar Senha Administrativa</h3>
        <p class="subtitulo">Informe o ID do usuário e a nova credencial para atualizar as informações no banco.</p>

        <div class="grupo-input margin-top">
          <label>ID do Usuário Administrador</label>
          <input type="text" v-model="modalSenha.usuarioAdminId" placeholder="Cole o ID do usuário ADMIN da empresa" />
        </div>

        <div class="grupo-input">
          <label>Nova Senha do Cliente</label>
          <input type="password" v-model="modalSenha.novaSenha" placeholder="No mínimo 6 caracteres" />
        </div>

        <div v-if="modalSenha.erro" class="alert alert-erro">{{ modalSenha.erro }}</div>
        <div v-if="modalSenha.sucesso" class="alert alert-sucesso">{{ modalSenha.sucesso }}</div>

        <div class="modal-acoes">
          <button @click="fecharModalSenha" class="btn-cancelar">Fechar</button>
          <button @click="ejecutarTrocaSenhaAdmin" :disabled="modalSenha.carregando" class="btn-confirmar">
            {{ modalSenha.carregando ? 'Salvando...' : 'Confirmar Nova Senha' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.superadmin-layout {
  display: flex;
  flex-direction: row;
  min-height: 100vh;
  width: 100%;
  background-color: #f8fafc;
}

.conteudo-principal {
  flex: 1;
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
  box-sizing: border-box;
  min-width: 0;
}

.header-pagina {
  margin-bottom: 2rem;
}

.header-pagina h1 {
  font-size: 1.8rem;
  color: #1e293b;
  margin: 0 0 0.5rem 0;
}

.header-pagina p {
  color: #64748b;
  margin: 0;
  font-size: 0.95rem;
}

/* 📑 ESTILOS PARA AS ABAS DE NAVEGAÇÃO INTERNA */
.abas-navegacao {
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
  border-bottom: 2px solid #e2e8f0;
  padding-bottom: 0.5rem;
}

.btn-aba {
  background: transparent;
  border: none;
  padding: 0.6rem 1.2rem;
  font-size: 0.95rem;
  font-weight: 600;
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s;
  border-radius: 6px;
}

.btn-aba:hover {
  color: #0f172a;
  background-color: #f1f5f9;
}

.btn-aba.active {
  color: #7c3aed;
  background-color: #f5f3ff;
}

.fade-in-content {
  animation: fadeInEffect 0.3s ease-in-out;
}

@keyframes fadeInEffect {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}

.grid-superadmin {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.card-painel {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  border: 1px solid #e2e8f0;
}

.card-painel h3 {
  margin: 0 0 0.25rem 0;
  font-size: 1.2rem;
  color: #0f172a;
}

.subtitulo {
  font-size: 0.85rem;
  color: #64748b;
  margin: 0 0 1.5rem 0;
}

.form-super {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.grupo-input {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.grupo-input label {
  font-size: 0.85rem;
  font-weight: 600;
  color: #334155;
}

.grupo-input input {
  padding: 0.65rem;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  font-size: 0.9rem;
  outline: none;
  transition: border-color 0.2s;
}

.grupo-input input:focus {
  border-color: #7c3aed;
}

.divisor-form {
  text-align: center;
  position: relative;
  margin: 0.5rem 0;
}

.divisor-form::before {
  content: "";
  position: absolute;
  left: 0;
  top: 50%;
  width: 100%;
  height: 1px;
  background-color: #e2e8f0;
  z-index: 1;
}

.divisor-form span {
  background-color: white;
  padding: 0 0.75rem;
  font-size: 0.75rem;
  font-weight: 700;
  color: #94a3b8;
  position: relative;
  z-index: 2;
  letter-spacing: 0.05em;
}

.alert {
  padding: 0.75rem;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 500;
}

.alert-erro {
  background-color: #fef2f2;
  color: #991b1b;
  border: 1px solid #fee2e2;
}

.alert-sucesso {
  background-color: #f0fdf4;
  color: #166534;
  border: 1px solid #dcfce7;
}

.btn-provisionar {
  background: #7c3aed;
  color: white;
  border: none;
  padding: 0.8rem;
  border-radius: 6px;
  font-weight: bold;
  font-size: 1rem;
  cursor: pointer;
  transition: background 0.2s;
  margin-top: 1rem;
}

.btn-provisionar:hover {
  background: #6d28d9;
}

.btn-provisionar:disabled {
  background: #cbd5e1;
  cursor: not-allowed;
}

.container-chaves {
  display: flex;
  flex-direction: column;
}

.card-chaves {
  background: #faf5ff;
  border: 1px solid #e9d5ff;
  padding: 1.5rem;
  border-radius: 12px;
  color: #5b21b6;
}

.card-chaves h4 {
  margin: 0 0 0.5rem 0;
  font-size: 1.05rem;
  font-weight: 700;
  color: #6b21a8;
}

.aviso-chave {
  font-size: 0.8rem;
  color: #7e22ce;
  margin: 0 0 1.25rem 0;
  line-height: 1.4;
}

.bloco-chave {
  margin-bottom: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.bloco-chave label {
  font-size: 0.75rem;
  font-weight: bold;
  color: #6b21a8;
}

.input-readonly {
  background: white;
  border: 1px solid #d8b4fe;
  padding: 0.6rem;
  border-radius: 6px;
  font-family: monospace;
  font-size: 0.9rem;
  color: #4c1d95;
}

.sem-chaves {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px dashed #e2e8f0;
  border-radius: 12px;
  color: #94a3b8;
  text-align: center;
  padding: 2rem;
  font-size: 0.9rem;
}

.info-seguranca-equipe {
  background-color: #f8fafc;
  border: 1px solid #e2e8f0;
  padding: 1.25rem;
  border-radius: 8px;
  color: #334155;
}

.info-seguranca-equipe h4 {
  margin: 0 0 0.75rem 0;
  color: #0f172a;
}

.info-seguranca-equipe ul {
  margin: 0;
  padding-left: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  font-size: 0.88rem;
  line-height: 1.5;
}

.tabela-empresas-container {
  margin-top: 1rem;
}

.carregando-dados {
  text-align: center;
  padding: 2rem;
  color: #64748b;
  font-size: 0.95rem;
}

.table-responsive {
  width: 100%;
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
  margin-top: 0.5rem;
}

th, td {
  padding: 0.85rem;
  border-bottom: 1px solid #e2e8f0;
  font-size: 0.9rem;
}

th {
  background-color: #f8fafc;
  color: #475569;
  font-weight: 600;
}

.bold-text {
  font-weight: 600;
  color: #1e293b;
}

.token-cell code {
  background: #f1f5f9;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-family: monospace;
  color: #0f172a;
}

.badge-status {
  padding: 0.25rem 0.5rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: bold;
  display: inline-block;
}

.status-ativo {
  background-color: #dcfce7;
  color: #15803d;
}

.status-inativo {
  background-color: #fee2e2;
  color: #b91c1c;
}

.acoes-row { display: flex; gap: 8px; justify-content: center; align-items: center; }

.btn-impersonate {
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  padding: 0.4rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 1rem;
  color: #1e40af;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  transition: all 0.1s ease;
}
.btn-impersonate:hover { background: #dbeafe; border-color: #3b82f6; }

.btn-senha {
  background: #f1f5f9;
  border: 1px solid #cbd5e1;
  padding: 0.4rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 1rem;
  color: #475569;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  transition: all 0.1s ease;
}
.btn-senha:hover { background: #e2e8f0; }

.btn-status {
  padding: 0.4rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 1rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  transition: all 0.1s ease;
}
.btn-bloquear { background: #fff5f5; border: 1px solid #fca5a5; color: #dc2626; }
.btn-bloquear:hover { background: #fee2e2; }
.btn-ativar { background: #f0fdf4; border: 1px solid #bbf7d0; color: #166534; }
.btn-ativar:hover { background: #dcfce7; }

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
}

.modal-card {
  background: white;
  padding: 1.75rem;
  border-radius: 12px;
  width: 100%;
  max-width: 450px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  box-sizing: border-box;
}

.margin-top {
  margin-top: 1.25rem;
}

.modal-acoes {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 1.5rem;
}

.btn-cancelar {
  background: #64748b;
  color: white;
  border: none;
  padding: 0.55rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  font-size: 0.9rem;
}

.btn-cancelar:hover {
  background: #475569;
}

.btn-confirmar {
  background: #7c3aed;
  color: white;
  border: none;
  padding: 0.55rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  font-weight: bold;
  font-size: 0.9rem;
}

.btn-confirmar:hover {
  background: #6d28d9;
}
</style>