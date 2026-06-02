<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue';
import SidebarComponent from '../components/SidebarComponent.vue';
import api from '../services/api';

// Estados Reativos do Componente
const funcionarios = ref<any[]>([]);
const afastamentos = ref<any[]>([]);
const carregando = ref(false);
const erroGeral = ref('');

// Controle do Modal de Edição
const modalEdicao = reactive({
  aberto: false,
  carregando: false,
  id: '',
  usuarioNome: '',
  tipo: 'FERIAS',
  dataInicio: '',
  dataFim: '',
  justificativa: '',
  erro: ''
});

// Formulário de Cadastro Inicial
const novoAfastamento = reactive({
  usuarioId: '',
  tipo: 'FERIAS',
  dataInicio: '',
  dataFim: '',
  justificativa: ''
});

// 🔄 BUSCAR DADOS DA API (CORRIGIDO)
const carregarDados = async () => {
  carregando.value = true;
  erroGeral.value = '';
  try {
    // Busca dados em paralelo das duas rotas
    const [resFuncionarios, resAfastamentos] = await Promise.all([
      api.get('/usuarios'),
      api.get('/afastamentos')
    ]);
    
    // Debug no console para você enxergar exatamente o que está vindo da API
    console.log('Resposta Usuários:', resFuncionarios.data);
    console.log('Resposta Afastamentos:', resAfastamentos.data);

    // 🔒 GARANTIA DE ARRAY: Valida se o retorno é um array antes de filtrar
    const listaUsuarios = Array.isArray(resFuncionarios.data) 
      ? resFuncionarios.data 
      : resFuncionarios.data?.usuarios || [];

    // Filtra garantindo que o perfil bata com o ENUM em letras maiúsculas 'FUNCIONARIO'
    funcionarios.value = listaUsuarios.filter(
      (u: any) => u.perfil === 'FUNCIONARIO' || u.perfil === 'funcionario'
    );
    
    afastamentos.value = Array.isArray(resAfastamentos.data) ? resAfastamentos.data : [];
    
  } catch (error: any) {
    console.error('Erro ao carregar dados de afastamento:', error);
    erroGeral.value = 'Falha ao conectar com o servidor para carregar os colaboradores.';
  } finally {
    carregando.value = false;
  }
};

// 🟢 SALVAR LANÇAMENTO (POST)
const cadastrarAfastamento = async () => {
  if (!novoAfastamento.usuarioId || !novoAfastamento.dataInicio || !novoAfastamento.dataFim || !novoAfastamento.justificativa) {
    alert('Por favor, preencha todos os campos do formulário.');
    return;
  }
  if (novoAfastamento.justificativa.trim().length < 10) {
    alert('A justificativa deve possuir no mínimo 10 caracteres para fins de auditoria.');
    return;
  }

  try {
    await api.post('/afastamentos', novoAfastamento);
    alert('Afastamento/Férias lançado com sucesso!');
    
    // Limpa o formulário
    novoAfastamento.usuarioId = '';
    novoAfastamento.tipo = 'FERIAS';
    novoAfastamento.dataInicio = '';
    novoAfastamento.dataFim = '';
    novoAfastamento.justificativa = '';
    
    await carregarDados();
  } catch (error: any) {
    alert(error.response?.data?.erro || 'Erro ao salvar o afastamento.');
  }
};

// 🟡 ABRIR MODAL DE EDIÇÃO (PREENCHE OS CAMPOS)
const abrirEdicao = (item: any) => {
  modalEdicao.id = item.id;
  modalEdicao.usuarioNome = item.usuario.nome;
  modalEdicao.tipo = item.tipo;
  // Trata a string ISO do banco (YYYY-MM-DD) para preencher os inputs de data do HTML
  modalEdicao.dataInicio = item.dataInicio.split('T')[0];
  modalEdicao.dataFim = item.dataFim.split('T')[0];
  modalEdicao.justificativa = item.justificativa;
  modalEdicao.erro = '';
  modalEdicao.aberto = true;
};

