import React, { useState, useRef } from 'react';
import axios from 'axios';

export default function PlayerImport({ onImported }) {
  const [dragging, setDragging] = useState(false);
  const [status, setStatus] = useState(null); // { type: 'ok'|'err', msg }
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  async function uploadFile(file) {
    if (!file) return;
    setLoading(true);
    setStatus(null);
    const form = new FormData();
    form.append('file', file);
    try {
      const res = await axios.post('/api/admin/import-players', form);
      setStatus({ type: 'ok', msg: res.data.message });
      onImported?.();
    } catch (err) {
      setStatus({ type: 'err', msg: err.response?.data?.error || 'Upload failed' });
    } finally {
      setLoading(false);
    }
  }

  function onDrop(e) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
  }

  async function downloadTemplate() {
    try {
      const res = await axios.get('/api/admin/csv-template', { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'players-template.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to download template');
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        style={{
          border: `2px dashed ${dragging ? '#f59e0b' : '#334155'}`,
          borderRadius: '10px',
          padding: '2rem',
          textAlign: 'center',
          cursor: 'pointer',
          background: dragging ? '#1e293b' : '#0f172a',
          transition: 'all 0.15s',
        }}
      >
        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📄</div>
        <div style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
          {loading ? 'Uploading…' : 'Drop CSV here or click to select'}
        </div>
        <div style={{ color: '#475569', fontSize: '0.75rem', marginTop: '0.25rem' }}>
          Format: name, pool (header row required)
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          style={{ display: 'none' }}
          onChange={e => uploadFile(e.target.files[0])}
        />
      </div>

      {/* Status */}
      {status && (
        <div style={{
          padding: '0.6rem 1rem',
          borderRadius: '7px',
          fontSize: '0.85rem',
          background: status.type === 'ok' ? '#14532d40' : '#7f1d1d40',
          color: status.type === 'ok' ? '#22c55e' : '#ef4444',
          border: `1px solid ${status.type === 'ok' ? '#22c55e40' : '#ef444440'}`,
        }}>
          {status.msg}
        </div>
      )}

      {/* Template download */}
      <button
        onClick={downloadTemplate}
        style={{
          background: 'none', border: '1px solid #334155', color: '#94a3b8',
          borderRadius: '6px', padding: '0.5rem 1rem', cursor: 'pointer', fontSize: '0.8rem',
          alignSelf: 'flex-start',
        }}
      >
        ⬇ Download CSV Template
      </button>
    </div>
  );
}
