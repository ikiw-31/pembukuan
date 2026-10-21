import { useSyncExternalStore } from 'react'

function subscribe(cb: () => void) {
  window.addEventListener('hashchange', cb)
  return () => window.removeEventListener('hashchange', cb)
}

const getHash = () => window.location.hash.slice(1) || '/'

export function useRoute() {
  const hash = useSyncExternalStore(subscribe, getHash)
  const [path, qs = ''] = hash.split('?')
  return { path, query: new URLSearchParams(qs) }
}

export function navigate(to: string, opts: { replace?: boolean } = {}) {
  const state = { inApp: opts.replace ? Boolean(history.state?.inApp) : true }
  if (opts.replace) history.replaceState(state, '', `#${to}`)
  else history.pushState(state, '', `#${to}`)
  window.dispatchEvent(new HashChangeEvent('hashchange'))
  window.scrollTo(0, 0)
}

/** Kembali ke layar sebelumnya di dalam aplikasi, atau ke `fallback` jika dibuka langsung. */
export function goBack(fallback = '/admin') {
  if (history.state?.inApp) history.back()
  else navigate(fallback, { replace: true })
}