// 🟡 GRAVAR ALTERAÇÃO (PUT)
const salvarAlteracao = async () => {
  if (modalEdicao.justificativa.trim().length < 10) {
    modalEdicao.erro = 'A justificativa de alteração precisa ter no mínimo 10 caracteres.';
    return;
  }
  
  modalEdicao.carregando = true;
  modalEdicao.erro = '';

  try {
    await api.put(`/afastamentos/${modalEdicao.id}`, {
      tipo: modalEdicao.tipo,
      dataInicio: modalEdicao.dataInicio,
      dataFim: modalEdicao.dataFim,
      justificativa: modalEdicao.justificativa
    });

    modalEdicao.aberto = false;
    await carregarDados();
    alert('Registro retificado com sucesso!');
  } catch (error: any) {
    modalEdicao.erro = error.response?.data?.erro || 'Erro ao atualizar dados.';
  } finally {
    modalEdicao.carregando = false;
  }
};

// 🔴 DELETAR/ESTORNAR REGISTRO (DELETE)
const excluirAfastamento = async (id: string) => {
  if (!confirm('Tem certeza que deseja estornar este afastamento? O período voltará a computar faltas normais caso o funcionário não bata o ponto.')) {
    return;
  }

  try {
    await api.delete(`/afastamentos/${id}`);
    alert('Período de afastamento removido do sistema.');
    await carregarDados();
  } catch (error: any) {
    alert(error.response?.data?.erro || 'Erro ao remover afastamento.');
  }
};

// Formatação auxiliar de data para visualização BR
const formatarDataBR = (dataIso: string) => {
  if (!dataIso) return '';
  const [ano, mes, dia] = dataIso.split('T')[0].split('-');
  return `${dia}/${mes}/${ano}`;
};

onMounted(carregarDados);
</script>

