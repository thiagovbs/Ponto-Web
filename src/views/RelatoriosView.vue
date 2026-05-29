<script setup lang="ts">
import { ref, onMounted, watch, reactive } from 'vue';
import SidebarComponent from '../components/SidebarComponent.vue';
import api from '../services/api';

const funcionarios = ref<any[]>([]);
const funcionarioSelecionado = ref('');
const mesSelecionado = ref(new Date().getMonth() + 1);
const anoSelecionado = ref(new Date().getFullYear());

const resumo = ref<any>(null);
const linhasRelatorio = ref<any[]>([]);

// 🔥 CONTROLADOR DE MODO DO MODAL (EDITAR PONTO EXISTENTE VS INCLUIR NOVO)
const modoModal = ref<'EDITAR' | 'INCLUIR'>('EDITAR');

const modalAjuste = reactive({
  aberto: false,
  carregando: false,
  batidaId: '',
  dataBatida: '',
  novaHora: '',
  justificativa: '',
  erro: ''
});

const buscarFuncionarios = async () => {
  try {
    const res = await api.get('/usuarios');
    funcionarios.value = res.data.filter((u: any) => u.perfil === 'FUNCIONARIO');
    if (funcionarios.value.length > 0) {
      funcionarioSelecionado.value = funcionarios.value[0].id;
    }
  } catch (error) {
    console.error(error);
  }
};

const buscarRelatorio = async () => {
  if (!funcionarioSelecionado.value) return;
  try {
    const res = await api.get(`/relatorios/funcionario/${funcionarioSelecionado.value}`, {
      params: { mes: mesSelecionado.value, ano: anoSelecionado.value }
    });

    console.log("Dados das batidas vindos do servidor:", res.data.relatorioMensal);

    resumo.value = res.data.resumoDashboard;
    linhasRelatorio.value = res.data.relatorioMensal;
  } catch (error) {
    console.error(error);
  }
};

// 🔥 GATILHO DE IMPRESSÃO PROTEGIDO: Passa o token no Header e faz o download seguro do PDF
const imprimirEspelho = async () => {
  if (!funcionarioSelecionado.value) return;
  
  try {
    // 1. Faz a chamada usando a instância do Axios (que já possui o Token no Header interceptor)
    // Definimos o responseType como 'blob' para o Axios saber que vai receber um arquivo binário
    const response = await api.get(`/relatorios/funcionario/${funcionarioSelecionado.value}/imprimir`, {
      params: { 
        mes: mesSelecionado.value, 
        ano: anoSelecionado.value 
      },
      responseType: 'blob' 
    });

    // 2. Cria um link temporário em memória para o arquivo binário recebido
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const urlBlob = window.URL.createObjectURL(blob);
    
    // 3. Cria um elemento <a> invisível para forçar o download com o nome correto
    const linkDownload = document.createElement('a');
    linkDownload.href = urlBlob;
    
    // Define o nome do arquivo que o usuário vai salvar
    const nomeArquivo = `espelho_ponto_${mesSelecionado.value}_${anoSelecionado.value}.pdf`;
    linkDownload.setAttribute('download', nomeArquivo);
    
    // 4. Simula o clique do usuário para abrir a janela de salvar/imprimir do sistema operacional
    document.body.appendChild(linkDownload);
    linkDownload.click();
    
    // 5. Limpa os elementos da memória após o disparo do download
    document.body.removeChild(linkDownload);
    window.URL.revokeObjectURL(urlBlob);

  } catch (error) {
    console.error("Erro ao gerar ou baixar o arquivo PDF protegido:", error);
    alert("Falha ao gerar o PDF de impressão. Verifique suas permissões de administrador.");
  }
};

const abrirModalAjuste = (batida: any, dataDoDia: string) => {
  modoModal.value = 'EDITAR';
  modalAjuste.batidaId = batida.id;
  modalAjuste.dataBatida = dataDoDia;
  modalAjuste.novaHora = batida.hora;
  modalAjuste.justificativa = batida.foiAlterada ? batida.justificativa : '';
  modalAjuste.erro = '';
  modalAjuste.carregando = false;
  modalAjuste.aberto = true;
};

