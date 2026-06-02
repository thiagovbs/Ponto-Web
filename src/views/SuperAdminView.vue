<script setup lang="ts">
import { ref, reactive } from 'vue';
import SidebarComponent from '../components/SidebarComponent.vue';
import api from '../services/api';

const carregando = ref(false);
const mensagemSucesso = ref('');
const erroGeral = ref('');

// Dados de retorno do provisionamento para você copiar e mandar pro cliente
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
    
    // Dispara a chamada para a rota do Dono do SaaS que plugamos no server.ts
    const resposta = await api.post('/super/empresa', formulario);
    
    mensagemSucesso.value = resposta.data.mensagem;
    dadosTenantCriado.value = {
      empresaId: resposta.data.empresaId,
      tokenTotemConfiguracao: resposta.data.tokenTotemConfiguracao,
      administradorVinculado: resposta.data.administradorVinculado
    };

    // Limpa o formulário após o sucesso
    formulario.razaoSocial = '';
    formulario.cnpj = '';
    formulario.nomeAdmin = '';
    formulario.cpfAdmin = '';
    formulario.senhaAdmin = '';

  } catch (error: any) {
    console.error(error);
    erroGeral.value = error.response?.data?.erro || 'Falha crítica ao provisionar o novo cliente SaaS.';
  } finally {
    carregando.value = false;
  }
};
</script>

