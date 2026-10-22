'use client'

import React, { useState } from 'react'
import { apiClient } from '../lib/api'

export default function ApiKeySettings({ children }: { children: React.ReactNode }) {
  const [draft, setDraft] = useState('')
  const [configured, setConfigured] = useState(false)
  const [version, setVersion] = useState(0)

  const apply = (key: string) => {
    apiClient.setApiKey(key)
    setConfigured(Boolean(key))
    setDraft('')
    setVersion(value => value + 1)
  }

  return <>
    <form className="mx-auto max-w-6xl p-4 flex flex-wrap items-center gap-3"
      onSubmit={event => { event.preventDefault(); apply(draft.trim()) }}>
      <label htmlFor="api-key">API key</label>
      <input id="api-key" type="password" autoComplete="off"
        className="border rounded p-2" value={draft}
        onChange={event => setDraft(event.target.value)} placeholder="Paste your API key" />
      <button type="submit" className="border rounded p-2">Use key</button>
      <button type="button" className="border rounded p-2" onClick={() => apply('')}>Forget key</button>
      <span role="status">{configured ? 'Key set for this tab.' : 'Key required for links and analytics.'} Cleared on reload.</span>
    </form>
    <div key={version}>{children}</div>
  </>
}
