import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  { path: '/', name: 'home', component: () => import('./modules/home/Home.vue') },
  { path: '/settings', name: 'settings', component: () => import('./modules/settings/Settings.vue') },
  { path: '/nouns', name: 'nouns', component: () => import('./modules/nouns/NounsHome.vue') },
  { path: '/nouns/manage', name: 'nouns-manage', component: () => import('./modules/nouns/ManageNouns.vue') },
  { path: '/nouns/quiz', name: 'nouns-quiz', component: () => import('./modules/nouns/QuizSetup.vue') },
  { path: '/nouns/quiz/run', name: 'nouns-quiz-run', component: () => import('./modules/nouns/QuizRunner.vue') },
  { path: '/adjectives', name: 'adjectives', component: () => import('./modules/adjectives/AdjectivesHome.vue') },
  { path: '/adjectives/manage', name: 'adjectives-manage', component: () => import('./modules/adjectives/ManageAdjectives.vue') },
  { path: '/adjectives/quiz', name: 'adjectives-quiz', component: () => import('./modules/adjectives/QuizSetup.vue') },
  { path: '/adjectives/quiz/run', name: 'adjectives-quiz-run', component: () => import('./modules/adjectives/QuizRunner.vue') }
]

export const router = createRouter({
  history: createWebHistory(),
  routes
})
