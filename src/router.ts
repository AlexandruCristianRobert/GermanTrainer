import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  { path: '/', name: 'home', component: () => import('./modules/home/Home.vue') },
  { path: '/history', name: 'history', component: () => import('./modules/history/HistoryPage.vue') },
  { path: '/settings', name: 'settings', component: () => import('./modules/settings/Settings.vue') },
  { path: '/nouns', name: 'nouns', component: () => import('./modules/nouns/NounsHome.vue') },
  { path: '/nouns/manage', name: 'nouns-manage', component: () => import('./modules/nouns/ManageNouns.vue') },
  { path: '/nouns/quiz', name: 'nouns-quiz', component: () => import('./modules/nouns/QuizSetup.vue') },
  { path: '/nouns/quiz/run', name: 'nouns-quiz-run', component: () => import('./modules/nouns/QuizRunner.vue') },
  { path: '/adjectives', name: 'adjectives', component: () => import('./modules/adjectives/AdjectivesHome.vue') },
  { path: '/adjectives/manage', name: 'adjectives-manage', component: () => import('./modules/adjectives/ManageAdjectives.vue') },
  { path: '/adjectives/quiz', name: 'adjectives-quiz', component: () => import('./modules/adjectives/QuizSetup.vue') },
  { path: '/adjectives/quiz/run', name: 'adjectives-quiz-run', component: () => import('./modules/adjectives/QuizRunner.vue') },
  { path: '/verbs', name: 'verbs', component: () => import('./modules/verbs/VerbsHome.vue') },
  { path: '/verbs/list', name: 'verbs-list', component: () => import('./modules/verbs/ListVerbs.vue') },
  { path: '/verbs/translation', name: 'verbs-translation', component: () => import('./modules/verbs/TranslationQuizSetup.vue') },
  { path: '/verbs/translation/run', name: 'verbs-translation-run', component: () => import('./modules/verbs/TranslationQuizRunner.vue') },
  { path: '/verbs/translation/result', name: 'verbs-translation-result', component: () => import('./modules/verbs/TranslationQuizResult.vue') },
  { path: '/verbs/conjugation', name: 'verbs-conjugation', component: () => import('./modules/verbs/ConjugationQuizSetup.vue') },
  { path: '/verbs/conjugation/run', name: 'verbs-conjugation-run', component: () => import('./modules/verbs/ConjugationQuizRunner.vue') },
  { path: '/verbs/cheatsheet', name: 'verbs-cheatsheet', component: () => import('./modules/verbs/CheatSheet.vue') },
  { path: '/prepositions', name: 'prepositions', component: () => import('./modules/prepositions/PrepositionsHome.vue') },
  { path: '/prepositions/list', name: 'prepositions-list', component: () => import('./modules/prepositions/ListPrepositions.vue') },
  { path: '/prepositions/case-quiz', name: 'prepositions-case', component: () => import('./modules/prepositions/CaseQuizSetup.vue') },
  { path: '/prepositions/case-quiz/run', name: 'prepositions-case-run', component: () => import('./modules/prepositions/CaseQuizRunner.vue') },
  { path: '/prepositions/case-quiz/result', name: 'prepositions-case-result', component: () => import('./modules/prepositions/CaseQuizResult.vue') },
  { path: '/prepositions/article-quiz', name: 'prepositions-article', component: () => import('./modules/prepositions/ArticleQuizSetup.vue') },
  { path: '/prepositions/article-quiz/run', name: 'prepositions-article-run', component: () => import('./modules/prepositions/ArticleQuizRunner.vue') },
  { path: '/prepositions/two-way-quiz', name: 'prepositions-twoway', component: () => import('./modules/prepositions/TwoWayQuizSetup.vue') },
  { path: '/prepositions/two-way-quiz/run', name: 'prepositions-twoway-run', component: () => import('./modules/prepositions/TwoWayQuizRunner.vue') }
]

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})
