<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue';
import SidebarComponent from '../components/SidebarComponent.vue';
import api from '../services/api';

interface Filial {
  id: string;
  nome: string;
  cnpj: string;
  createdAt: string;
}

// Estados Reativos
const filiais = ref<Filial[]>([]);
const carregando = ref(false);
const erroGeral = ref('');
const mensagemSucesso = ref('');

// Controle do Modal (Inclusão / Edição)
const modal = reactive({
  aberto: false,
  carregando: false,
  id: null as string | null,
  nome: '',
  cnpj: '',
  erro: ''
});

const carregarFiliais = async () => {
  carregando.value = true;
  erroGeral.value = '';
  try {
    const res = await api.get('/filiais');
    filiais.value = Array.isArray(res.data) ? res.data : [];
  } catch (err: any) {
    console.error(err);
    erroGeral.value = err.response?.data?.erro || 'Falha ao carregar a lista de filiais.';
  } finally {
    carregando.value = false;
  }
};

const abrirFormulario = (item: Filial | null = null) => {
  modal.erro = '';
  mensagemSucesso.value = '';
  if (item) {
    modal.id = item.id;
    modal.nome = item.nome;
    modal.cnpj = item.cnpj;
  } else {
    modal.id = null;
    modal.nome = '';
    modal.cnpj = '';
  }
  modal.aberto = true;
};

const fecharFormulario = () => {
  modal.aberto = false;
  modal.id = null;
  modal.nome = '';
  modal.cnpj = '';
  modal.erro = '';
};

const salvarFilial = async () => {
  modal.erro = '';
  if (!modal.nome.trim() || !modal.cnpj.trim()) {
    modal.erro = 'Nome e CNPJ são campos de preenchimento obrigatório.';
    return;
  }

  modal.carregando = true;
  const payload = {
    nome: modal.nome,
    cnpj: modal.cnpj
  };

  try {
    if (modal.id) {
      await api.put(`/filiais/${modal.id}`, payload);
      mensagemSucesso.value = 'Filial atualizada com sucesso!';
    } else {
      await api.post('/filiais', payload);
      mensagemSucesso.value = 'Nova filial cadastrada com sucesso!';
    }
    fecharFormulario();
    await carregarFiliais();
  } catch (err: any) {
    modal.erro = err.response?.data?.erro || 'Erro ao processar requisição da filial.';
  } finally {
    modal.carregando = false;
  }
};

const deletarFilial = async (id: string) => {
  if (!confirm('Atenção: Remover esta filial excluirá em cascata os setores e colaboradores vinculados a ela. Deseja prosseguir?')) return;
  mensagemSucesso.value = '';
  erroGeral.value = '';

  try {
    await api.delete(`/filiais/${id}`);
    mensagemSucesso.value = 'Filial removida do sistema com sucesso.';
    await carregarFiliais();
  } catch (err: any) {
    erroGeral.value = err.response?.data?.erro || 'Não foi possível excluir a filial selecionada.';
  }
};

onMounted(carregarFiliais);
</script>

<template>
  <div class="dashboard-layout">
    <SidebarComponent />

    <main class="content-area">
      <header class="content-header">
        <h2>Unidades e Filiais Corporativas</h2>
        <button class="btn-primary" @click="abrirFormulario(null)">+ Nova Filial</button>
      </header>

      <p v-if="mensagemSucesso" class="sucesso">✅ {{ mensagemSucesso }}</p>
      <p v-if="erroGeral" class="erro">⚠️ {{ erroGeral }}</p>

      <div v-if="modal.aberto" class="modal-overlay">
        <div class="modal-card">
          <h3>{{ modal.id ? 'Editar Dados da Filial' : 'Cadastrar Nova Unidade / Filial' }}</h3>

          <div class="form-group">
            <label>Razão Social / Nome da Filial *</label>
            <input type="text" v-model="modal.nome" placeholder="Ex: Filial São Paulo ou Matriz Rio" />
          </div>

          <div class="form-group">
            <label>CNPJ da Unidade *</label>
            <input type="text" v-model="modal.cnpj" placeholder="Ex: 00.000.000/0002-00" />
          </div>

          <p v-if="modal.erro" class="erro" style="margin-top: 0.5rem; font-size: 0.85rem;">{{ modal.erro }}</p>

          <div class="form-actions">
            <button class="btn-cancel" @click="fecharFormulario" :disabled="modal.carregando">Cancelar</button>
            <button class="btn-primary" @click="salvarFilial" :disabled="modal.carregando">
              {{ modal.carregando ? 'Gravando...' : 'Salvar Unidade' }}
            </button>
          </div>
        </div>
      </div>

      <div class="table-container">
        <h3>Lista de Filiais Ativas</h3>
        
        <div v-if="carregando" class="sem-dados">⏳ Carregando filiais corporativas...</div>
        <div v-else-if="filiais.length === 0" class="sem-dados">Nenhuma filial cadastrada para esta organização.</div>
        
        <table v-else>
          <thead>
            <tr>
              <th>Identificador / Nome da Unidade</th>
              <th>CNPJ Vinculado</th>
              <th style="text-align: center; width: 12%;">Ações Estruturais</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in filiais" :key="item.id">
              <td><strong>{{ item.nome }}</strong></td>
              <td><span class="txt-cnpj">{{ item.cnpj }}</span></td>
              <td>
                <div class="acoes-row">
                  <button class="btn-edit" @click="abrirFormulario(item)" title="Editar Dados da Filial">✏️</button>
                  <button class="btn-delete" @click="deletarFilial(item.id)" title="Remover Unidade e Vínculos">🗑️</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </main>
  </div>
