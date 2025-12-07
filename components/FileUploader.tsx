import React, { useRef, useState } from 'react';
import { Upload, CheckCircle, FileText } from 'lucide-react';

interface FileUploaderProps {
  label: string;
  accept: string;
  extensionLabel: string;
  file: File | null;
  onFileSelect: (file: File) => void;
  icon?: React.ReactNode;
}

export const FileUploader: React.FC<FileUploaderProps> = ({ 
  label, 
  accept, 
  extensionLabel, 
  file, 
  onFileSelect,
  icon 
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.name.endsWith(extensionLabel) || droppedFile.type.includes(extensionLabel.replace('.', ''))) {
          onFileSelect(droppedFile);
      } else {
        alert(`Por favor, envie um arquivo válido do tipo ${extensionLabel}.`);
      }
    }
  };

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileSelect(e.target.files[0]);
    }
  };

  return (
    <div 
      className={`
        relative group cursor-pointer rounded-2xl border border-dashed transition-all duration-300 ease-out
        flex flex-col items-center justify-center h-52 text-center overflow-hidden
        ${isDragging 
          ? 'border-indigo-500 bg-indigo-50/50 scale-[1.02]' 
          : 'border-slate-300 hover:border-indigo-400 hover:bg-white bg-slate-50'}
        ${file ? 'border-emerald-400 bg-emerald-50/30 ring-1 ring-emerald-100' : ''}
      `}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
    >
      <input 
        type="file" 
        ref={inputRef} 
        className="hidden" 
        accept={accept} 
        onChange={handleInputChange} 
      />
      
      {file ? (
        <div className="animate-fade-in flex flex-col items-center">
          <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-3 shadow-sm">
            <CheckCircle size={28} />
          </div>
          <div className="px-4">
            <p className="font-semibold text-slate-800 text-base truncate max-w-[240px]">{file.name}</p>
            <p className="text-sm text-slate-500 mt-1 font-medium">Pronto para uso</p>
          </div>
          <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
             <span className="text-xs font-semibold text-emerald-600 bg-emerald-100 px-2 py-1 rounded-full">Alterar</span>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center pointer-events-none">
          <div className={`
            w-14 h-14 rounded-full flex items-center justify-center mb-4 transition-colors duration-300 shadow-sm
            ${isDragging ? 'bg-indigo-100 text-indigo-600' : 'bg-white text-slate-400 group-hover:text-indigo-500 group-hover:scale-110'}
          `}>
            {icon || <FileText size={28} />}
          </div>
          <div className="px-6">
            <p className="font-semibold text-slate-700 text-lg group-hover:text-indigo-900 transition-colors">
              {label}
            </p>
            <p className="text-sm text-slate-500 mt-2">
              Arraste ou clique para selecionar
            </p>
            <span className="inline-block mt-3 text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-200/50 px-2 py-1 rounded">
              {extensionLabel}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};