import { useState } from 'react'
import Sheet from '../Sheet.jsx'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext'
import { pickPhoto } from '../../lib/pickPhoto'

export const DOC_TYPES = ['Insurance', 'RC', 'PUC', 'License', 'Other']

export default function AddDocumentModal({ bikeName, onClose, onSave }) {
  const { user } = useAuth()
  const [type, setType] = useState('Insurance')
  const [number, setNumber] = useState('')
  const [expiry, setExpiry] = useState('')
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [busy, setBusy] = useState(false)
  const [uploadPct, setUploadPct] = useState(0)
  const [error, setError] = useState('')

  const choosePhoto = async () => {
    setError('')
    try {
      const f = await pickPhoto()
      setFile(f)
      setPreview(URL.createObjectURL(f))
    } catch {
      // user cancelled the picker — nothing to do
    }
  }

  const submit = async (e) => {
    e.preventDefault()
    setError(''); setBusy(true)

    let file_url = null
    try {
      if (file) {
        setUploadPct(10)
        const ext = file.name.split('.').pop() || 'jpg'
        const path = `${user.id}/${type.toLowerCase()}-${Date.now()}.${ext}`
        const { error: upErr } = await supabase.storage.from('vault-files').upload(path, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type,
        })
        if (upErr) throw upErr
        setUploadPct(80)
        // vault-files is a private bucket — sign a long-lived URL so the
        // document can still be viewed/shared from inside the app.
        const { data: signed, error: signErr } = await supabase.storage
          .from('vault-files')
          .createSignedUrl(path, 60 * 60 * 24 * 365 * 5) // 5 years
        if (signErr) throw signErr
        file_url = signed?.signedUrl || null
        setUploadPct(100)
      }
    } catch (err) {
      setBusy(false)
      return setError(err.message || 'Photo upload failed. You can still save without it.')
    }

    const { error } = await onSave({ doc_type: type, doc_number: number, expiry_date: expiry || null, file_url })
    setBusy(false)
    if (error) return setError(error.message)
    onClose()
  }

  return (
    <Sheet title="Add Document" subtitle={`For ${bikeName}`} onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-6">
        <div className="flex gap-2 overflow-x-auto -mx-1 px-1 pb-1">
          {DOC_TYPES.map((t) => (
            <button type="button" key={t} onClick={() => setType(t)}
              className={`chip ${type === t ? 'bg-ink text-white border-ink dark:bg-white dark:text-ink dark:border-white' : 'border-black/10 dark:border-white/15'}`}>
              {t}
            </button>
          ))}
        </div>

        <div>
          <label className="block text-sm font-medium text-ink/70 dark:text-white/70 mb-2">Upload document photo</label>
          {preview ? (
            <button type="button" onClick={choosePhoto} className="relative w-full rounded-2xl overflow-hidden border border-black/10 dark:border-white/15">
              <img src={preview} alt="Document preview" className="w-full h-44 object-cover" />
              <span className="absolute bottom-2 right-2 bg-black/70 text-white text-xs font-semibold px-2.5 py-1 rounded-full">Retake / choose another</span>
            </button>
          ) : (
            <button type="button" onClick={choosePhoto}
              className="tap w-full rounded-2xl border-2 border-dashed border-black/15 dark:border-white/20 py-8 flex flex-col items-center gap-2 text-ink/60 dark:text-white/60">
              <CameraIcon />
              <span className="text-sm font-semibold">Take a photo or choose from gallery</span>
              <span className="text-xs text-ink/40 dark:text-white/40">RC, insurance, PUC — snap it and we'll store it in your Vault</span>
            </button>
          )}
          {busy && file && (
            <div className="h-1.5 rounded-full bg-black/10 dark:bg-white/10 mt-3 overflow-hidden">
              <div className="h-full bg-amber transition-all" style={{ width: `${uploadPct}%` }} />
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-ink/70 dark:text-white/70 mb-2">Document / policy number</label>
          <input className="input" placeholder="POLI-88123" value={number} onChange={(e) => setNumber(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium text-ink/70 dark:text-white/70 mb-2">Expiry date</label>
          <input className="input" type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} />
          <p className="text-xs text-ink/40 dark:text-white/40 mt-1.5">We'll remind you a few days before this expires.</p>
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button className="btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save Document'}</button>
      </form>
    </Sheet>
  )
}

function CameraIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  )
}
