<script setup lang="ts">
import { ref, onMounted } from 'vue';
import SidebarComponent from '../components/SidebarComponent.vue';
import api from '../services/api';

interface Usuario {
  id: string;
  nome: string;
  cpf: string;
  perfil: string;
  horarioBaseId: string | null;
  dataInicioEscala: string | null;
  filialId: string; // 🟢 Incluído na interface para suporte SaaS
  setorId: string;  // 🟢 Incluído na interface para suporte SaaS
}

interface Jornada {
  id: string;
  descricao: string;
}

// 🟢 NOVAS INTERFACES PARA MAPEAMENTO MULTI-TENANT
interface Filial {
  id: string;
  nome: string;
}

interface Setor {
  id: string;
  nome: string;
  filialId: string;
}

// Controle do Modal
const modalAberto = ref(false);

const funcionarios = ref<Usuario[]>([]);
const jornadas = ref<Jornada[]>([]);
const filiais = ref<Filial[]>([]); // 🟢 Estado para armazenar filiais da empresa
const setores = ref<Setor[]>([]);   // 🟢 Estado para armazenar setores da empresa
const setoresFiltrados = ref<Setor[]>([]); // 🟢 Estado para o select reativo de acordo com a filial

// Campos do Formulário (Inclusão/Edição)
const idUsuarioEdicao = ref<string | null>(null);
const nome = ref('');
const cpf = ref('');
const senha = ref('');
const perfil = ref('FUNCIONARIO');
const horarioBaseId = ref<string>('');
const dataInicioEscala = ref<string>(''); 
const filialId = ref<string>(''); // 🟢 Campo obrigatório do formulário SaaS
const setorId = ref<string>('');  // 🟢 Campo obrigatório do formulário SaaS

const mensagemSucesso = ref('');
const mensagemErro = ref('');

// Carrega a tabela de colaboradores e a lista de horários para o Select
const inicializarDados = async () => {
  try {
    // 🟢 Injetado a busca paralela das Filiais e Setores pertencentes à Empresa Logada (Isolado via Token)
    const [resUsuarios, resHorarios, resFiliais, resSetores] = await Promise.all([
      api.get('/usuarios'),
      api.get('/horarios'),
      api.get('/filiais'),
      api.get('/setores')
    ]);
    funcionarios.value = resUsuarios.data;
    jornadas.value = resHorarios.data;
    filiais.value = resFiliais.data;
    setores.value = resSetores.data;
  } catch (error) {
    console.error('Erro ao carregar dados:', error);
  }
};

onMounted(inicializarDados);

// 🟢 EVENTO REATIVO: Filtra os setores automaticamente baseando-se na filial escolhida
const tratarMudancaFilial = () => {
  setorId.value = ''; // Reseta o setor selecionado anteriormente
  setoresFiltrados.value = setores.value.filter(s => s.filialId === filialId.value);
};

// Abre o modal limpando ou preenchendo para edição
const abrirFormulario = (func: Usuario | null = null) => {
  mensagemSucesso.value = '';
  mensagemErro.value = '';

  if (func) {
    idUsuarioEdicao.value = func.id;
    nome.value = func.nome;
    cpf.value = func.cpf;
    senha.value = ''; // Senha opcional na edição
    perfil.value = func.perfil;
    horarioBaseId.value = func.horarioBaseId || '';
    
    // 🟢 Aloca os IDs corporativos nos campos reativos durante a edição
    filialId.value = func.filialId || '';
    setoresFiltrados.value = setores.value.filter(s => s.filialId === func.filialId);
    setorId.value = func.setorId || '';
    
    if (func.dataInicioEscala) {
      dataInicioEscala.value = func.dataInicioEscala.split('T')[0];
    } else {
      dataInicioEscala.value = '';
    }
  } else {
    idUsuarioEdicao.value = null;
    nome.value = '';
    cpf.value = '';
    senha.value = '';
    perfil.value = 'FUNCIONARIO';
    horarioBaseId.value = '';
    dataInicioEscala.value = '';
    filialId.value = ''; // 🟢 Limpa o campo reativo
    setorId.value = '';  // 🟢 Limpa o campo reativo
    setoresFiltrados.value = [];
  }
  // 🔒 Ativa a flag de visualização do modal de forma limpa
  modalAberto.value = true;
};

