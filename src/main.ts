import '@fontsource/fraunces/300.css'
import '@fontsource/fraunces/400.css'
import '@fontsource/fraunces/600.css'
import '@fontsource/fraunces/400-italic.css'
import '@fontsource/source-serif-4/400.css'
import '@fontsource/source-serif-4/600.css'
import '@fontsource/source-serif-4/400-italic.css'
import '@fontsource/jetbrains-mono/400.css'

// Apply theme synchronously to avoid a flash of incorrect mode (FOUC).
// Reads the same storage key as src/composables/useTheme.ts.
;(function applyInitialTheme() {
  try {
    const stored = localStorage.getItem('theme')
    const isDark = stored === 'dark' ||
      (stored !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches)
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light')
  } catch {
    document.documentElement.setAttribute('data-theme', 'light')
  }
})()

import { createApp } from 'vue'
import App from './App.vue'
import { router } from './router'
import { db, seedIfEmpty } from './db'

async function bootstrap() {
  try {
    await db.open()
    await seedIfEmpty()
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    document.getElementById('app')!.innerHTML = `
      <div style="padding: 24px; font-family: sans-serif">
        <h1>Storage unavailable</h1>
        <p>This app needs IndexedDB. Your browser blocked it (private/incognito mode?).</p>
        <p>Open a normal window and try again.</p>
        <pre style="color:#999">${msg}</pre>
      </div>
    `
    return
  }
  const app = createApp(App)
  app.use(router)
  app.mount('#app')
}

bootstrap()