// 🔥 ABRE O MODAL PREPARADO PARA ADICIONAR UM PONTO MANUALMENTE
const abrirModalInclusao = (dataDoDia: string) => {
  modoModal.value = 'INCLUIR';
  modalAjuste.batidaId = '';
  modalAjuste.dataBatida = dataDoDia;
  modalAjuste.novaHora = '08:00'; // Sugestão limpa padrão de início de expediente
  modalAjuste.justificativa = '';
  modalAjuste.erro = '';
  modalAjuste.carregando = false;
  modalAjuste.aberto = true;
};

// 🔥 GRAVA A EDIÇÃO OU CRIAÇÃO DE MARCAÇÃO USANDO O PREFIXO SINGULAR /ponto
const salvarAjustePonto = async () => {
  if (!modalAjuste.justificativa || modalAjuste.justificativa.trim().length < 10) {
    modalAjuste.erro = 'Por favor, insira uma justificativa detalhada (mínimo 10 caracteres).';
    return;
  }

  modalAjuste.carregando = true;
  modalAjuste.erro = '';

  try {
    if (modoModal.value === 'EDITAR') {
      await api.put(`/ponto/ajustar/${modalAjuste.batidaId}`, {
        novaHora: modalAjuste.novaHora,
        novaData: modalAjuste.dataBatida,
        justificativa: modalAjuste.justificativa
      });
    } else {
      await api.post('/ponto/incluir-manual', {
        usuarioId: funcionarioSelecionado.value,
        dataDia: modalAjuste.dataBatida,
        hora: modalAjuste.novaHora,
        justificativa: modalAjuste.justificativa
      });
    }

    modalAjuste.aberto = false;
    await buscarRelatorio();
    alert(modoModal.value === 'EDITAR' ? 'Ajuste gravado com sucesso!' : 'Marcação manual incluída!');
  } catch (error: any) {
    console.error(error);
    modalAjuste.erro = error.response?.data?.erro || 'Erro ao processar alteração de ponto.';
  } finally {
    modalAjuste.carregando = false;
  }
};

// 🔥 MÉTODO PARA CANCELAR/OCULTAR LOGICAMENTE UMA BATIDA SEM FAZER DELETE FÍSICO
const apagarPonto = async () => {
  if (!modalAjuste.justificativa || modalAjuste.justificativa.trim().length < 10) {
    modalAjuste.erro = 'Para apagar ou desconsiderar uma marcação, uma justificativa de no mínimo 10 caracteres é obrigatória.';
    return;
  }

  if (!confirm('Tem certeza que deseja desconsiderar esta marcação de ponto do cálculo de horas do funcionário?')) {
    return;
  }

  modalAjuste.carregando = true;
  modalAjuste.erro = '';

  try {
    await api.post(`/ponto/desconsiderar/${modalAjuste.batidaId}`, {
      justificativa: modalAjuste.justificativa
    });

    modalAjuste.aberto = false;
    await buscarRelatorio();
    alert('Marcação desconsiderada com sucesso!');
  } catch (error: any) {
    console.error(error);
    modalAjuste.erro = error.response?.data?.erro || 'Erro ao desconsiderar ponto.';
  } finally {
    modalAjuste.carregando = false;
  }
};

watch([funcionarioSelecionado, mesSelecionado, anoSelecionado], buscarRelatorio);

onMounted(async () => {
  await buscarFuncionarios();
  buscarRelatorio();
});
</script>

