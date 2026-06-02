<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();

// 🔄 ESTADO REATIVO: Controla se o menu está recolhido (true) ou expandido (false)
const isCollapsed = ref(false);

// 🔒 CONTROLE SAAS: Guarda se o usuário atual possui a credencial master do sistema
const ehSuperAdmin = ref(false);

const toggleSidebar = () => {
  isCollapsed.value = !isCollapsed.value;
};

const verificarPerfilMestre = () => {
  try {
    const dadosUsuarioStr = localStorage.getItem('ponto_user');
    if (dadosUsuarioStr) {
      const usuario = JSON.parse(dadosUsuarioStr);
      ehSuperAdmin.value = usuario.perfil === 'SUPER_ADMIN' || usuario.perfil === 'super_admin';
    }
  } catch (e) {
    console.error('Erro ao ler credenciais do sidebar:', e);
  }
};

onMounted(() => {
  verificarPerfilMestre();
});

const logout = () => {
  localStorage.removeItem('ponto_token');
  localStorage.removeItem('ponto_user');
  router.push('/');
};
</script>

<template>
  <aside :class="['sidebar', { 'collapsed': isCollapsed }]">
    <div class="logo">
      <h3 v-if="!isCollapsed">Ponto Admin</h3>
      <h3 v-else>⏱️</h3>
      
      <button @click="toggleSidebar" class="btn-toggle" :title="isCollapsed ? 'Expandir Menu' : 'Recolher Menu'">
        {{ isCollapsed ? '❯' : '❮' }}
      </button>
    </div>
    
    <nav class="menu">
      <router-link v-if="ehSuperAdmin" to="/super-admin" class="menu-item item-master" active-class="active">
        <span class="menu-icon">🚀</span>
        <span v-if="!isCollapsed" class="menu-text">Módulo Master</span>
      </router-link>

      <router-link to="/dashboard" class="menu-item" active-class="active">
        <span class="menu-icon">📊</span>
        <span v-if="!isCollapsed" class="menu-text">Dashboard</span>
      </router-link>
      
      <router-link to="/jornadas" class="menu-item" active-class="active">
        <span class="menu-icon">⏱️</span>
        <span v-if="!isCollapsed" class="menu-text">Configurar Horários</span>
      </router-link>

      <router-link to="/filiais" class="menu-item" active-class="active">
        <span class="menu-icon">🏢</span>
        <span v-if="!isCollapsed" class="menu-text">Filiais</span>
      </router-link>

      <router-link to="/setores" class="menu-item" active-class="active">
        <span class="menu-icon">📁</span>
        <span v-if="!isCollapsed" class="menu-text">Setores</span>
      </router-link>
      
      <router-link to="/funcionarios" class="menu-item" active-class="active">
        <span class="menu-icon">👥</span>
        <span v-if="!isCollapsed" class="menu-text">Funcionários</span>
      </router-link>

      <router-link to="/afastamentos" class="menu-item" active-class="active">
        <span class="menu-icon">🏝️</span>
        <span v-if="!isCollapsed" class="menu-text">Afastamentos e Férias</span>
      </router-link>
      
      <router-link to="/relatorios" class="menu-item" active-class="active">
        <span class="menu-icon">📋</span>
        <span v-if="!isCollapsed" class="menu-text">Espelho de Ponto</span>
      </router-link>

      <router-link to="/fiscalizacao" class="menu-item" active-class="active">
        <span class="menu-icon">⚖️</span>
        <span v-if="!isCollapsed" class="menu-text">Fiscalização MTE</span>
      </router-link>      
      
      <router-link to="/auditoria" class="menu-item" active-class="active">
        <span class="menu-icon">🛡️</span>
        <span v-if="!isCollapsed" class="menu-text">Logs de Auditoria</span>
      </router-link>
    </nav>
    
    <button @click="logout" class="btn-logout">
      <span class="menu-icon">🚪</span>
      <span v-if="!isCollapsed" class="menu-text">Sair</span>
    </button>
  </aside>
</template>

