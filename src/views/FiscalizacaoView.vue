<script setup lang="ts">
import { ref } from 'vue';
import SidebarComponent from '../components/SidebarComponent.vue';
import api from '../services/api';

// 🔥 Estados reativos para controlar os calendários e o carregamento
const dataInicio = ref('');
const dataFim = ref('');
const carregandoAEF = ref(false);
const mensagemErro = ref('');
const mensagemSucesso = ref('');

// 🔥 GATILHO DA EXTRAÇÃO FISCAL COM CALENDÁRIO CUSTOMIZADO
const gerarEBaixarAEF = async () => {
  // Reseta os estados de alerta
  mensagemErro.value = '';
  mensagemSucesso.value = '';

  if (!dataInicio.value || !dataFim.value) {
    mensagemErro.value = 'Por favor, selecione ambas as datas (Início e Fim) para prosseguir.';
    return;
  }

  const inicio = new Date(dataInicio.value);
  const fim = new Date(dataFim.value);

  if (inicio > fim) {
    mensagemErro.value = 'A data de início não pode ser maior do que a data de término.';
    return;
  }

  try {
    carregandoAEF.value = true;

    // Ajusta os horários para pegar o dia cheio na conversão ISO antes de mandar para o Prisma
    const dataInicioIso = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate(), 0, 0, 0).toISOString();
    const dataFimIso = new Date(fim.getFullYear(), fim.getMonth(), fim.getDate(), 23, 59, 59).toISOString();

    const response = await api.get('/relatorios/fiscalizacao/aef', {
      params: { 
        dataInicio: dataInicioIso, 
        dataFim: dataFimIso 
      },
      responseType: 'blob' // Preserva a integridade dos bytes do arquivo texto fixo
    });

    // Força o download do arquivo txt com encode UTF-8 ativo
    const blob = new Blob([response.data], { type: 'text/plain;charset=utf-8' });
    const urlBlob = window.URL.createObjectURL(blob);
    
    const linkDownload = document.createElement('a');
    linkDownload.href = urlBlob;
    
    // Nome dinâmico baseado no range que o fiscal escolheu no calendário
    const nomeArquivo = `AEF_Portaria671_${dataInicio.value}_a_${dataFim.value}.txt`;
    linkDownload.setAttribute('download', nomeArquivo);
    
    document.body.appendChild(linkDownload);
    linkDownload.click();
    
    document.body.removeChild(linkDownload);
    window.URL.revokeObjectURL(urlBlob);

    mensagemSucesso.value = 'Arquivo AEF gerado e baixado com sucesso!';
  } catch (error: any) {
    console.error("Erro ao emitir arquivo fiscal AEF:", error);
    mensagemErro.value = error.response?.data?.erro || 'Falha crítica ao compilar os dados fiscais. Verifique a conexão com o servidor.';
  } finally {
    carregandoAEF.value = false;
  }
};
</script>