const fecharFormulario = () => {
  modalAberto.value = false;
  idUsuarioEdicao.value = null;
  nome.value = '';
  cpf.value = '';
  senha.value = '';
  perfil.value = 'FUNCIONARIO';
  horarioBaseId.value = '';
  dataInicioEscala.value = '';
  filialId.value = ''; // 🟢 Limpeza completa pós-uso
  setorId.value = '';  // 🟢 Limpeza completa pós-uso
  setoresFiltrados.value = [];
};

// Submete a requisição para a API (Criar ou Atualizar)
const salvarColaborador = async () => {
  mensagemSucesso.value = '';
  mensagemErro.value = '';

  // 🟢 Adicionado filialId e setorId como campos obrigatórios estruturais
  if (!nome.value || !cpf.value || !filialId.value || !setorId.value || (!idUsuarioEdicao.value && !senha.value)) {
    mensagemErro.value = 'Por favor, preencha todos os campos obrigatórios.';
    return;
  }

  const payload: any = {
    nome: nome.value,
    cpf: cpf.value,
    perfil: perfil.value,
    filialId: filialId.value, // 🔒 Injetado no payload em conformidade com o controller
    setorId: setorId.value,   // 🔒 Injetado no payload em conformidade com o controller
    horarioBaseId: perfil.value === 'FUNCIONARIO' && horarioBaseId.value ? horarioBaseId.value : null,
    dataInicioEscala: perfil.value === 'FUNCIONARIO' && dataInicioEscala.value ? dataInicioEscala.value : null
  };

  if (senha.value) {
    payload.senha = senha.value;
  }

  try {
    if (idUsuarioEdicao.value) {
      await api.put(`/usuarios/${idUsuarioEdicao.value}`, payload);
      mensagemSucesso.value = 'Colaborador updated com sucesso!';
    } else {
      await api.post('/usuarios', payload);
      mensagemSucesso.value = 'Novo colaborador cadastrado com sucesso!';
    }

    await inicializarDados();
    fecharFormulario();
  } catch (error: any) {
    mensagemErro.value = error.response?.data?.erro || 'Erro ao processar requisição.';
  }
};

const excluirColaborador = async (id: string) => {
  if (!confirm('Deseja realmente remover este colaborador do sistema?')) return;
  mensagemSucesso.value = '';
  mensagemErro.value = '';

  try {
    await api.delete(`/usuarios/${id}`);
    mensagemSucesso.value = 'Colaborador removido com sucesso.';
    await inicializarDados();
  } catch (error) {
    mensagemErro.value = 'Não foi possível excluir o colaborador.';
  }
};

const formatarDataTabela = (dataISO: string | null) => {
  if (!dataISO) return '-';
  const apenasData = dataISO.split('T')[0];
  const [ano, mes, dia] = apenasData.split('-');
  return `${dia}/${mes}/${ano}`;
};
</script>

