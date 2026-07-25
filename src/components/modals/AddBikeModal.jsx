import { useRef, useState } from 'react'
import Sheet from '../Sheet.jsx'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext'

export default function AddBikeModal({ onClose, onSave }) {
  const { user } = useAuth()
  const [name, setName] = useState('')
  const [make, setMake] = useState('')
  const [odometer, setOdometer] = useState('')
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const inputRef = useRef(null)

  const pickFile = (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  const submit = async (e) => {
    e.preventDefault()
    setError(''); setBusy(true)

    let photo_url = null
    try {
      if (file) {
        const ext = file.name.split('.').pop() || 'jpg'
        const path = `${user.id}/${Date.now()}.${ext}`
        const { error: upErr } = await supabase.storage.from('bike-photos').upload(path, file, {
          cacheControl: '3600', upsert: false, contentType: file.type,
        })
        if (upErr) throw upErr
        const { data } = supabase.storage.from('bike-photos').getPublicUrl(path)
        photo_url = data?.publicUrl || null
      }
    } catch (err) {
      setBusy(false)
      return setError(err.message || 'Photo upload failed — you can add one later.')
    }

    const { error } = await onSave({ name, make, odometer_km: Number(odometer) || 0, photo_url })
    setBusy(false)
    if (error) return setError(error.message)
    onClose()
  }

  return (
    <Sheet title="Add a bike" subtitle="Add another ride to your garage" onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div>
          <input ref={inputRef} type="file" accept="image/*" capture="environment" onChange={pickFile} className="hidden" />
          {preview ? (
            <button type="button" onClick={() => inputRef.current?.click()} className="relative w-full rounded-2xl overflow-hidden border border-black/10 dark:border-white/15">
              <img src={preview} alt="Bike preview" className="w-full h-40 object-cover" />
              <span className="absolute bottom-2 right-2 bg-black/70 text-white text-xs font-semibold px-2.5 py-1 rounded-full">Change photo</span>
            </button>
          ) : (
            <button type="button" onClick={() => inputRef.current?.click()}
              className="tap w-full rounded-2xl border-2 border-dashed border-black/15 dark:border-white/20 py-6 flex flex-col items-center gap-2 text-ink/60 dark:text-white/60">
              <CameraIcon />
              <span className="text-sm font-semibold">Add a photo of your bike</span>
              <span className="text-xs text-ink/40 dark:text-white/40">Optional — we'll use a clean placeholder if you skip this</span>
            </button>
          )}
        </div>
        <input className="input" placeholder="Nickname — e.g. My Yamaha R15" value={name} onChange={(e) => setName(e.target.value)} required />
        <input className="input" placeholder="Make & model — e.g. Yamaha R15 V4" value={make} onChange={(e) => setMake(e.target.value)} />
        <input className="input" type="number" inputMode="numeric" placeholder="Current odometer (km)" value={odometer} onChange={(e) => setOdometer(e.target.value)} />
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button className="btn-primary mt-2" disabled={busy}>{busy ? 'Saving…' : 'Add to garage'}</button>
      </form>
    </Sheet>
  )
}

function CameraIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  )
}
