// src/components/upload/UploadDropzone.jsx
import { useRef, useState } from 'react';
import { Upload as UploadIcon, FileText, FileImage, File as FileIcon } from 'lucide-react';

const ACCEPT = '.pdf,.doc,.docx,.txt,.jpg,.jpeg,.png';

const iconFor = (name = '') => {
  const ext = name.split('.').pop()?.toLowerCase();
  if (['jpg','jpeg','png'].includes(ext)) return FileImage;
  if (['pdf','doc','docx','txt'].includes(ext)) return FileText;
  return FileIcon;
};

const UploadDropzone = ({ onFile, busy }) => {
  const inputRef = useRef(null);
  const [drag, setDrag] = useState(false);
  const [picked, setPicked] = useState(null);

  const pickFile = (file) => {
    if (!file) return;
    setPicked(file);
    onFile?.(file);
  };

  const handleDrop = (e) => {
    e.preventDefault(); setDrag(false);
    pickFile(e.dataTransfer.files?.[0]);
  };

  const Icon = picked ? iconFor(picked.name) : UploadIcon;

  return (
    <div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={handleDrop}
        className={[
          'w-full text-center p-8 sm:p-12 border-2 border-dashed rounded-2xl transition',
          drag ? 'border-primary bg-accent/20' : 'border-ink/40 bg-white/60',
          busy ? 'opacity-60 pointer-events-none' : 'hover:border-ink hover:bg-white/80'
        ].join(' ')}
      >
        <div className="w-14 h-14 mx-auto grid place-items-center bg-primary border-2 border-ink rounded-xl shadow-brutal-sm mb-3">
          <Icon size={22} strokeWidth={2.5} className="text-white" />
        </div>
        <p className="font-display font-bold text-lg">
          {picked ? picked.name : 'Drop a medical report here'}
        </p>
        <p className="font-mono text-xs text-ink/60 mt-1">
          {picked
            ? `${(picked.size / 1024).toFixed(0)} KB`
            : 'PDF · DOC · DOCX · TXT · JPG · PNG · max 10MB'}
        </p>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => pickFile(e.target.files?.[0])}
      />
    </div>
  );
};

export default UploadDropzone;
