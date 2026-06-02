import type { Plugin } from 'vite'
import { spawn } from 'node:child_process'
import {
  extractClaudeText, buildClaudeArgs,
  LOCAL_AI_HEALTH_PATH, LOCAL_AI_GENERATE_PATH
} from '../src/composables/localClaude'

export function localClaudePlugin(): Plugin {
  return {
    name: 'local-claude-dev',
    apply: 'serve', // dev server only — absent from `vite build`
    configureServer(server) {
      server.middlewares.use(LOCAL_AI_HEALTH_PATH, (_req, res) => {
        res.setHeader('content-type', 'application/json')
        res.end(JSON.stringify({ ok: true }))
      })

      server.middlewares.use(LOCAL_AI_GENERATE_PATH, (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; res.end(); return }
        let raw = ''
        req.on('data', c => { raw += c })
        req.on('end', () => {
          let body: { contents?: string; systemInstruction?: string; model?: string }
          try { body = JSON.parse(raw || '{}') }
          catch { res.statusCode = 400; res.end(JSON.stringify({ error: 'invalid JSON body' })); return }

          // Merge the system instruction into the prompt so nothing untrusted
          // goes on argv; only fixed flags do.
          const prompt = body.systemInstruction
            ? `${body.systemInstruction}\n\n${body.contents ?? ''}`
            : (body.contents ?? '')

          const env = { ...process.env }
          delete env.ANTHROPIC_API_KEY // force subscription auth

          const child = spawn('claude', buildClaudeArgs({ model: body.model }), {
            env,
            shell: process.platform === 'win32' // .cmd shim needs a shell on Windows
          })

          let out = '', err = ''
          child.stdout.on('data', d => { out += d })
          child.stderr.on('data', d => { err += d })
          child.on('error', e => {
            res.statusCode = 500
            res.end(JSON.stringify({ error: `could not start claude: ${e.message}` }))
          })
          child.on('close', code => {
            if (code !== 0) {
              res.statusCode = 500
              res.end(JSON.stringify({ error: err.trim() || `claude exited with code ${code}` }))
              return
            }
            try {
              res.setHeader('content-type', 'application/json')
              res.end(JSON.stringify({ text: extractClaudeText(out) }))
            } catch (e) {
              res.statusCode = 500
              res.end(JSON.stringify({ error: `failed to parse claude output: ${(e as Error).message}` }))
            }
          })
          child.stdin.write(prompt)
          child.stdin.end()
        })
      })
    }
  }
}