<template>
  <div class="dashboard-layout">
    <SidebarComponent />

    <main class="content-area">
      <header class="content-header">
        <h2>Gerenciar Funcionários</h2>
        <button class="btn-primary" @click="abrirFormulario(null)">+ Novo Funcionário</button>
      </header>

      <p v-if="mensagemSucesso" class="sucesso">{{ mensagemSucesso }}</p>
      <p v-if="mensagemErro" class="erro">{{ mensagemErro }}</p>

      <div v-if="modalAberto" class="modal-overlay">
        <div class="modal-card">
          <h3>{{ idUsuarioEdicao ? 'Editar Funcionário' : 'Cadastrar Novo Funcionário' }}</h3>

          <div class="modal-corpo-scroll">
            <div class="form-group">
              <label>Nome Completo *</label>
              <input type="text" v-model="nome" placeholder="Digite o nome" />
            </div>

            <div class="form-group">
              <label>CPF (Apenas números) *</label>
              <input type="text" v-model="cpf" placeholder="Ex: 12345678900" maxlength="11" />
            </div>

            <div class="form-group">
              <label>Senha {{ idUsuarioEdicao ? '(Deixe em branco para manter)' : '*' }}</label>
              <input type="password" v-model="senha" placeholder="Digite a senha de acesso" />
            </div>

            <div class="form-group">
              <label>Perfil de Acesso</label>
              <select v-model="perfil">
                <option value="FUNCIONARIO">Funcionário</option>
                <option value="ADMIN">Administrador</option>
              </select>
            </div>

            <div class="form-group">
              <label>Filial Alocada *</label>
              <select v-model="filialId" @change="tratarMudancaFilial">
                <option value="" disabled selected>Selecione a Filial...</option>
                <option v-for="f in filiais" :key="f.id" :value="f.id">{{ f.nome }}</option>
              </select>
            </div>

            <div class="form-group">
              <label>Setor Administrativo *</label>
              <select v-model="setorId" :disabled="setoresFiltrados.length === 0">
                <option value="" disabled selected>
                  {{ setoresFiltrados.length === 0 ? 'Escolha uma filial primeiro...' : 'Selecione o Setor...' }}
                </option>
                <option v-for="s in setoresFiltrados" :key="s.id" :value="s.id">{{ s.nome }}</option>
              </select>
            </div>

            <template v-if="perfil === 'FUNCIONARIO'">
              <div class="form-group">
                <label>Jornada / Horário Base</label>
                <select v-model="horarioBaseId">
                  <option value="">Nenhum horário associado</option>
                  <option v-for="j in jornadas" :key="j.id" :value="j.id">
                    {{ j.descricao }}
                  </option>
                </select>
              </div>

              <div class="form-group">
                <label>Data de Início da Escala (Crucial para Escalas Alternadas) *</label>
                <input type="date" v-model="dataInicioEscala" />
                <small style="color: #64748b; margin-top: 4px; display: block;">
                  Selecione o primeiro dia de plantão/trabalho ativo do funcionário.
                </small>
              </div>
            </template>
          </div>

          <div class="form-actions">
            <button class="btn-cancel" @click="fecharFormulario">Cancelar</button>
            <button class="btn-primary" @click="salvarColaborador">Salvar</button>
          </div>
        </div>
      </div>

      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>CPF</th>
              <th>Perfil</th>
              <th>Início da Escala</th> 
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="f in funcionarios" :key="f.id">
              <td><strong>{{ f.nome }}</strong></td>
              <td>{{ f.cpf }}</td>
              <td>
                <span :class="f.perfil === 'ADMIN' ? 'badge admin' : 'badge func'">
                  {{ f.perfil }}
                </span>
              </td>
              <td>{{ formatarDataTabela(f.dataInicioEscala) }}</td> 
              <td>
                <div class="acoes-row">
                  <button class="btn-edit" @click="abrirFormulario(f)">✏️ Editar</button>
                  <button class="btn-delete" @click="excluirColaborador(f.id)">🗑️ Excluir</button>
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
/* 📐 AJUSTE DINÂMICO DE VIEW: Totalmente compatível com a Sidebar Colapsável */
.dashboard-layout { 
  display: flex; 
  min-height: 100vh; 
  background-color: #f8fafc; 
  font-family: sans-serif; 
  width: 100%; 
}

.content-area { 
  flex: 1; 
  padding: 2rem; 
  min-width: 0;
  box-sizing: border-box;
}

.content-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
.content-header h2 { margin: 0; color: #1e293b; font-size: 1.5rem; }

/* MODAL LAYOUT */
.modal-overlay, .modal-backdrop { 
  position: fixed; 
  top: 0; 
  left: 0; 
  right: 0; 
  bottom: 0; 
  background: rgba(0, 0, 0, 0.4); 
  display: flex; 
  justify-content: center; 
  align-items: center; 
  z-index: 999; 
  padding: 1rem;
  box-sizing: border-box;
}

.modal-card { 
  background: white; 
  padding: 2rem; 
  border-radius: 8px; 
  width: 100%; 
  max-width: 440px; 
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); 
  
  /* ─── BLINDAGEM CONTRA ESTOURO VERTICAL ─── */
  max-height: 85vh;          
  display: flex;
  flex-direction: column;    
  min-height: 0;             /* VITAL: Permite o encolhimento do contêiner flex */
  box-sizing: border-box;
}