<template>
  <div class="layout">
    <SidebarComponent />
    <main class="content">
      <h2>Área de Fiscalização e Auditoria</h2>
      <p>Módulo exclusivo para geração de arquivos fiscais digitais obrigatórios exigidos pelo Ministério do Trabalho e Emprego (MTE).</p>

      <div class="fiscal-container">
        <div class="card-fiscal">
          <div class="card-header">
            <span class="badge-mte">Portaria MTE 671/2021</span>
            <h3>Geração do Arquivo AEF</h3>
          </div>
          
          <p class="instrucoes">
            O <strong>AEF (Arquivo Eletrônico de Fiscalização)</strong> contempla a totalidade dos registros de ponto, dados contratuais e históricos de modificações do período selecionado. Selecione o intervalo desejado nos calendários abaixo:
          </p>

          <div class="form-fiscais">
            <div class="input-group">
              <label>Data Inicial do Período</label>
              <input 
                type="date" 
                v-model="dataInicio" 
                class="input-calendario"
                :disabled="carregandoAEF"
              />
            </div>

            <div class="input-group">
              <label>Data Final do Período</label>
              <input 
                type="date" 
                v-model="dataFim" 
                class="input-calendario"
                :disabled="carregandoAEF"
              />
            </div>

            <p v-if="mensagemErro" class="alerta erro">⚠️ {{ mensagemErro }}</p>
            <p v-if="mensagemSucesso" class="alerta sucesso">✅ {{ mensagemSucesso }}</p>

            <div class="card-acoes">
              <button 
                @click="gerarEBaixarAEF" 
                class="btn-gerar-aef" 
                :disabled="carregandoAEF"
              >
                <span v-if="carregandoAEF" class="spinner">⏳</span>
                <span>{{ carregandoAEF ? 'Compilando Dados...' : 'Gerar e Baixar Arquivo AEF (.TXT)' }}</span>
              </button>
            </div>
          </div>
        </div>

        <div class="card-informativo">
          <h4>💡 Lembrete Importante para Auditorias</h4>
          <ul>
            <li>O arquivo gerado segue estritamente o layout do <strong>Anexo V</strong> da regulamentação vigente.</li>
            <li>Pontos batidos em modo <em>offline</em> no Totem serão exibidos no arquivo com geolocalização zerada (0.0), sinalizando contingência regular de hardware.</li>
            <li>Certifique-se de que todas as alterações manuais e abonos pendentes já foram processados no espelho antes de emitir o arquivo final.</li>
          </ul>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
/* 🎨 Mantendo a consistência do design original do seu sistema */
.layout { display: flex; min-height: 100vh; background-color: #f8fafc; }
.content { padding: 2rem; flex: 1; font-family: sans-serif; }
h2 { color: #0f172a; margin: 0; }
p { color: #64748b; margin: 0.25rem 0 1.5rem 0; }

.fiscal-container { display: grid; grid-template-columns: 1fr 320px; gap: 2rem; align-items: start; }

.card-fiscal { background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; }
.card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
.card-header h3 { margin: 0; color: #1e3a8a; font-size: 1.3rem; }

.badge-mte { background-color: #eff6ff; color: #1e40af; font-size: 0.75rem; font-weight: bold; padding: 0.25rem 0.5rem; border-radius: 4px; border: 1px solid #bfdbfe; }
.instrucoes { font-size: 0.9rem; color: #475569; line-height: 1.5; margin-bottom: 1.5rem; }

.form-fiscais { display: flex; flex-direction: column; gap: 1.25rem; }
.input-group { display: flex; flex-direction: column; gap: 0.4rem; }
.input-group label { font-size: 0.85rem; font-weight: bold; color: #334155; }
.input-calendario { padding: 0.6rem; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 0.95rem; background: white; height: 42px; outline: none; transition: border-color 0.2s; width: 100%; box-sizing: border-box; }
.input-calendario:focus { border-color: #3b82f6; }

.alerta { padding: 0.75rem; border-radius: 6px; font-size: 0.85rem; font-weight: 500; margin: 0; }
.alerta.erro { background-color: #fef2f2; color: #991b1b; border: 1px solid #fca5a5; }
.alerta.sucesso { background-color: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; }

.card-acoes { margin-top: 0.5rem; }
.btn-gerar-aef { width: 100%; background-color: #16a34a; color: white; border: none; border-radius: 6px; height: 46px; font-size: 1rem; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 0.5rem; transition: background-color 0.2s; }
.btn-gerar-aef:hover { background-color: #15803d; }
.btn-gerar-aef:disabled { background-color: #cbd5e1; color: #94a3b8; cursor: not-allowed; }

.card-informativo { background-color: #fff7ed; border: 1px solid #ffedd5; padding: 1.5rem; border-radius: 8px; color: #c2410c; }
.card-informativo h4 { margin: 0 0 0.75rem 0; font-size: 0.95rem; display: flex; align-items: center; }
.card-informativo ul { margin: 0; padding-left: 1.25rem; font-size: 0.85rem; display: flex; flex-direction: column; gap: 0.6rem; line-height: 1.4; text-align: left; }

.spinner { display: inline-block; animation: spin 1s linear infinite; }
@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

@media (max-width: 768px) {
  .fiscal-container { grid-template-columns: 1fr; }
}
</style>