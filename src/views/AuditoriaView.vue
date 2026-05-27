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
    const res = await api.get('/auditoria', {
      params: {
        pagina: paginaAtual.value,
        limite: limitePorPagina.value,
        busca: filtros.busca || undefined,
        dataInicio: filtros.dataInicio || undefined,
        dataFim: filtros.dataFim || undefined
      }
    });

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
  const data = new Date(dataBruta);
  return data.toLocaleString('pt-BR');
};

const getStatusClass = (acao: string) => {
  if (!acao) return 'padrao';
  const acaoMin = acao.toLowerCase();
  if (acaoMin.includes('criar') || acaoMin.includes('salvar') || acaoMin.includes('ponto') || acaoMin.includes('create')) return 'regular';
  if (acaoMin.includes('editar') || acaoMin.includes('atualizar') || acaoMin.includes('configurar') || acaoMin.includes('update')) return 'trabalho-em-folga';
  if (acaoMin.includes('deletar') || acaoMin.includes('remover') || acaoMin.includes('excluir') || acaoMin.includes('falhou') || acaoMin.includes('delete')) return 'falta';
  return 'atraso';
};

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
                  <strong>{{ log.usuarioAcao?.nome ?? 'Sistema / Totem' }}</strong>
                  <span class="cpf-sub">{{ log.usuarioAcao?.cpf ?? 'Operação Pública' }}</span>
                </div>
              </td>
              <td>
                <span :class="['status-txt', getStatusClass(log.acao)]">
                  {{ log.acao ?? 'AÇÃO INDEFINIDA' }}
                </span>
              </td>
              
              <td class="col-detalhes">
                <div v-if="log.entidade === 'Horario'">
                  <span v-if="log.acao === 'CREATE'">
                    ⏱️ <strong>Nova jornada:</strong> Criou a jornada "{{ log.dadosNovos?.descricao }}".
                  </span>
                  <span v-else-if="log.acao === 'UPDATE'">
                    🔄 <strong>Jornada modificada:</strong> Alterou parâmetros da jornada "{{ log.dadosNovos?.descricao }}".
                  </span>
                  <span v-else>
                    {{ log.detalhes }}
                  </span> </div>

                <div v-else-if="log.entidade === 'BatidaPonto'">
                  <span v-if="log.acao === 'CREATE'">
                    📱 <strong>Ponto Registrado:</strong> Colaborador realizou uma batida válida via Totem.
                    <span class="coordenadas-bloco">
                      📍 Coordenadas: {{ log.dadosNovos?.latitude }}, {{ log.dadosNovos?.longitude }}
                    </span>
                  </span>
                  <span v-else>
                    {{ log.detalhes }}
                  </span>
                </div>

                <div v-else>
                  {{ log.detalhes ?? 'Nenhum detalhe adicional informado.' }}
                </div>
              </td>
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
  .layout { display: flex; min-height: 100vh; }
  .content { margin-left: 250px; padding: 2rem; flex: 1; font-family: sans-serif; background-color: #f1f5f9; }
  h2 { color: #1f2937; margin-top: 0; margin-bottom: 2rem; }

  .filtros-grid { display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 1rem; margin-bottom: 2rem; background: white; padding: 1rem; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
  .campo-filtro { display: flex; flex-direction: column; gap: 0.4rem; }
  .campo-filtro label { font-size: 0.8rem; font-weight: bold; color: #4b5563; text-transform: uppercase; }
</style>