.modal-card h3 { 
  margin-top: 0; 
  color: #1e293b; 
  margin-bottom: 1.25rem; 
  font-size: 1.2rem; 
  flex-shrink: 0;            /* Impede o título de deformar ou achatar */
}

/* 🟢 SEÇÃO DE ROLAGEM INTERNA DA FORMULÁRIO */
.modal-corpo-scroll {
  flex: 1;
  overflow-y: auto;          
  padding-right: 0.5rem;     
  margin-bottom: 1rem;
  box-sizing: border-box;
}

/* Customização sutil de scrollbar */
.modal-corpo-scroll::-webkit-scrollbar {
  width: 6px;
}
.modal-corpo-scroll::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 4px;
}
.modal-corpo-scroll::-webkit-scrollbar-track {
  background: #f1f5f9;
}

.form-group { display: flex; flex-direction: column; margin-bottom: 1.25rem; }
.form-group label { font-size: 0.85rem; font-weight: 600; color: #475569; margin-bottom: 0.4rem; }
.form-group input, .form-group select { padding: 0.55rem 0.75rem; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 0.95rem; background: white; outline: none; box-sizing: border-box; width: 100%; }
.form-group input:focus, .form-group select:focus { border-color: #2563eb; }

/* ─── BOTÕES ANCORADOS NO RODAPÉ ─── */
.form-actions, .modal-acoes { 
  display: flex; 
  gap: 0.5rem; 
  justify-content: flex-end; 
  margin-top: auto;          
  flex-shrink: 0;            
  background: white;
  padding-top: 1rem;
  border-top: 1px solid #e2e8f0;
}

.btn-primary { background: #2563eb; color: white; cursor: pointer; font-weight: bold; border: none; padding: 0.6rem 1.5rem; border-radius: 6px; font-size: 0.9rem; transition: background 0.2s; }
.btn-primary:hover { background: #1d4ed8; }
.btn-cancel { background: #64748b; color: white; cursor: pointer; border: none; padding: 0.6rem 1.25rem; border-radius: 6px; font-weight: 500; font-size: 0.9rem; transition: background 0.2s; }
.btn-cancel:hover { background: #475569; }

/* REGRAS DA TABELA */
.table-container { background: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); padding: 1.25rem; overflow-x: auto; margin-top: 1rem; }
table { width: 100%; border-collapse: collapse; text-align: left; }
th, td { padding: 0.85rem; border-bottom: 1px solid #e2e8f0; font-size: 0.9rem; vertical-align: middle; }
th { background-color: #f8fafc; color: #475569; font-weight: 600; }

.acoes-row { display: flex; gap: 8px; }
.btn-edit { background: #f1f5f9; border: 1px solid #cbd5e1; padding: 0.4rem 0.75rem; border-radius: 6px; cursor: pointer; font-size: 0.8rem; color: #334155; font-weight: 500; transition: background 0.1s; }
.btn-edit:hover { background: #e2e8f0; }
.btn-delete { background: #fff5f5; border: 1px solid #fca5a5; padding: 0.4rem 0.75rem; border-radius: 6px; cursor: pointer; font-size: 0.8rem; color: #dc2626; font-weight: 500; transition: background 0.1s; }
.btn-delete:hover { background: #fee2e2; }

.sucesso { color: #10b981; margin-bottom: 1rem; font-weight: bold; font-size: 0.9rem; background: #ecfdf5; padding: 0.5rem; border-radius: 4px; }
.erro { color: #dc2626; margin-bottom: 1rem; font-weight: bold; font-size: 0.9rem; background: #fef2f2; padding: 0.5rem; border-radius: 4px; }

/* BADGES */
.badge { padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: bold; text-transform: uppercase; }
.badge.admin { background: #fee2e2; color: #991b1b; }
.badge.func { background: #e0f2fe; color: #0369a1; }
</style>