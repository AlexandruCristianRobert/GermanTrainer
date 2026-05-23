import 'fake-indexeddb/auto'

// Node 26 exposes a built-in `localStorage` global that is `undefined` unless
// --localstorage-file is provided.  Vitest's jsdom environment does not override
// it (localStorage/sessionStorage are absent from vitest's KEYS allow-list), so
// the Node-level undefined wins over jsdom's Storage implementation.
// Patch globalThis here so all tests in jsdom context see a real Storage object.
if (typeof window !== 'undefined') {
  const w = window as any
  if (typeof localStorage === 'undefined' && w._localStorage != null) {
    Object.defineProperty(globalThis, 'localStorage', {
      get: () => w._localStorage,
      set: () => {},
      configurable: true,
    })
  }
  if (typeof sessionStorage === 'undefined' && w._sessionStorage != null) {
    Object.defineProperty(globalThis, 'sessionStorage', {
      get: () => w._sessionStorage,
      set: () => {},
      configurable: true,
    })
  }
}