<style scoped>
/* 📐 DIMENSÕES E TRANSIÇÃO SUAVE PADRÃO (EXPANDIDO) */
.sidebar {
  width: 250px;
  background-color: #1f2937;
  color: white;
  display: flex;
  flex-direction: column;
  height: 100vh;
  position: sticky;
  left: 0;
  top: 0;
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 100;
  box-sizing: border-box; /* 🟢 CORREÇÃO: Garante que as bordas fiquem contidas na largura */
}

/* 📐 LARGURA REDUZIDA QUANDO FOR COLAPSADO */
.sidebar.collapsed {
  width: 68px;
}

/* LOGO / HEADER DO COMPONENTE */
.logo { 
  padding: 2rem 1.5rem; 
  border-bottom: 1px solid #374151; 
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 80px;
  box-sizing: border-box;
  flex-shrink: 0; /* 🟢 CORREÇÃO: Evita que o cabeçalho amasse se a tela encolher */
}

.sidebar.collapsed .logo {
  justify-content: center;
  padding: 2rem 0;
}

.logo h3 { 
  margin: 0; 
  color: #3b82f6; 
  white-space: nowrap;
}

/* BOTÃO PEQUENO DE ACIONAMENTO (SETINHAS) */
.btn-toggle {
  background: #374151;
  border: none;
  color: #9ca3af;
  border-radius: 4px;
  width: 24px;
  height: 24px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  transition: background 0.2s, color 0.2s;
}
.btn-toggle:hover {
  background: #4b5563;
  color: white;
}
.sidebar.collapsed .btn-toggle {
  position: absolute;
  top: 65px;
}

/* ITENS DO MENU */
.menu { 
  flex: 1; 
  display: flex; 
  flex-direction: column; 
  padding: 1.5rem 0; 
  gap: 0.25rem; /* 🟢 Otimizado para não expandir demais verticalmente */
  overflow-y: auto; /* 🟢 CORREÇÃO CRÍTICA: Se faltar espaço na tela, cria scroll sutil apenas no menu */
  box-sizing: border-box;
}

/* Customização leve da barra de scroll interna para ficar invisível ou bem discreta */
.menu::-webkit-scrollbar {
  width: 4px;
}
.menu::-webkit-scrollbar-thumb {
  background: #374151;
  border-radius: 10px;
}

.menu-item {
  display: flex;
  align-items: center;
  padding: 0.75rem 1.5rem;
  color: #d1d5db;
  text-decoration: none;
  transition: all 0.2s;
  white-space: nowrap;
  gap: 10px;
  box-sizing: border-box; /* 🟢 CORREÇÃO: Alinha as paddings internas ao limite da sidebar */
}

.menu-item:hover {
  background-color: #374151;
  color: white;
}

.menu-item.active {
  background-color: #3b82f6;
  color: white;
  font-weight: bold;
}

/* Estilo visual diferenciado para destacar o botão Master */
.item-master {
  border-left: 4px solid #7c3aed;
  background-color: rgba(124, 58, 237, 0.05);
}
.item-master:hover {
  background-color: rgba(124, 58, 237, 0.15);
}
.item-master.active {
  background-color: #7c3aed !important;
}

/* Alinhamento centralizado quando colapsado */
.sidebar.collapsed .menu-item {
  justify-content: center;
  padding: 0.75rem 0;
  gap: 0;
}

.menu-icon {
  font-size: 1.2rem;
  display: inline-block;
  text-align: center;
  width: 24px;
}

/* Pequena animação de surgimento para o texto quando expandir */
.menu-text {
  animation: fadeIn 0.2s ease-in-out;
}

/* BOTÃO DE SAIR (LOGOUT) */
.btn-logout {
  background: transparent;
  border: none;
  color: #f87171;
  padding: 1.5rem;
  text-align: left;
  cursor: pointer;
  border-top: 1px solid #374151;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 1rem;
  width: 100%;
  box-sizing: border-box;
  flex-shrink: 0; /* 🟢 CORREÇÃO: Garante que o botão de logout fique sempre fixo na base */
}

.btn-logout:hover {
  background-color: #374151;
}

.sidebar.collapsed .btn-logout {
  justify-content: center;
  padding: 1.5rem 0;
  gap: 0;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateX(-6px); }
  to { opacity: 1; transform: translateX(0); }
}
</style>