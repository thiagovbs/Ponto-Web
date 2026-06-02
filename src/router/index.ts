import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import LoginView from '../views/LoginView.vue';
import DashboardView from '../views/DashboardView.vue';
import FuncionariosView from '../views/FuncionariosView.vue';
import RelatoriosView from '../views/RelatoriosView.vue';
import JornadasView from '../views/JornadasView.vue';
import AuditoriaView from '../views/AuditoriaView.vue';
import AfastamentoView from '../views/AfastamentosView.vue';
import FiscalizacaoView from '../views/FiscalizacaoView.vue';
import SetoresView from '../views/SetoresView.vue';
import FiliaisView from '../views/FiliaisView.vue';
import SuperAdminView from '../views/SuperAdminView.vue';


const routes: RouteRecordRaw[] = [
  { path: '/', component: LoginView },
  { 
    path: '/dashboard', 
    component: DashboardView, 
    meta: { requiresAuth: true } 
  },
  { 
    path: '/funcionarios', 
    component: FuncionariosView, 
    meta: { requiresAuth: true } 
  },
  { 
    path: '/relatorios', 
    component: RelatoriosView, 
    meta: { requiresAuth: true } 
  },
  { 
    path: '/jornadas', 
    component: JornadasView, 
    meta: { requiresAuth: true } 
  },
  { 
    path: '/auditoria', 
    component: AuditoriaView, 
    meta: { requiresAuth: true } 
  },
  {
    path: '/afastamentos',
    component: AfastamentoView, 
    meta: { requiresAdmin: true } 
  },
  {
    path: '/fiscalizacao',
    component: FiscalizacaoView, 
    meta: { requiresAdmin: true } 
  },
  {
    path: '/setores',
    component: SetoresView, 
    meta: { requiresAdmin: true } 
  },
  {
    path: '/filiais',
    component: FiliaisView, 
    meta: { requiresAdmin: true } 
  },
  {
    path: '/super-admin',
    component: SuperAdminView, 
    meta: { requiresAdmin: true } 
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// Trava de segurança: Verifica se a rota exige login
router.beforeEach((to, _from, next) => {
  const isAuthenticated = !!localStorage.getItem('ponto_token');
  
  if (to.meta.requiresAuth && !isAuthenticated) {
    next('/');
  } else {
    next();
  }
});

export default router;