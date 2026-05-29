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
  dataInicioEscala: string | null; // 🔹 Adicionado na tipagem do TypeScript
}

interface Jornada {
  id: string;
  descricao: string;
}

const modalAberto = ref(false);

const funcionarios = ref<Usuario[]>([]);
const jornadas = ref<Jornada[]>([]);

// Campos do Formulário (Inclusão/Edição)
const idUsuarioEdicao = ref<string | null>(null);
const nome = ref('');
const cpf = ref('');
const senha = ref('');
const perfil = ref('FUNCIONARIO');
const horarioBaseId = ref<string>('');
const dataInicioEscala = ref<string>(''); 

const mensagemSucesso = ref('');
const mensagemErro = ref('');

// Carrega a tabela de colaboradores e a lista de horários para o Select
const inicializarDados = async () => {
  try {
    const [resUsuarios, resHorarios] = await Promise.all([
      api.get('/usuarios'),
      api.get('/horarios')
    ]);
    funcionarios.value = resUsuarios.data;
    jornadas.value = resHorarios.data;
  } catch (error) {
    console.error('Erro ao carregar dados:', error);
  }
};

onMounted(inicializarDados);

// Abre o modal limpando ou preenchendo para edição
const abrirFormulario = (func: Usuario | null = null) => {
  mensagemSucesso.value = '';
  mensagemErro.value = '';

  if (func) {
    modalAberto.value = true;
    mensagemSucesso.value = '';
    mensagemErro.value = '';

    idUsuarioEdicao.value = func.id;
    nome.value = func.nome;
    cpf.value = func.cpf;
    senha.value = ''; // Senha opcional na edição
    perfil.value = func.perfil;
    horarioBaseId.value = func.horarioBaseId || '';
    
    // 🔹 Trata a data vinda do banco (YYYY-MM-DDTHH:mm:ss...) para o padrão HTML (YYYY-MM-DD)
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
    dataInicioEscala.value = ''; // 🔹 Limpa no novo cadastro
  }
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
};

// Submete a requisição para a API (Criar ou Atualizar)
const salvarColaborador = async () => {
  mensagemSucesso.value = '';
  mensagemErro.value = '';

  if (!nome.value || !cpf.value || (!idUsuarioEdicao.value && !senha.value)) {
    mensagemErro.value = 'Por favor, preencha todos os campos obrigatórios.';
    return;
  }

  // 🔹 Montagem do payload estruturado
  const payload: any = {
    nome: nome.value,
    cpf: cpf.value,
    perfil: perfil.value,
    horarioBaseId: perfil.value === 'FUNCIONARIO' && horarioBaseId.value ? horarioBaseId.value : null,
    // Se for admin, ignora a data. Se for funcionário, envia se preenchido.
    dataInicioEscala: perfil.value === 'FUNCIONARIO' && dataInicioEscala.value ? dataInicioEscala.value : null
  };

  if (senha.value) {
    payload.senha = senha.value;
  }

  try {
    if (idUsuarioEdicao.value) {
      await api.put(`/usuarios/${idUsuarioEdicao.value}`, payload);
      mensagemSucesso.value = 'Colaborador atualizado com sucesso!';
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

// Função para formatar exibição de data na tabela (Converte YYYY-MM-DD para DD/MM/YYYY)
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

      <div v-if="idUsuarioEdicao !== null || nome !== '' || idUsuarioEdicao === null && modalAberto" class="modal-overlay">
        <div class="modal-card">
          <h3>{{ idUsuarioEdicao ? 'Editar Funcionário' : 'Cadastrar Novo Funcionário' }}</h3>

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
              <th>Início da Escala</th> <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="f in funcionarios" :key="f.id">
              <td>{{ f.nome }}</td>
              <td>{{ f.cpf }}</td>
              <td>
                <span :class="f.perfil === 'ADMIN' ? 'badge admin' : 'badge func'">
                  {{ f.perfil }}
                </span>
              </td>
              <td>{{ formatarDataTabela(f.dataInicioEscala) }}</td> <td>
                <div style="display: flex; gap: 8px;">
                  <button class="btn-edit" @click="abrirFormulario(f)">Editar</button>
                  <button class="btn-edit" style="color: #dc2626; border-color: #fca5a5;" @click="excluirColaborador(f.id)">Excluir</button>
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
.dashboard-layout { display: flex; min-height: 100vh; background-color: #f8fafc; font-family: sans-serif; width: 100%; overflow-x: hidden;}
.content-area { flex: 1; padding: 2rem; min-width: 0; margin-left: 250px;}
.content-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
.content-header h2 { margin: 0; color: #1e293b; }

.modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.4); display: flex; justify-content: center; align-items: center; z-index: 999; }
.modal-card { background: white; padding: 2rem; border-radius: 8px; width: 450px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
.modal-card h3 { margin-top: 0; color: #1e293b; margin-bottom: 1.5rem; }

.form-group { display: flex; flex-direction: column; margin-bottom: 1.25rem; }
.form-group label { font-size: 0.9rem; font-weight: 600; color: #475569; margin-bottom: 0.4rem; }
.form-group input, .form-group select { padding: 0.6rem; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 0.95rem; }

.form-actions { display: flex; gap: 0.5rem; justify-content: flex-end; margin-top: 1.5rem; }
.btn-primary { background: #2563eb; color: white; cursor: pointer; font-weight: bold; border: none; padding: 0.65rem 1.5rem; border-radius: 6px; }
.btn-primary:hover { background: #1d4ed8; }
.btn-cancel { background: #64748b; color: white; cursor: pointer; border: none; padding: 0.65rem 1rem; border-radius: 6px; }

table { width: 100%; border-collapse: collapse; margin-top: 1rem; text-align: left; }
th, td { padding: 0.85rem; border-bottom: 1px solid #e2e8f0; font-size: 0.95rem; }
th { background-color: #f8fafc; color: #475569; font-weight: 600; }

.btn-edit { background: #f1f5f9; border: 1px solid #cbd5e1; padding: 0.4rem 0.8rem; border-radius: 6px; cursor: pointer; font-size: 0.85rem; color: #334155; font-weight: 500; }
.btn-edit:hover { background: #e2e8f0; }

.sucesso { color: #10b981; margin-bottom: 1rem; font-weight: bold; }
.erro { color: #dc2626; margin-bottom: 1rem; font-weight: bold; }
.table-container { background: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); padding: 1rem; overflow-x: auto; }

/* Badges de estilo para os perfis */
.badge { padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: bold; }
.badge.admin { background: #fee2e2; color: #991b1b; }
.badge.func { background: #e0f2fe; color: #0369a1; }
</style>