</template>

<style scoped>
.dashboard-layout { display: flex; min-height: 100vh; background-color: #f8fafc; font-family: sans-serif; width: 100%; }
.content-area { flex: 1; padding: 2rem; min-width: 0; box-sizing: border-box; }
.content-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
.content-header h2 { margin: 0; color: #0f172a; font-size: 1.6rem; font-weight: 700; }

.modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.4); display: flex; justify-content: center; align-items: center; z-index: 999; }
.modal-card { background: white; padding: 2rem; border-radius: 8px; width: 100%; max-width: 440px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); }
.modal-card h3 { margin-top: 0; color: #1e293b; margin-bottom: 1.5rem; font-size: 1.2rem; font-weight: 600; border-bottom: 1px solid #f1f5f9; padding-bottom: 0.5rem; }

.form-group { display: flex; flex-direction: column; margin-bottom: 1.25rem; }
.form-group label { font-size: 0.85rem; font-weight: 600; color: #475569; margin-bottom: 0.4rem; }
.form-group input { padding: 0.55rem 0.75rem; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 0.95rem; background: white; outline: none; box-sizing: border-box; width: 100%; }
.form-group input:focus { border-color: #2563eb; }

.form-actions { display: flex; gap: 0.5rem; justify-content: flex-end; margin-top: 1.5rem; }
.btn-primary { background: #2563eb; color: white; cursor: pointer; font-weight: bold; border: none; padding: 0.6rem 1.5rem; border-radius: 6px; font-size: 0.9rem; transition: background 0.2s; }
.btn-primary:hover { background: #1d4ed8; }
.btn-cancel { background: #64748b; color: white; cursor: pointer; border: none; padding: 0.6rem 1.25rem; border-radius: 6px; font-weight: 500; font-size: 0.9rem; transition: background 0.2s; }
.btn-cancel:hover { background: #475569; }

.table-container { background: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); padding: 1.5rem; overflow-x: auto; margin-top: 1rem; border: 1px solid #e2e8f0; }
.table-container h3 { font-size: 1.1rem; color: #1e293b; font-weight: 600; margin: 0 0 1.25rem 0; }
table { width: 100%; border-collapse: collapse; text-align: left; }
th, td { padding: 0.85rem; border-bottom: 1px solid #e2e8f0; font-size: 0.9rem; vertical-align: middle; }
th { background-color: #f8fafc; color: #475569; font-weight: 600; text-transform: uppercase; font-size: 0.8rem; letter-spacing: 0.05em; }

.txt-cnpj { font-family: monospace; font-size: 0.9rem; color: #475569; font-weight: 500; }
.acoes-row { display: flex; gap: 8px; justify-content: center; align-items: center; }

/* green 🟢 COMPACTAÇÃO DOS BOTÕES COM FORMATO QUADRADO PERFEITO */
.btn-edit { 
  background: #f1f5f9; 
  border: 1px solid #cbd5e1; 
  padding: 0.4rem; 
  border-radius: 6px; 
  cursor: pointer; 
  font-size: 1rem; 
  color: #334155; 
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  transition: all 0.1s ease;
}
.btn-edit:hover { background: #e2e8f0; border-color: #94a3b8; }

.btn-delete { 
  background: #fff5f5; 
  border: 1px solid #fca5a5; 
  padding: 0.4rem; 
  border-radius: 6px; 
  cursor: pointer; 
  font-size: 1rem; 
  color: #dc2626; 
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  transition: all 0.1s ease;
}
.btn-delete:hover { background: #fee2e2; border-color: #fca5a5; }

.sucesso { color: #065f46; margin-bottom: 1rem; font-weight: bold; font-size: 0.9rem; background: #ecfdf5; padding: 0.6rem; border-radius: 6px; border: 1px solid #bbf7d0; }
.erro { color: #991b1b; margin-bottom: 1rem; font-weight: bold; font-size: 0.9rem; background: #fef2f2; padding: 0.6rem; border-radius: 6px; border: 1px solid #fca5a5; }
.sem-dados { text-align: center; padding: 2.5rem; color: #94a3b8; font-size: 0.95rem; font-style: italic; }
</style>