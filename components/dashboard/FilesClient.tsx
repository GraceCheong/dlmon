'use client';

import { useState, useRef } from 'react';
import { Upload, File, Loader2, Download, Eye, Trash2, RefreshCw, AlertCircle, Search, Pencil, Check, X } from 'lucide-react';

interface UploadedFile {
  id: string; originalName: string; fileType: string; fileSize: number;
  conversionStatus: string; description: string | null; createdAt: string;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  not_needed: { label: 'PDF', color: '#166534' },
  pending: { label: '변환 대기', color: '#92400E' },
  processing: { label: '변환 중', color: '#1D4ED8' },
  done: { label: '변환 완료', color: '#166534' },
  failed: { label: '변환 실패', color: '#991B1B' },
};

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function FilesClient({ initialFiles }: { initialFiles: UploadedFile[] }) {
  const [files, setFiles] = useState(initialFiles);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  const filteredFiles = files.filter(f => {
    const q = searchTerm.trim().toLowerCase();
    if (q && !f.originalName.toLowerCase().includes(q) && !(f.description ?? '').toLowerCase().includes(q)) return false;
    if (filterType !== 'all' && f.fileType !== filterType) return false;
    if (filterStatus !== 'all' && f.conversionStatus !== filterStatus) return false;
    return true;
  });

  const upload = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const file = fileList[0];

    if (file.size > 100 * 1024 * 1024) {
      setError('파일 크기는 100MB를 초과할 수 없습니다.');
      return;
    }
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['pdf', 'hwp', 'hwpx'].includes(ext || '')) {
      setError('PDF, HWP, HWPX 파일만 업로드할 수 있습니다.');
      return;
    }

    setUploading(true);
    setError('');
    const fd = new FormData();
    fd.append('file', file);

    try {
      const res = await fetch('/api/files/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) { setError(data.error || '업로드 실패'); return; }
      setFiles(prev => [data.file, ...prev]);
    } catch {
      setError('업로드 중 오류가 발생했습니다.');
    } finally {
      setUploading(false);
    }
  };

  const retryConversion = async (id: string) => {
    setBusy(`retry:${id}`);
    try {
      const res = await fetch(`/api/files/${id}/conversion/retry`, { method: 'POST' });
      if (res.ok) {
        setFiles(prev => prev.map(f => f.id === id ? { ...f, conversionStatus: 'processing' } : f));
      } else {
        const d = await res.json();
        setError(d.error || '재시도 실패');
      }
    } finally {
      setBusy(null);
    }
  };

  const deleteFile = async (id: string) => {
    if (!confirm('파일을 삭제하시겠습니까?')) return;
    setBusy(`delete:${id}`);
    try {
      const res = await fetch(`/api/files/${id}`, { method: 'DELETE' });
      if (res.ok) setFiles(prev => prev.filter(f => f.id !== id));
      else { const d = await res.json(); setError(d.error || '삭제 실패'); }
    } finally {
      setBusy(null);
    }
  };

  const startEdit = (file: UploadedFile) => {
    setEditingId(file.id);
    setEditName(file.originalName);
    setEditDesc(file.description ?? '');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditDesc('');
  };

  const saveMetadata = async (id: string) => {
    const name = editName.trim();
    if (!name) return;
    setEditSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/files/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ originalName: name, description: editDesc.trim() || null }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || '저장 실패'); return; }
      setFiles(prev => prev.map(f => f.id === id ? data.file : f));
      cancelEdit();
    } catch {
      setError('메타데이터 저장 중 오류가 발생했습니다.');
    } finally {
      setEditSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#4A5568', marginBottom: '0.25rem' }}>파일 관리</h1>
        <p style={{ color: '#A0AEC0', fontSize: '0.95rem' }}>PDF, HWP, HWPX 파일을 업로드하고 관리합니다. 업로드된 파일은 수업 자료 첨부용입니다.</p>
      </div>

      {/* Dropzone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); upload(e.dataTransfer.files); }}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: `2px dashed ${dragOver ? 'var(--primary)' : '#CBD5E0'}`,
          background: dragOver ? 'var(--primary-light)' : '#FAFAFA',
          borderRadius: 'var(--radius-lg)',
          padding: '3rem',
          textAlign: 'center',
          cursor: 'pointer',
          marginBottom: '1.5rem',
          transition: 'all 0.2s',
        }}
      >
        <input ref={fileInputRef} type="file" accept=".pdf,.hwp,.hwpx" style={{ display: 'none' }} onChange={e => upload(e.target.files)} />
        {uploading ? (
          <div style={{ color: 'var(--primary)' }}><Loader2 size={40} className="spin" style={{ margin: '0 auto 0.75rem' }} /><p style={{ fontWeight: 600 }}>업로드 중...</p></div>
        ) : (
          <>
            <Upload size={40} color="#CBD5E0" style={{ margin: '0 auto 0.75rem' }} />
            <p style={{ fontWeight: 700, color: '#4A5568' }}>파일을 끌어오거나 클릭하여 선택</p>
            <p style={{ fontSize: '0.85rem', color: '#A0AEC0', marginTop: '0.25rem' }}>PDF, HWP, HWPX · 최대 100 MB</p>
          </>
        )}
      </div>

      {error && (
        <div style={{ background: '#FEF2F2', color: '#991B1B', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Search and filters */}
      {files.length > 0 && (
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '180px', position: 'relative' }}>
            <Search size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#A0AEC0' }} />
            <input
              className="input"
              type="text"
              placeholder="파일명 또는 설명 검색..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '2.25rem', fontSize: '0.88rem' }}
            />
          </div>
          <select className="input" value={filterType} onChange={e => setFilterType(e.target.value)} style={{ width: '120px', fontSize: '0.88rem' }}>
            <option value="all">모든 형식</option>
            <option value="pdf">PDF</option>
            <option value="hwp">HWP</option>
            <option value="hwpx">HWPX</option>
          </select>
          <select className="input" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ width: '140px', fontSize: '0.88rem' }}>
            <option value="all">모든 상태</option>
            <option value="not_needed">PDF (변환불필요)</option>
            <option value="pending">변환 대기</option>
            <option value="processing">변환 중</option>
            <option value="done">변환 완료</option>
            <option value="failed">변환 실패</option>
          </select>
        </div>
      )}

      {files.length === 0 ? (
        <div className="card" style={{ padding: '4rem', textAlign: 'center', color: '#A0AEC0' }}>
          <File size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
          <p>업로드된 파일이 없습니다.</p>
        </div>
      ) : filteredFiles.length === 0 ? (
        <div className="card" style={{ padding: '2rem', textAlign: 'center', color: '#A0AEC0' }}>
          <p>검색 조건과 일치하는 파일이 없습니다.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {filteredFiles.map(file => {
            const status = STATUS_LABELS[file.conversionStatus] || { label: file.conversionStatus, color: '#718096' };
            const canPreview = file.fileType === 'pdf' || file.conversionStatus === 'done';
            const isEditing = editingId === file.id;

            return (
              <div key={file.id} className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {isEditing ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <input
                          className="input"
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                          placeholder="파일 표시 이름"
                          style={{ fontSize: '0.9rem', fontWeight: 700 }}
                        />
                        <input
                          className="input"
                          value={editDesc}
                          onChange={e => setEditDesc(e.target.value)}
                          placeholder="설명 (선택사항)"
                          style={{ fontSize: '0.85rem' }}
                        />
                      </div>
                    ) : (
                      <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                          <File size={16} color="var(--primary)" style={{ flexShrink: 0 }} />
                          <span style={{ fontWeight: 700, color: '#2D3748', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {file.originalName}
                          </span>
                          <span style={{
                            fontSize: '0.75rem', padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-full)',
                            background: '#F8FAFC', color: status.color, fontWeight: 600, whiteSpace: 'nowrap',
                          }}>
                            {status.label}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#A0AEC0' }}>
                          {formatBytes(file.fileSize)} · {file.fileType.toUpperCase()} · {new Date(file.createdAt).toLocaleDateString()}
                        </div>
                        {file.description && (
                          <div style={{ fontSize: '0.82rem', color: '#718096', marginTop: '0.25rem' }}>{file.description}</div>
                        )}
                      </>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0, alignItems: 'center' }}>
                    {isEditing ? (
                      <>
                        <button
                          className="btn btn-primary"
                          onClick={() => saveMetadata(file.id)}
                          disabled={editSaving || !editName.trim()}
                          style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}
                        >
                          {editSaving ? <Loader2 size={14} className="spin" /> : <Check size={14} />} 저장
                        </button>
                        <button
                          className="btn btn-secondary"
                          onClick={cancelEdit}
                          disabled={editSaving}
                          style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}
                        >
                          <X size={14} /> 취소
                        </button>
                      </>
                    ) : (
                      <>
                        {canPreview && (
                          <a href={`/api/files/${file.id}/preview`} target="_blank" rel="noopener noreferrer">
                            <button className="btn btn-secondary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}>
                              <Eye size={14} /> 미리보기
                            </button>
                          </a>
                        )}
                        {file.conversionStatus === 'failed' && (
                          <button className="btn btn-secondary" onClick={() => retryConversion(file.id)} disabled={busy !== null} style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}>
                            {busy === `retry:${file.id}` ? <Loader2 size={14} className="spin" /> : <><RefreshCw size={14} /> 재시도</>}
                          </button>
                        )}
                        <a href={`/api/files/${file.id}/download`} download={file.originalName}>
                          <button className="btn btn-secondary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}>
                            <Download size={14} /> 다운로드
                          </button>
                        </a>
                        <button
                          onClick={() => startEdit(file)}
                          disabled={busy !== null}
                          style={{ padding: '0.4rem', background: 'transparent', border: 'none', color: '#718096', cursor: 'pointer', borderRadius: 'var(--radius-sm)' }}
                        >
                          <Pencil size={16} />
                        </button>
                        <button onClick={() => deleteFile(file.id)} disabled={busy !== null} style={{ padding: '0.4rem', background: 'transparent', border: 'none', color: '#E53E3E', cursor: 'pointer', borderRadius: 'var(--radius-sm)' }}>
                          {busy === `delete:${file.id}` ? <Loader2 size={16} className="spin" /> : <Trash2 size={16} />}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <style jsx>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
