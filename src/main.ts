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
