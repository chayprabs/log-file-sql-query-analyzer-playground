'use client';

import { useState, useRef } from 'react';
import { useLogStore } from '@/stores/log-store';

export function FileUploader() {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const loadFile = useLogStore((s) => s.loadFile);
  const isLoading = useLogStore((s) => s.isLoading);
  const error = useLogStore((s) => s.error);
  const clearError = useLogStore((s) => s.clearError);

  const handleFile = async (file: File) => {
    const content = await file.text();
    await loadFile(content, file.name);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) await handleFile(file);
  };

  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await handleFile(file);
  };

  return (
    <div className="w-full">
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragging
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900'
            : 'border-zinc-300 dark:border-zinc-600 hover:border-zinc-400'
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".log,.txt,.json,.gz"
          onChange={handleInputChange}
        />
        
        {isLoading ? (
          <div className="text-zinc-500">Loading...</div>
        ) : (
          <>
            <div className="text-zinc-600 dark:text-zinc-400 mb-2">
              Drop a log file here or click to select
            </div>
            <div className="text-xs text-zinc-400">
              Supports syslog, access logs, JSON, journald
            </div>
          </>
        )}
      </div>
      
      {error && (
        <div className="mt-2 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded text-sm flex justify-between items-center">
          <span>{error}</span>
          <button onClick={clearError} className="font-bold">×</button>
        </div>
      )}
    </div>
  );
}