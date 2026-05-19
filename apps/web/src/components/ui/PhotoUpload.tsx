'use client';

import { useRef, useState } from 'react';

interface Props {
  value:     string;           // current URL or empty
  onChange:  (url: string) => void;
  label?:    string;
  required?: boolean;
  size?:     number;           // avatar circle diameter in px, default 80
  disabled?: boolean;
}

export default function PhotoUpload({ value, onChange, label = 'Photo', required = false, size = 80, disabled = false }: Props) {
  const inputRef               = useRef<HTMLInputElement>(null);
  const [uploading, setUpload] = useState(false);
  const [err,       setErr]    = useState('');

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowed.includes(file.type)) { setErr('Please select a JPG, PNG, or WEBP image.'); return; }
    if (file.size > 5 * 1024 * 1024)  { setErr('Image must be under 5 MB.'); return; }

    setErr(''); setUpload(true);
    try {
      const token = typeof window !== 'undefined' ? (localStorage.getItem('token') ?? '') : '';
      const fd    = new FormData();
      fd.append('file', file);
      const res  = await fetch('/api/upload', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      onChange(data.url);
    } catch (ex: any) {
      setErr(ex.message || 'Upload failed — please try again.');
    } finally {
      setUpload(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      {label && (
        <p className="text-xs font-medium text-surface-500 dark:text-gray-400 self-start">
          {label}{required && <span className="text-red-500 ml-0.5">*</span>}
        </p>
      )}

      {/* Circle preview / trigger */}
      <button
        type="button"
        onClick={() => !disabled && inputRef.current?.click()}
        disabled={disabled || uploading}
        style={{ width: size, height: size }}
        className={`relative rounded-full overflow-hidden border-2 flex items-center justify-center shrink-0 transition-all group ${
          disabled
            ? 'border-surface-200 dark:border-gray-700 cursor-not-allowed opacity-60'
            : 'border-brand-300 dark:border-brand-700 hover:border-brand-500 cursor-pointer'
        } ${value ? '' : 'bg-surface-100 dark:bg-gray-800'}`}
      >
        {/* Photo or placeholder */}
        {value ? (
          <img src={value} alt="Profile photo" className="w-full h-full object-cover" />
        ) : (
          <svg width={size * 0.4} height={size * 0.4} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-surface-300 dark:text-gray-600">
            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
        )}

        {/* Upload overlay */}
        {!disabled && (
          <div className={`absolute inset-0 flex flex-col items-center justify-center rounded-full transition-opacity ${
            uploading ? 'bg-black/40 opacity-100' : 'bg-black/0 opacity-0 group-hover:opacity-100 group-hover:bg-black/30'
          }`}>
            {uploading ? (
              <svg className="animate-spin text-white" width={size * 0.28} height={size * 0.28} viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
            ) : (
              <>
                <svg width={size * 0.25} height={size * 0.25} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
                  <circle cx="12" cy="13" r="4"/>
                </svg>
                <span className="text-white font-medium mt-0.5" style={{ fontSize: size * 0.13 }}>
                  {value ? 'Change' : 'Upload'}
                </span>
              </>
            )}
          </div>
        )}
      </button>

      {/* Remove button */}
      {value && !disabled && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="text-[11px] text-red-500 hover:text-red-700 dark:text-red-400 transition-colors"
        >
          Remove photo
        </button>
      )}

      {err && <p className="text-[11px] text-red-500 dark:text-red-400 text-center max-w-[120px]">{err}</p>}

      {/* Hidden file input — accepts images, allows camera on mobile */}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        capture="user"
        className="hidden"
        onChange={pick}
      />
    </div>
  );
}
