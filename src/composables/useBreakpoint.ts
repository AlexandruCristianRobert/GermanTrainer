import { onBeforeUnmount, ref, type Ref } from 'vue'

const MOBILE_QUERY = '(max-width: 767.99px)'

export function useBreakpoint(): { isMobile: Ref<boolean> } {
  const mql = window.matchMedia(MOBILE_QUERY)
  const isMobile = ref(mql.matches)

  function onChange(e: { matches: boolean }) {
    isMobile.value = e.matches
  }

  mql.addEventListener('change', onChange)
  onBeforeUnmount(() => {
    mql.removeEventListener('change', onChange)
  })

  return { isMobile }
}