<template>
  <div class="layout">
    <SidebarComponent />
    <main class="content">
      <h2>🏝️ Gestão de Férias e Afastamentos</h2>
      <p>Lance e gerencie períodos de licenças, atestados e férias para suspension temporária do controle de ponto.</p>

      <p v-if="erroGeral" class="msg-erro" style="margin-bottom: 1.5rem;">{{ erroGeral }}</p>

      <div class="cadastro-card">
        <h3>Novo Lançamento de Ausência</h3>
        <form @submit.prevent="cadastrarAfastamento" class="form-grid">
          <div class="input-group">
            <label>Funcionário Colaborador</label>
            <select v-model="novoAfastamento.usuarioId" required>
              <option value="" disabled selected>Selecione o funcionário...</option>
              <option v-for="f in funcionarios" :key="f.id" :value="f.id">{{ f.nome }}</option>
            </select>
          </div>

          <div class="input-group">
            <label>Tipo de Ocorrência Legal</label>
            <select v-model="novoAfastamento.tipo" required>
              <option value="FERIAS">Férias Regulamentares</option>
              <option value="ATESTADO_MEDICO">Atestado Médico (MTE/CID)</option>
              <option value="LICENCA_MATERNIDADE">Licença Maternidade</option>
              <option value="LICENCA_PATERNIDADE">Licença Paternidade</option>
              <option value="AFASTAMENTO_INSS">Afastamento por Auxílio-Doença (INSS)</option>
              <option value="OUTROS">Outras Licenças / Abonos Justificados</option>
            </select>
          </div>

          <div class="input-group">
            <label>Data de Início</label>
            <input type="date" v-model="novoAfastamento.dataInicio" required />
          </div>

          <div class="input-group">
            <label>Data de Término (Inclusive)</label>
            <input type="date" v-model="novoAfastamento.dataFim" required />
          </div>

          <div class="input-group full-width">
            <label>Justificativa Legal / Observações de Auditoria</label>
            <textarea 
              v-model="novoAfastamento.justificativa" 
              rows="2" 
              placeholder="Descreva o motivo detalhado ou anote informações legais importantes (Ex: Protocolo de atestado nº...)" 
              required
            ></textarea>
            <span class="subtext">Mínimo de 10 caracteres. Fica registrado permanentemente no log de auditoria.</span>
          </div>

          <div class="form-btn-container full-width">
            <button type="submit" class="btn-salvar-formulario" :disabled="carregando">
              {{ carregando ? 'Processando...' : 'Lançar Afastamento' }}
            </button>
          </div>
        </form>
      </div>

      <div class="table-container">
        <h3>Histórico de Ausências e Férias Ativas</h3>
        <table v-if="afastamentos.length > 0">
          <thead>
            <tr>
              <th>Funcionário</th>
              <th>Tipo</th>
              <th>Data Início</th>
              <th>Data Fim</th>
              <th>Motivo / Justificativa</th>
              <th style="text-align: center;">Ações</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in afastamentos" :key="item.id">
              <td><strong>{{ item.usuario.nome }}</strong></td>
              <td>
                <span :class="['tag-tipo', item.tipo.toLowerCase()]">
                  {{ item.tipo.replace('_', ' ') }}
                </span>
              </td>
              <td>{{ formatarDataBR(item.dataInicio) }}</td>
              <td>{{ formatarDataBR(item.dataFim) }}</td>
              <td><p class="txt-justificativa" :title="item.justificativa">{{ item.justificativa }}</p></td>
              <td>
                <div class="acoes-container">
                  <button @click="abrirEdicao(item)" class="btn-tbl-editar" title="Editar período ou dados">✏️ Editar</button>
                  <button @click="excluirAfastamento(item.id)" class="btn-tbl-deletar" title="Estornar/Remover afastamento">🗑️ Estornar</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-else class="sem-dados">
          <p>Nenhum período de férias ou afastamento ativo cadastrado no sistema atualmente.</p>
        </div>
      </div>

      <div v-if="modalEdicao.aberto" class="modal-backdrop">
        <div class="modal-card">
          <h3>Retificar Registro de Ausência</h3>
          <p class="modal-sub">Alterando dados de: <strong>{{ modalEdicao.usuarioNome }}</strong></p>

          <div class="modal-corpo-scroll">
            <div class="modal-inputs">
              <div class="input-group">
                <label>Tipo de Ocorrência</label>
                <select v-model="modalEdicao.tipo">
                  <option value="FERIAS">Férias Regulamentares</option>
                  <option value="ATESTADO_MEDICO">Atestado Médico (MTE/CID)</option>
                  <option value="LICENCA_MATERNIDADE">Licença Maternidade</option>
                  <option value="LICENCA_PATERNIDADE">Licença Paternidade</option>
                  <option value="AFASTAMENTO_INSS">Afastamento por Auxílio-Doença (INSS)</option>
                  <option value="OUTROS">Outras Licenças / Abonos Justificados</option>
                </select>
              </div>

              <div class="input-group">
                <label>Nova Data de Início</label>
                <input type="date" v-model="modalEdicao.dataInicio" />
              </div>

              <div class="input-group">
                <label>Nova Data de Término</label>
                <input type="date" v-model="modalEdicao.dataFim" />
              </div>

              <div class="input-group">
                <label>Motivo da Alteração / Justificativa</label>
                <textarea v-model="modalEdicao.justificativa" rows="3"></textarea>
              </div>

              <p v-if="modalEdicao.erro" class="msg-erro">{{ modalEdicao.erro }}</p>
            </div>
          </div>

          <div class="modal-acoes">
            <button @click="modalEdicao.aberto = false" class="btn-cancelar" :disabled="modalEdicao.carregando">Cancelar</button>
            <button @click="salvarAlteracao" class="btn-salvar-modal" :disabled="modalEdicao.carregando">
              {{ modalEdicao.carregando ? 'Salvando...' : 'Gravar Alterações' }}
            </button>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.layout { display: flex; min-height: 100vh; background-color: #f8fafc; }
.content { padding: 2rem; flex: 1; font-family: sans-serif; box-sizing: border-box; }
h2 { color: #0f172a; margin: 0; }
h3 { margin: 0 0 1rem 0; color: #1e293b; font-size: 1.1rem; border-bottom: 1px solid #f1f5f9; padding-bottom: 0.5rem; }
p { color: #64748b; margin: 0.25rem 0 1.5rem 0; }

/* CARD FORMULÁRIO */
.cadastro-card { background: white; padding: 1.5rem; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); margin-bottom: 1.5rem; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; }
.input-group { display: flex; flex-direction: column; gap: 0.4rem; }
.input-group label { font-size: 0.85rem; font-weight: 600; color: #475569; }
.input-group select, .input-group input, .input-group textarea {
  padding: 0.5rem 0.75rem; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 0.9rem; background: white; outline: none;
}
.input-group select:focus, .input-group input:focus, .input-group textarea:focus { border-color: #3b82f6; }
.full-width { grid-column: span 2; }
.subtext { font-size: 0.75rem; color: #94a3b8; }

.form-btn-container { display: flex; justify-content: flex-end; }
.btn-salvar-formulario { background-color: #2563eb; color: white; border: none; padding: 0.6rem 1.5rem; border-radius: 6px; font-weight: bold; cursor: pointer; transition: background 0.2s; }
.btn-salvar-formulario:hover { background-color: #1d4ed8; }

/* TABELA DE LISTAGEM */
.table-container { background: white; padding: 1.5rem; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
table { width: 100%; border-collapse: collapse; text-align: left; }
th, td { padding: 0.85rem; border-bottom: 1px solid #e2e8f0; font-size: 0.9rem; vertical-align: middle; }
th { background-color: #f8fafc; color: #475569; font-weight: 600; }
.txt-justificativa { margin: 0; max-width: 250px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: #64748b; }

/* TAGS DOS TIPOS */
.tag-tipo { font-size: 0.75rem; font-weight: bold; padding: 0.2rem 0.5rem; border-radius: 4px; text-transform: uppercase; display: inline-block; }
.tag-tipo.ferias { background-color: #ecfdf5; color: #065f46; }
.tag-tipo.atestado_medico { background-color: #fef2f2; color: #991b1b; }
.tag-tipo.licenca_maternidade, .tag-tipo.licenca_paternidade { background-color: #f5f3ff; color: #5b21b6; }
.tag-tipo.afastamento_inss { background-color: #fff7ed; color: #9a3412; }
.tag-tipo.outros { background-color: #f1f5f9; color: #475569; }

/* BOTÕES DA TABELA */
.acoes-container { display: flex; gap: 0.5rem; }
.btn-tbl-editar { background: #f1f5f9; border: 1px solid #cbd5e1; color: #334155; padding: 0.35rem 0.6rem; border-radius: 4px; font-size: 0.8rem; cursor: pointer; }
.btn-tbl-editar:hover { background: #e2e8f0; }
.btn-tbl-deletar { background: #fff5f5; border: 1px solid #fecaca; color: #c53030; padding: 0.35rem 0.6rem; border-radius: 4px; font-size: 0.8rem; cursor: pointer; }
.btn-tbl-deletar:hover { background: #fee2e2; }

.sem-dados { text-align: center; padding: 2rem; color: #94a3b8; font-size: 0.95rem; }
.msg-erro { background: #fef2f2; color: #991b1b; padding: 0.6rem; border-radius: 6px; font-size: 0.85rem; font-weight: 500; }

/* ─── ENGENHARIA DO MODAL CONTRA ESTOUROS VERTICAIS ─── */
.modal-backdrop { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 200; padding: 1rem; box-sizing: border-box; }

.modal-card { 
  background: white; 
  padding: 1.5rem; 
  border-radius: 8px; 
  width: 100%; 
  max-width: 440px; 
  box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); 
  
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  min-height: 0;
  box-sizing: border-box;
}

.modal-sub { font-size: 0.9rem; color: #475569; margin: -0.5rem 0 1.25rem 0; flex-shrink: 0; }
.modal-card h3 { flex-shrink: 0; margin-top: 0; }

.modal-corpo-scroll {
  flex: 1;
  overflow-y: auto;
  padding-right: 0.4rem;
  margin-bottom: 1rem;
  box-sizing: border-box;
}
.modal-corpo-scroll::-webkit-scrollbar { width: 5px; }
.modal-corpo-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }

.modal-inputs { display: flex; flex-direction: column; gap: 1rem; }

.modal-acoes { 
  display: flex; 
  justify-content: flex-end; 
  gap: 0.5rem; 
  margin-top: auto; 
  flex-shrink: 0;
  background: white;
  padding-top: 0.75rem;
  border-top: 1px solid #e2e8f0;
}
.btn-cancelar { padding: 0.5rem 1rem; border: 1px solid #d1d5db; background: white; border-radius: 6px; font-size: 0.85rem; color: #374151; cursor: pointer; }
.btn-salvar-modal { padding: 0.5rem 1rem; border: none; background: #2563eb; color: white; border-radius: 6px; font-size: 0.85rem; font-weight: 500; cursor: pointer; }
.btn-salvar-modal:hover { background: #1d4ed8; }
</style>