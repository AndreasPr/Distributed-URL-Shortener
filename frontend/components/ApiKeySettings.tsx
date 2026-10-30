'use client'

import { createContext, useContext, useState } from 'react'
import { apiClient, DEMO_MODE } from '../lib/api'
import { Button } from './ui/button'
import { Input } from './ui/input'

const KeyContext = createContext({ configured: false, apply: (_key: string) => {} })
export function ApiKeyProvider({ children }: { children: React.ReactNode }) {
  const [configured, setConfigured] = useState(false)
  const apply = (key: string) => { apiClient.setApiKey(key); setConfigured(Boolean(key)) }
  return <KeyContext.Provider value={{ configured, apply }}>{children}</KeyContext.Provider>
}
export default function ApiKeySettings() {
  const [draft, setDraft] = useState('')
  const { configured, apply } = useContext(KeyContext)
  if (DEMO_MODE) return <p>No API key is needed for sample data. Real API keys stay in memory and are cleared on reload.</p>
  return <form className="space-y-4" onSubmit={event => { event.preventDefault(); apply(draft.trim()); setDraft('') }}>
    <label htmlFor="api-key" className="block text-sm font-medium">API key</label>
    <Input id="api-key" type="password" autoComplete="off" value={draft} onChange={event => setDraft(event.target.value)} placeholder="Paste your API key" />
    <div className="flex gap-3"><Button type="submit">Use key</Button><Button type="button" variant="outline" onClick={() => { apply(''); setDraft('') }}>Forget key</Button></div>
    <p role="status" className="text-sm text-muted-foreground">{configured ? 'Key set for this tab.' : 'Key required for links and analytics.'} Cleared on reload.</p>
  </form>
}
