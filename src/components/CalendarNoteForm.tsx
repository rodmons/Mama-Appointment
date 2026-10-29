import { useState, type FormEvent } from 'react'
import { Notice } from './Layout'

export function CalendarNoteForm({ busy, onSave, onCancel, initialContent = '' }: { busy: boolean; onSave: (content: string) => Promise<void>; onCancel: () => void; initialContent?: string }) {
  const [content, setContent] = useState(initialContent)
  const [error, setError] = useState('')

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (busy) return
    if (!content.trim()) { setError('Write a note before saving.'); return }
    setError('')
    try { await onSave(content) }
    catch (saveError) { setError(saveError instanceof Error ? saveError.message : 'The note could not be saved. Please try again.') }
  }

  return <form className="app-form note-form" onSubmit={submit}>
    {error && <Notice tone="error">{error}</Notice>}
    <div><label htmlFor="calendar-note-content">Note</label><textarea id="calendar-note-content" autoFocus value={content} onChange={(event) => setContent(event.target.value)} rows={6} disabled={busy} aria-invalid={Boolean(error)} placeholder="Write a note for this day…" /></div>
    <div className="form-actions"><button className="button note-cancel" type="button" onClick={onCancel} disabled={busy}>Cancel</button><button className="button note-save" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button></div>
  </form>
}