<template>
  <div class="layout">
    <SidebarComponent />
    <main class="content">
      <h2>Espelho de Ponto e Relatórios</h2>
      <p>Consulte e gerencie a folha de pontos mensal e o saldo acumulado do banco de horas.</p>

      <div class="filtros-card">
        <div class="filtro-group">
          <label>Funcionário</label>
          <select v-model="funcionarioSelecionado">
            <option v-for="f in funcionarios" :key="f.id" :value="f.id">{{ f.nome }}</option>
          </select>
        </div>
        <div class="filtro-group">
          <label>Mês</label>
          <select v-model="mesSelecionado">
            <option v-for="m in 12" :key="m" :value="m">
              {{ new Date(2026, m - 1).toLocaleString('pt-BR', { month: 'long' }) }}
            </option>
          </select>
        </div>
        <div class="filtro-group">
          <label>Ano</label>
          <select v-model="anoSelecionado">
            <option :value="2025">2025</option>
            <option :value="2026">2026</option>
          </select>
        </div>
        
        <div class="filtro-group-btn">
          <button 
            @click="imprimirEspelho" 
            class="btn-imprimir" 
            :disabled="!funcionarioSelecionado"
            title="Exportar Folha de Ponto Limpa em PDF para Assinatura"
          >
            <span class="printer-icon">🖨️</span> Imprimir Espelho
          </button>
        </div>
      </div>

      <div v-if="resumo" class="dashboard-resumo">
        <div class="stat-card">
          <h4>Mês de Referência</h4>
          <p class="dado">{{ resumo.mesReferencia }}</p>
        </div>
        <div class="stat-card">
          <h4>Faltas no Mês</h4>
          <p class="dado erro">{{ resumo.totalFaltas }}</p>
        </div>
        <div class="stat-card">
          <h4>Saldo Banco de Horas</h4>
          <p :class="['dado', resumo.saldoBancoHorasMinutos >= 0 ? 'sucesso' : 'erro']">
            {{ resumo.saldoBancoHorasFormatado }}
          </p>
        </div>
      </div>

      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Status do Dia</th>
              <th>Batidas Registradas</th>
              <th>Horas Trabalhadas</th>
              <th>Saldo do Dia</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="linha in linhasRelatorio" :key="linha.data">
              <td>{{ linha.data.split('-').reverse().join('/') }}</td>
              <td><span :class="['status-txt', linha.status.toLowerCase().replace(/\s+/g, '-')]">{{ linha.status }}</span></td>
              <td>
                <div v-if="linha.batidas.length > 0" class="container-batidas">
                  <div 
                    v-for="batida in linha.batidas" 
                    :key="batida.id || batida.hora" 
                    :class="['tag-batida group relative', batida.foiAlterada ? 'alterada' : 'normal']"
                    @click="abrirModalAjuste(batida, linha.data)"
                    :title="batida.foiAlterada ? 'Ponto modificado. Passe o mouse para ver a justificativa.' : 'Clique para ajustar este horário'"
                  >
                    <span>{{ batida.hora }}</span>
                    
                    <span v-if="batida.foiAlterada" class="icon-ajustado">✏️</span>
                    
                    <div v-if="batida.foiAlterada" class="tooltip-justificativa">
                      <p class="font-bold">Original: {{ batida.horaOriginal }}</p>
                      <p class="mt-1 italic">"{{ batida.justificativa }}"</p>
                    </div>

                    <a 
                      v-if="batida.latitude && batida.longitude" 
                      :href="`http://maps.google.com/?q=${batida.latitude},${batida.longitude}`" 
                      target="_blank" 
                      title="Ver localização exata no Google Maps"
                      class="link-mapa"
                      @click.stop
                    >
                      📍
                    </a>
                  </div>
                  
                  <button @click="abrirModalInclusao(linha.data)" class="btn-adicionar-ponto" title="Incluir marcação extra">+</button>
                </div>

                <div v-else class="container-batidas">
                  <button @click="abrirModalInclusao(linha.data)" class="btn-incluir-vazio">
                    ➕ Incluir Ponto Manual
                  </button>
                </div>
              </td>
              <td>{{ linha.horasTrabalhadas }}</td>
              <td :style="{ color: linha.saldoDoDia.startsWith('-') ? '#dc2626' : '#10b981' }">
                {{ linha.saldoDoDia }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="modalAjuste.aberto" class="modal-backdrop">
        <div class="modal-card">
          <h3 class="modal-titulo">
            {{ modoModal === 'EDITAR' ? '📝 Ajustar Registro de Ponto' : '➕ Incluir Marcação Manual' }}
          </h3>
          <p class="modal-aviso">
            Atenção: De acordo com a Portaria 671 do MTE, qualquer alteração ou inclusão manual de ponto fica registrada permanentemente na folha de auditoria para fins fiscais.
          </p>

          <div class="modal-inputs">
            <div>
              <label class="input-label">Data da Ocorrência</label>
              <input type="text" :value="modalAjuste.dataBatida.split('-').reverse().join('/')" disabled class="input-time" style="background-color: #f3f4f6; color: #6b7280;" />
            </div>

            <div>
              <label class="input-label">Horário Efetivo</label>
              <input type="time" v-model="modalAjuste.novaHora" class="input-time" />
            </div>

            <div>
              <label class="input-label">Justificativa Legal / Motivo</label>
              <textarea v-model="modalAjuste.justificativa" rows="3" class="input-textarea" placeholder="Ex: Colaborador esqueceu de bater o ponto na entrada do plantão..."></textarea>
              <span class="textarea-subtext">Mínimo de 10 caracteres. Forneça o motivo detalhado.</span>
            </div>

            <p v-if="modalAjuste.erro" class="msg-erro">{{ modalAjuste.erro }}</p>

            <div class="modal-acoes">
              <button 
                v-if="modoModal === 'EDITAR'" 
                type="button" 
                @click="apagarPonto" 
                class="btn-excluir-logico"
                :disabled="modalAjuste.carregando"
              >
                ❌ Desconsiderar Ponto
              </button>
              
              <div style="flex: 1;"></div>

              <button @click="modalAjuste.aberto = false" class="btn-cancelar" :disabled="modalAjuste.carregando">Cancelar</button>
              <button @click="salvarAjustePonto" class="btn-salvar" :disabled="modalAjuste.carregando">
                {{ modalAjuste.carregando ? 'Salvando...' : (modoModal === 'EDITAR' ? 'Gravar Ajuste' : 'Salvar Registro') }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.layout { display: flex; min-height: 100vh; background-color: #f8fafc; }
.content { margin-left: 250px; padding: 2rem; flex: 1; font-family: sans-serif; }
h2 { color: #0f172a; margin: 0; }
p { color: #64748b; margin: 0.25rem 0 1.5rem 0; }

.filtros-card { display: flex; gap: 1.5rem; background: white; padding: 1.25rem; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); margin-bottom: 1.5rem; align-items: flex-end; }
.filtro-group { display: flex; flex-direction: column; gap: 0.4rem; flex: 1; }
.filtro-group label { font-size: 0.8rem; font-weight: bold; color: #475569; }
.filtro-group select { padding: 0.5rem; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 0.9rem; background: white; height: 38px; }

/* 🖨️ GRUPO DO ESTILO DO BOTÃO DE IMPRESSÃO */
.filtro-group-btn { display: flex; align-items: flex-end; }
.btn-imprimir { background-color: #0f172a; color: white; border: none; border-radius: 6px; padding: 0 1.25rem; height: 38px; font-size: 0.9rem; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 0.5rem; transition: background-color 0.2s; }
.btn-imprimir:hover { background-color: #1e293b; }
.btn-imprimir:disabled { background-color: #cbd5e1; color: #94a3b8; cursor: not-allowed; }
.printer-icon { font-size: 1.05rem; }

.dashboard-resumo { display: flex; gap: 1.5rem; margin-bottom: 1.5rem; }
.stat-card { flex: 1; background: white; padding: 1.25rem; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
.stat-card h4 { margin: 0; color: #4b5563; font-size: 0.9rem; }
.dado { font-size: 1.8rem; font-weight: bold; margin: 0.5rem 0 0 0; }
.dado.sucesso { color: #10b981; }
.dado.erro { color: #dc2626; }

.table-container { background: white; padding: 1.5rem; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
table { width: 100%; border-collapse: collapse; text-align: left; }
th, td { padding: 0.75rem; border-bottom: 1px solid #e5e7eb; font-size: 0.9rem; }
th { background-color: #f9fafb; color: #374151; }

.container-batidas { display: flex; gap: 0.4rem; flex-wrap: wrap; align-items: center; }
.tag-batida { display: inline-flex; align-items: center; gap: 4px; background: #f3f4f6; padding: 0.25rem 0.5rem; border-radius: 4px; font-weight: 500; font-family: monospace; font-size: 0.85rem; cursor: pointer; border: 1px solid #e5e7eb; position: relative; }
.tag-batida:hover { background: #e5e7eb; }
.tag-batida.alterada { background: #fff7ed; border-color: #ffedd5; color: #c2410c; }
.tag-batida.alterada:hover { background: #ffedd5; }

.icon-ajustado { font-size: 0.7rem; }
.link-mapa { text-decoration: none; font-size: 0.8rem; margin-left: 2px; }

.tooltip-justificativa { display: none; position: absolute; bottom: 125%; left: 50%; transform: translateX(-50%); background: #1e293b; color: white; padding: 0.5rem 0.75rem; border-radius: 6px; font-size: 0.75rem; width: 220px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); z-index: 50; font-family: sans-serif; }
.tag-batida:hover .tooltip-justificativa { display: block; }

.btn-adicionar-ponto { background: #e5e7eb; color: #374151; border: none; border-radius: 4px; padding: 0.15rem 0.4rem; font-weight: bold; cursor: pointer; font-size: 0.85rem; transition: background 0.2s; height: 24px; line-height: 18px; }
.btn-adicionar-ponto:hover { background: #d1d5db; }

.btn-incluir-vazio { background: transparent; color: #2563eb; border: 1px dashed #2563eb; padding: 0.25rem 0.6rem; border-radius: 6px; font-size: 0.8rem; font-weight: 600; cursor: pointer; transition: all 0.2s; }
.btn-incluir-vazio:hover { background: #eff6ff; border-style: solid; }

.status-txt { font-size: 0.75rem; font-weight: bold; padding: 0.2rem 0.5rem; border-radius: 4px; text-transform: uppercase; }
.status-txt.trabalho { background: #e0f2fe; color: #0369a1; }
.status-txt.folga { background: #f3f4f6; color: #4b5563; }
.status-txt.falta { background: #fef2f2; color: #b91c1c; }

.modal-backdrop { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0, 0, 0, 0.4); display: flex; align-items: center; justify-content: center; z-index: 100; }
.modal-card { background: white; padding: 1.5rem; border-radius: 8px; width: 100%; max-width: 440px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1); }
.modal-titulo { margin: 0 0 0.5rem 0; font-size: 1.2rem; font-weight: bold; color: #111827; }
.modal-aviso { font-size: 0.75rem; color: #6b7280; line-height: 1.3; margin-bottom: 1.2rem; }
.modal-inputs { display: flex; flex-direction: column; gap: 1rem; }
.input-label { display: block; font-size: 0.85rem; font-weight: 500; color: #374151; margin-bottom: 0.25rem; }
.input-time { width: 100%; padding: 0.5rem; border: 1px solid #d1d5db; border-radius: 6px; font-size: 0.9rem; box-sizing: border-box; }
.input-textarea { width: 100%; padding: 0.5rem; border: 1px solid #d1d5db; border-radius: 6px; font-size: 0.9rem; font-family: sans-serif; resize: none; box-sizing: border-box; }
.textarea-subtext { font-size: 0.7rem; color: #9ca3af; }
.msg-erro { background: #fef2f2; color: #991b1b; padding: 0.5rem; border-radius: 4px; font-size: 0.8rem; font-weight: 500; margin: 0; }
.modal-acoes { display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 0.5rem; align-items: center; }

.btn-excluir-logico { padding: 0.5rem 1rem; border: 1px solid #fca5a5; background: #fef2f2; color: #b91c1c; border-radius: 6px; font-size: 0.85rem; font-weight: bold; cursor: pointer; transition: background 0.2s; }
.btn-excluir-logico:hover { background: #fee2e2; }

.btn-cancelar { padding: 0.5rem 1rem; border: 1px solid #d1d5db; background: white; border-radius: 6px; font-size: 0.85rem; font-weight: 500; color: #374151; cursor: pointer; }
.btn-cancelar:hover { background: #f9fafb; }
.btn-salvar { padding: 0.5rem 1rem; border: none; background: #2563eb; border-radius: 6px; font-size: 0.85rem; font-weight: 500; color: white; cursor: pointer; }
.btn-salvar:hover { background: #1d4ed8; }
.btn-salvar:disabled, .btn-cancelar:disabled { opacity: 0.6; cursor: not-allowed; }
</style>