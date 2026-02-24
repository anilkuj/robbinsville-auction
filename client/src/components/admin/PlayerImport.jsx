import React, { useState, useRef } from 'react';
import axios from 'axios';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';

export default function PlayerImport({ onImported }) {
  const [dragging, setDragging] = useState(false);
  const [status, setStatus] = useState(null);
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
      a.href = url; a.download = 'players-template.csv'; a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('Failed to download template');
    }
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <Box
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        sx={{
          border: `2px dashed ${dragging ? '#f59e0b' : '#334155'}`,
          borderRadius: 2,
          p: 4,
          textAlign: 'center',
          cursor: 'pointer',
          bgcolor: dragging ? 'action.hover' : 'background.default',
          transition: 'all 0.15s',
          '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' },
        }}
      >
        <Typography fontSize="2rem" mb={1}>📄</Typography>
        <Typography color="text.secondary" fontSize="0.9rem">
          {loading ? 'Uploading…' : 'Drop CSV here or click to select'}
        </Typography>
        <Typography color="text.disabled" fontSize="0.75rem" mt={0.5}>
          Format: name, pool (header row required)
        </Typography>
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          style={{ display: 'none' }}
          onChange={e => uploadFile(e.target.files[0])}
        />
      </Box>

      {status && (
        <Alert severity={status.type === 'ok' ? 'success' : 'error'} sx={{ py: 0.5 }}>
          {status.msg}
        </Alert>
      )}

      <Button
        variant="outlined"
        color="inherit"
        size="small"
        onClick={downloadTemplate}
        sx={{ alignSelf: 'flex-start', borderColor: 'divider', color: 'text.secondary', fontSize: '0.8rem' }}
      >
        ⬇ Download CSV Template
      </Button>
    </Box>
  );
}