<template>
  <div class="dashboard-layout">
    <SidebarComponent />

    <main class="content-area">
      <header class="content-header">
        <h2>Painel Master - Provedor SaaS</h2>
        <span class="badge-master">Licença Mestre Ativa</span>
      </header>
      <p class="sub-mestre">Módulo exclusivo do proprietário para provisionamento de novos bancos e instâncias corporativas.</p>

      <p v-if="mensagemSucesso" class="sucesso">✅ {{ mensagemSucesso }}</p>
      <p v-if="erroGeral" class="erro">⚠️ {{ erroGeral }}</p>

      <div class="grid-setup">
        <div class="card-mestre">
          <h3>Provisionar Novo Cliente (Setup Atômico)</h3>
          <form @submit.prevent="provisionarNovaEmpresa" class="form-grid">
            
            <div class="secao-titulo">🏢 Dados da Empresa Cliente</div>
            <div class="form-group">
              <label>Razão Social / Nome Fantasia *</label>
              <input type="text" v-model="formulario.razaoSocial" placeholder="Ex: TecnoLogistica Distribuidora LTDA" />
            </div>
            <div class="form-group">
              <label>CNPJ Corporativo *</label>
              <input type="text" v-model="formulario.cnpj" placeholder="Apenas números ou com máscara" />
            </div>

            <div class="secao-titulo" style="margin-top: 1rem;">💼 Primeiro Usuário Administrador (Master do Cliente)</div>
            <div class="form-group">
              <label>Nome do Administrador Responsável *</label>
              <input type="text" v-model="formulario.nomeAdmin" placeholder="Ex: Roberto Souza" />
            </div>
            <div class="form-group">
              <label>CPF do Administrador *</label>
              <input type="text" v-model="formulario.cpfAdmin" placeholder="Apenas os 11 números" maxlength="11" />
            </div>
            <div class="form-group full-width">
              <label>Senha Provisória de Acesso *</label>
              <input type="password" v-model="formulario.senhaAdmin" placeholder="Crie uma senha segura para o primeiro acesso do cliente" />
            </div>

            <button type="submit" class="btn-provisionar" :disabled="carregando">
              {{ carregando ? 'Instanciando Infraestrutura...' : '🚀 Executar Setup e Criar Tenant' }}
            </button>
          </form>
        </div>

        <div class="card-chaves" v-if="dadosTenantCriado">
          <h4>🔑 Credenciais do Novo Cliente Geradas</h4>
          <p class="aviso-chave">Copie os tokens abaixo. Por motivos de segurança, o token do Totem não será exibido novamente.</p>
          
          <div class="bloco-chave">
            <label>ID Único da Empresa (empresaId)</label>
            <input type="text" :value="dadosTenantCriado.empresaId" readonly class="input-readonly" />
          </div>

          <div class="bloco-chave">
            <label>Token do Totem (Injetar no App Flutter) 🔥</label>
            <textarea readonly rows="2" class="input-readonly token-destaque">{{ dadosTenantCriado.tokenTotemConfiguracao }}</textarea>
          </div>

          <div class="bloco-chave">
            <label>Admin Gerado</label>
            <p style="margin: 0.2rem 0 0 0; font-size: 0.9rem; color: #1e293b; font-weight: 600;">
              {{ dadosTenantCriado.administradorVinculado }}
            </p>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.dashboard-layout { display: flex; min-height: 100vh; background-color: #f1f5f9; font-family: sans-serif; width: 100%; }
.content-area { flex: 1; padding: 2rem; min-width: 0; box-sizing: border-box; }
.content-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem; }
.content-header h2 { margin: 0; color: #0f172a; font-size: 1.6rem; font-weight: 800; }
.sub-mestre { color: #475569; margin: 0 0 2rem 0; font-size: 0.95rem; }

.badge-master { background-color: #7c3aed; color: white; font-size: 0.8rem; font-weight: bold; padding: 0.3rem 0.6rem; border-radius: 20px; }

.grid-setup { display: grid; grid-template-columns: 1fr 360px; gap: 2rem; align-items: start; }
@media (max-width: 1024px) { .grid-setup { grid-template-columns: 1fr; } }

.card-mestre { background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; }
.card-mestre h3 { margin: 0 0 1.5rem 0; color: #1e293b; font-size: 1.15rem; font-weight: 700; border-bottom: 2px solid #f1f5f9; padding-bottom: 0.75rem; }

.secao-titulo { font-size: 0.9rem; font-weight: bold; color: #7c3aed; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 0.75rem; grid-column: span 2; }

.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; }
.form-group { display: flex; flex-direction: column; gap: 0.4rem; }
@media (max-width: 640px) { .form-group { grid-column: span 2; } }
.full-width { grid-column: span 2; }

label { font-size: 0.85rem; font-weight: 600; color: #475569; }
input { padding: 0.6rem 0.75rem; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 0.95rem; background: white; outline: none; box-sizing: border-box; width: 100%; }
input:focus { border-color: #7c3aed; box-shadow: 0 0 0 3px rgba(124,58,237,0.1); }

.btn-provisionar { grid-column: span 2; background: #7c3aed; color: white; border: none; padding: 0.8rem; border-radius: 6px; font-weight: bold; font-size: 1rem; cursor: pointer; transition: background 0.2s; margin-top: 1rem; }
.btn-provisionar:hover { background: #6d28d9; }
.btn-provisionar:disabled { background: #cbd5e1; cursor: not-allowed; }

/* CARD DE CHAVES RESULTANTES */
.card-chaves { background: #faf5ff; border: 1px solid #e9d5ff; padding: 1.5rem; border-radius: 12px; color: #5b21b6; }
.card-chaves h4 { margin: 0 0 0.5rem 0; font-size: 1.05rem; font-weight: 700; color: #6b21a8; }
.aviso-chave { font-size: 0.8rem; color: #7e22ce; margin: 0 0 1.25rem 0; line-height: 1.4; }
.bloco-chave { margin-bottom: 1rem; display: flex; flex-direction: column; gap: 0.3rem; }
.bloco-chave label { font-size: 0.75rem; font-weight: bold; color: #6b21a8; }
.input-readonly { background: white; border: 1px solid #d8b4fe; padding: 0.5rem; border-radius: 6px; font-size: 0.85rem; font-family: monospace; color: #4c1d95; width: 100%; box-sizing: border-box; resize: none; outline: none; }
.token-destaque { background: #f5f3ff; font-weight: bold; color: #7c3aed; border: 1px dashed #c084fc; }

.sucesso { color: #065f46; margin-bottom: 1.5rem; font-weight: bold; font-size: 0.9rem; background: #ecfdf5; padding: 0.75rem; border-radius: 6px; border: 1px solid #bbf7d0; }
.erro { color: #991b1b; margin-bottom: 1.5rem; font-weight: bold; font-size: 0.9rem; background: #fef2f2; padding: 0.75rem; border-radius: 6px; border: 1px solid #fca5a5; }
</style>