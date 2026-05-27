<script setup lang="ts">
import { ref, onMounted, watch, reactive } from 'vue';
import SidebarComponent from '../components/SidebarComponent.vue';
import api from '../services/api.ts';

const logs = ref<any[]>([]);
const carregando = ref(false);
const erroConexao = ref(false);

const paginaAtual = ref(1);
const totalDePaginas = ref(1);
const totalRegistros = ref(0);
const limitePorPagina = ref(20);

const filtros = reactive({
  busca: '',
  dataInicio: '',
  dataFim: ''
});

const inicializarDatas = () => {
  const fim = new Date();
  const inicio = new Date();
  inicio.setDate(inicio.getDate() - 7);

  filtros.dataInicio = inicio.toISOString().split('T')[0];
  filtros.dataFim = fim.toISOString().split('T')[0];
};

const carregarLogsDaAuditoria = async () => {
  carregando.value = true;
  erroConexao.value = false;

  try {
    const res = await api.get('/auditoria/logs', {
      params: {
        pagina: paginaAtual.value,
        limite: limitePorPagina.value,
        busca: filtros.busca || undefined,
        dataInicio: filtros.dataInicio || undefined,
        dataFim: filtros.dataFim || undefined
      }
    });

    // Mapeamento dos metadados e da lista devolvidos pelo transaction do Prisma
    logs.value = res.data.logs || [];
    totalDePaginas.value = res.data.paginasTotais || 1;
    totalRegistros.value = res.data.total || 0;

  } catch (error) {
    console.error('Erro ao buscar logs de auditoria:', error);
    erroConexao.value = true;
    logs.value = [];
  } finally {
    carregando.value = false;
  }
};

const aplicarNovosFiltros = () => {
  paginaAtual.value = 1;
  carregarLogsDaAuditoria();
};

const mudarDePagina = (direcao: number) => {
  const novaPagina = paginaAtual.value + direcao;
  if (novaPagina >= 1 && novaPagina <= totalDePaginas.value) {
    paginaAtual.value = novaPagina;
    carregarLogsDaAuditoria();
  }
};

const formatarDataHora = (dataBruta: string) => {
  if (!dataBruta) return '-';
  // Formata de YYYY-MM-DDTHH:mm:ss para DD/MM/YYYY HH:mm:ss
  const data = new Date(dataBruta);
  return data.toLocaleString('pt-BR');
};

// Vincula classes CSS do seu padrão de status para as ações identificadas
const getStatusClass = (acao: string) => {
  if (!acao) return 'padrao';
  const acaoMin = acao.toLowerCase();
  if (acaoMin.includes('criar') || acaoMin.includes('salvar') || acaoMin.includes('ponto')) return 'regular';
  if (acaoMin.includes('editar') || acaoMin.includes('atualizar') || acaoMin.includes('configurar')) return 'trabalho-em-folga';
  if (acaoMin.includes('deletar') || acaoMin.includes('remover') || acaoMin.includes('excluir') || acaoMin.includes('falhou')) return 'falta';
  return 'atraso';
};

// Monitora o input de busca geral para atualizar sem precisar clicar em enter
watch(() => filtros.busca, () => {
  aplicarNovosFiltros();
});

onMounted(async () => {
  inicializarDatas();
  await carregarLogsDaAuditoria();
});
</script>

<template>
  <div class="layout">
    <SidebarComponent />
    <main class="content">
      <h2>Painel de Auditoria</h2>

      <div class="filtros-grid">
        <div class="campo-filtro">
          <label>Pesquisa Geral</label>
          <input 
            v-model="filtros.busca"
            type="text" 
            placeholder="Usuário, ação ou detalhes..." 
            class="input-busca"
          />
        </div>
        <div class="campo-filtro">
          <label>Data Inicial</label>
          <input v-model="filtros.dataInicio" type="date" class="input-data" @change="aplicarNovosFiltros" />
        </div>
        <div class="campo-filtro">
          <label>Data Final</label>
          <input v-model="filtros.dataFim" type="date" class="input-data" @change="aplicarNovosFiltros" />
        </div>
      </div>

      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Data / Hora</th>
              <th>Usuário da Ação</th>
              <th>Ação</th>
              <th>Detalhes da Operação</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="carregando">
              <td colspan="4" class="estado-tabela">⏳ Carregando logs de auditoria...</td>
            </tr>

            <tr v-else-if="erroConexao">
              <td colspan="4" class="estado-tabela erro">❌ Erro de conexão ao buscar os registros na nuvem.</td>
            </tr>

            <tr v-else-if="logs.length === 0">
              <td colspan="4" class="estado-tabela">Nenhum log de auditoria encontrado para este período.</td>
            </tr>

            <tr v-else v-for="log in logs" :key="log.id">
              <td class="col-data">{{ formatarDataHora(log.dataHora) }}</td>
              <td>
                <div class="operador-info">
                  <strong>{{ log.usuarioAcao?.nome ?? 'Sistema / Automático' }}</strong>
                  <span class="cpf-sub">{{ log.usuarioAcao?.cpf ?? 'Operação interna' }}</span>
                </div>
              </td>
              <td>
                <span :class="['status-txt', getStatusClass(log.acao)]">
                  {{ log.acao ?? 'AÇÃO INDEFINIDA' }}
                </span>
              </td>
              <td class="col-detalhes">{{ log.detalhes ?? 'Nenhum detalhe adicional informado.' }}</td>
            </tr>
          </tbody>
        </table>

        <div class="paginacao-footer">
          <span class="contador">Total de {{ totalRegistros }} registros encontrados</span>
          <div class="controles-paginacao">
            <button 
              :disabled="paginaAtual <= 1 || carregando" 
              @click="mudarDePagina(-1)"
              class="btn-pag"
            >
              Anterior
            </button>
            <span class="indicador-pag">Página {{ paginaAtual }} de {{ totalDePaginas }}</span>
            <button 
              :disabled="paginaAtual >= totalDePaginas || carregando" 
              @click="mudarDePagina(1)"
              class="btn-pag"
            >
              Próxima
            </button>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
