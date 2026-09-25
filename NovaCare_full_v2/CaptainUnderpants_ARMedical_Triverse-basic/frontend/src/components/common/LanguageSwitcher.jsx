// src/components/common/LanguageSwitcher.jsx
import { useState } from 'react';
import { Languages } from 'lucide-react';

const LanguageSwitcher = ({ lang, setLang, languages, compact = false }) => {
  const [open, setOpen] = useState(false);
  const current = languages.find((l) => l.code === lang) || languages[0];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center gap-1.5 ${compact ? 'w-10 h-10 justify-center' : 'px-3 py-2'} bg-bone/90 backdrop-blur border-2 border-ink rounded-lg shadow-brutal-sm hover:bg-bone font-mono text-xs uppercase tracking-wider`}
        title="Language"
      >
        <Languages size={14} strokeWidth={2.5} />
        {!compact && current.native}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-36 bg-bone border-2 border-ink rounded-lg shadow-brutal-sm overflow-hidden z-[10001]">
          {languages.map((l) => (
            <button
              key={l.code}
              onClick={() => { setLang(l.code); setOpen(false); }}
              className={`w-full text-left px-3 py-2 text-sm font-body hover:bg-primary/10 ${l.code === lang ? 'bg-primary/20 font-semibold' : ''}`}
            >
              {l.native}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LanguageSwitcher;
