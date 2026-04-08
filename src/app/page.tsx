'use client';

import { useRouter } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import { useLog } from '@/context/LogContext';

function UploadForm() {
  const router = useRouter();
  const { loadFile, loading, error, db } = useLog();
  const [progress, setProgress] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (db && !loading) {
      router.push('/query');
    }
  }, [db, loading, router]);

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      setProgress('Parsing file...');
      await loadFile(file);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProgress('Parsing file...');
      await loadFile(file);
    }
  };

  const formats = [
    'Nginx access log',
    'Apache access log',
    'Syslog',
    'systemd journal (JSON)',
    'Generic JSON lines',
    'Plain text',
  ];

  return (
    <div style={{ padding: '20px', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: '24px', marginBottom: '20px' }}>lnav-web</h1>
      <p style={{ marginBottom: '20px' }}>Browser-native log analysis with SQL</p>

      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        style={{
          border: '2px dashed #ccc',
          borderRadius: '8px',
          padding: '60px 20px',
          textAlign: 'center',
          cursor: 'pointer',
          marginBottom: '20px',
        }}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".log,.txt,.json"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
        
        {loading ? (
          <div>{progress || 'Loading...'}</div>
        ) : (
          <div>
            <div>Drop a log file here</div>
            <div style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>
              or click to select
            </div>
          </div>
        )}
      </div>

      {error && (
        <div style={{ color: 'red', marginBottom: '10px' }}>{error}</div>
      )}

      <div style={{ fontSize: '12px', color: '#666' }}>
        <strong>Accepted formats:</strong>
        <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
          {formats.map(f => <li key={f}>{f}</li>)}
        </ul>
      </div>
    </div>
  );
}

export default function Home() {
  return <UploadForm />;
}