/* Aproveita 100% dos seletores globais e estilos herdados do seu RelatoriosView.vue */
.layout { display: flex; min-height: 100vh; }
.content { margin-left: 250px; padding: 2rem; flex: 1; font-family: sans-serif; background-color: #f1f5f9; }
h2 { color: #1f2937; margin-top: 0; margin-bottom: 2rem; }

/* Estrutura de Filtros Grid Organizada para Inputs Diferenciados */
.filtros-grid { display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 1rem; margin-bottom: 2rem; background: white; padding: 1rem; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
.campo-filtro { display: flex; flex-direction: column; gap: 0.4rem; }
.campo-filtro label { font-size: 0.8rem; font-weight: bold; color: #4b5563; text-transform: uppercase; }

input { padding: 0.5rem; border-radius: 6px; border: 1px solid #d1d5db; font-size: 0.95rem; background: white; width: 100%; box-sizing: border-box; }
input:focus { outline: none; border-color: #1e3a8a; }

.table-container { background: white; padding: 1.5rem; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
table { width: 100%; border-collapse: collapse; text-align: left; table-layout: fixed; }
th, td { padding: 0.75rem; border-bottom: 1px solid #e5e7eb; font-size: 0.9rem; vertical-align: top; }
th { background-color: #f9fafb; color: #374151; font-weight: bold; }

/* Formatação Específica para Colunas Densas */
.col-data { width: 160px; font-family: monospace; color: #6b7280; }
.col-detalhes { font-family: monospace; font-size: 0.85rem; color: #4b5563; word-wrap: break-word; white-space: pre-line; }

.operador-info { display: flex; flex-direction: column; }
.cpf-sub { font-size: 0.75rem; color: #9ca3af; font-family: monospace; margin-top: 2px; }
.estado-tabela { text-align: center; padding: 3rem; color: #6b7280; font-size: 0.95rem; }
.estado-tabela.erro { color: #dc2626; font-weight: bold; }

/* Estilização Reaproveitada das Suas Cores de Badges de Status */
.status-txt { display: inline-block; padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: bold; text-transform: uppercase; border: 1px solid transparent; }
.status-txt.falta { color: #dc2626; background: #fef2f2; border-color: #fca5a5; }
.status-txt.regular { color: #10b981; background: #f0fdf4; border-color: #86efac; }
.status-txt.atraso { color: #d97706; background: #fffbeb; border-color: #fde68a; }
.status-txt.trabalho-em-folga { color: #2563eb; background: #eff6ff; border-color: #bfdbfe; }
.status-txt.padrao { color: #4b5563; background: #f3f4f6; border-color: #e5e7eb; }

/* Rodapé e Estilos de Paginação Web */
.paginacao-footer { display: flex; justify-content: space-between; items-center; margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid #e5e7eb; }
.contador { font-size: 0.85rem; color: #6b7280; font-weight: 500; }
.controles-paginacao { display: flex; items-center; gap: 0.75rem; }
.indicador-pag { font-size: 0.85rem; font-weight: bold; color: #374151; background: #f3f4f6; padding: 0.35rem 0.75rem; border-radius: 6px; }
.btn-pag { padding: 0.35rem 0.75rem; border: 1px solid #d1d5db; background: white; border-radius: 6px; font-size: 0.85rem; font-weight: bold; color: #4b5563; cursor: pointer; transition: all 0.1s ease; }
.btn-pag:hover:not(:disabled) { background: #f9fafb; border-color: #9ca3af; color: #111827; }
.btn-pag:disabled { opacity: 0.4; cursor: not-allowed; }
</style>