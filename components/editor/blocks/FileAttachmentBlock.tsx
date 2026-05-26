'use client';

import { useEditor } from '@/context/EditorContext';
import {
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Download,
  FileText,
  Loader2,
  Paperclip,
  RefreshCw,
  RotateCcw,
  Search,
  Trash2,
  Upload,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import PdfCanvasViewer from '@/components/shared/PdfCanvasViewer';

type ConversionStatus = 'not_needed' | 'pending' | 'processing' | 'done' | 'failed';

interface UploadedFileSummary {
  id: string;
  originalName: string;
  fileType: string;
  fileSize: number;
  conversionStatus: ConversionStatus;
  description?: string | null;
  createdAt?: string;
}

interface FileAttachmentContent {
  fileId: string;
  originalName: string;
  fileType: string;
  fileSize: number;
  conversionStatus: ConversionStatus;
  description?: string | null;
}

const statusLabels: Record<ConversionStatus, string> = {
  not_needed: '바로 미리보기 가능',
  pending: '변환 대기 중',
  processing: '변환 중...',
  done: '변환 완료',
  failed: '변환 실패',
};

const statusColors: Record<ConversionStatus, { background: string; color: string }> = {
  not_needed: { background: '#E6FFFA', color: '#047857' },
  pending: { background: '#FEF3C7', color: '#92400E' },
  processing: { background: '#DBEAFE', color: '#1D4ED8' },
  done: { background: '#DCFCE7', color: '#166534' },
  failed: { background: '#FEE2E2', color: '#991B1B' },
};

function formatFileSize(bytes?: number) {
  if (!bytes || bytes < 0) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function normalizeFile(file: UploadedFileSummary): FileAttachmentContent {
  return {
    fileId: file.id,
    originalName: file.originalName,
    fileType: file.fileType,
    fileSize: file.fileSize,
    conversionStatus: file.conversionStatus,
    description: file.description ?? null,
  };
}

function isPreviewable(status?: string) {
  return status === 'not_needed' || status === 'done';
}

export default function FileAttachmentBlock({
  id,
  content,
  publicMode = false,
}: {
  id: string;
  content: Partial<FileAttachmentContent>;
  publicMode?: boolean;
}) {
  const { updateBlock, isPreview, isExporting } = useEditor();
  const [files, setFiles] = useState<UploadedFileSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [pickerSearch, setPickerSearch] = useState('');
  const [viewerExpanded, setViewerExpanded] = useState(false);

  const selectedFile = useMemo<UploadedFileSummary | null>(() => {
    if (!content.fileId) return null;
    const latest = files.find((file) => file.id === content.fileId);
    if (latest) return latest;
    if (!content.originalName || !content.fileType || !content.conversionStatus) return null;
    return {
      id: content.fileId,
      originalName: content.originalName,
      fileType: content.fileType,
      fileSize: content.fileSize ?? 0,
      conversionStatus: content.conversionStatus,
      description: content.description ?? null,
    };
  }, [content, files]);

  const loadFiles = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/files');
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || '파일 목록을 불러오지 못했습니다.');
        return;
      }
      const nextFiles = Array.isArray(data.files) ? data.files : [];
      setFiles(nextFiles);
      const latestSelected = nextFiles.find((file: UploadedFileSummary) => file.id === content.fileId);
      if (latestSelected) {
        updateBlock(id, { ...normalizeFile(latestSelected) });
      }
    } catch {
      setError('서버와 통신하는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isPreview) {
      loadFiles();
    }
    // Only load when the block enters edit mode. Updating the block from the
    // loaded file list should not restart the request loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPreview]);

  const selectFile = (file: UploadedFileSummary) => {
    updateBlock(id, { ...normalizeFile(file) });
  };

  const uploadFile = async (fileList: FileList | null) => {
    const file = fileList?.[0];
    if (!file) return;

    const allowedExtensions = ['.pdf', '.hwp', '.hwpx'];
    const lowerName = file.name.toLowerCase();
    if (!allowedExtensions.some((ext) => lowerName.endsWith(ext))) {
      setError('PDF, HWP, HWPX 파일만 첨부할 수 있습니다.');
      return;
    }

    setUploading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/files/upload', { method: 'POST', body: formData });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.file) {
        setError(data.error || '파일 업로드에 실패했습니다.');
        return;
      }
      const uploaded = data.file as UploadedFileSummary;
      setFiles((prev) => [uploaded, ...prev.filter((item) => item.id !== uploaded.id)]);
      selectFile(uploaded);
    } catch {
      setError('파일 업로드 중 네트워크 오류가 발생했습니다.');
    } finally {
      setUploading(false);
    }
  };

  const retryConversion = async () => {
    if (!selectedFile) return;
    setRetrying(true);
    setError('');
    try {
      const res = await fetch(`/api/files/${selectedFile.id}/conversion/retry`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || '변환 재시도에 실패했습니다.');
        return;
      }
      const updated = { ...selectedFile, conversionStatus: 'processing' as ConversionStatus };
      setFiles((prev) => prev.map((file) => (file.id === updated.id ? updated : file)));
      updateBlock(id, { ...normalizeFile(updated) });
    } catch {
      setError('변환 재시도 중 네트워크 오류가 발생했습니다.');
    } finally {
      setRetrying(false);
    }
  };

  const clearSelectedFile = () => {
    updateBlock(id, {
      fileId: undefined,
      originalName: undefined,
      fileType: undefined,
      fileSize: undefined,
      conversionStatus: undefined,
      description: undefined,
    });
  };

  const deleteUploadedFile = async (file: UploadedFileSummary) => {
    if (!window.confirm(`"${file.originalName}" 파일을 완전히 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`)) return;

    setDeletingId(file.id);
    setError('');
    try {
      const res = await fetch(`/api/files/${file.id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || '파일 삭제에 실패했습니다.');
        return;
      }
      setFiles((prev) => prev.filter((item) => item.id !== file.id));
      if (content.fileId === file.id) {
        clearSelectedFile();
      }
    } catch {
      setError('파일 삭제 중 네트워크 오류가 발생했습니다.');
    } finally {
      setDeletingId(null);
    }
  };

  if (selectedFile) {
    const canPreview = isPreviewable(selectedFile.conversionStatus);
    const statusStyle = statusColors[selectedFile.conversionStatus] ?? statusColors.pending;
    const fileRouteBase = publicMode ? `/api/public/files/${selectedFile.id}` : `/api/files/${selectedFile.id}`;
    const previewUrl = `${fileRouteBase}/preview`;

    // During PDF export: show all pages inline, hide UI chrome
    if (isExporting) {
      return (
        <div style={{ margin: '1rem 0' }} className="pdf-no-break">
          {canPreview ? (
            <PdfCanvasViewer
              src={previewUrl}
              title={selectedFile.originalName}
              height={9999}
              expanded={true}
            />
          ) : (
            <div style={{ padding: '1rem', background: '#F8FAFC', borderRadius: 'var(--radius-lg)', color: '#718096', fontSize: '0.9rem', fontWeight: 600 }}>
              📎 {selectedFile.originalName} ({formatFileSize(selectedFile.fileSize)})
            </div>
          )}
        </div>
      );
    }

    return (
      <div style={{ margin: '1rem 0' }}>
        <div style={{ border: '1px solid #E2E8F0', borderRadius: 'var(--radius-lg)', overflow: 'hidden', background: '#FFFFFF' }}>
          <div style={{ display: 'flex', gap: '0.9rem', alignItems: 'center', justifyContent: 'space-between', padding: '0.9rem 1rem', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', minWidth: 0 }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: 'var(--radius-md)',
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--primary)',
                flexShrink: 0,
              }}>
                <FileText size={21} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
                  <p style={{ fontWeight: 800, color: '#1A202C', wordBreak: 'break-word' }}>{selectedFile.originalName}</p>
                  <span style={{
                    borderRadius: '999px',
                    padding: '0.18rem 0.5rem',
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    background: statusStyle.background,
                    color: statusStyle.color,
                  }}>
                    {statusLabels[selectedFile.conversionStatus] ?? selectedFile.conversionStatus}
                  </span>
                </div>
                <p style={{ color: '#718096', fontSize: '0.8rem' }}>
                  {selectedFile.fileType.toUpperCase()} · {formatFileSize(selectedFile.fileSize)}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'flex-end', flexShrink: 0 }}>
              {canPreview && (
                <>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setViewerExpanded((prev) => !prev)}
                    style={{ padding: '0.42rem 0.65rem', fontSize: '0.78rem' }}
                  >
                    {viewerExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    {viewerExpanded ? '접기' : '펼치기'}
                  </button>
                </>
              )}
              <a href={`${fileRouteBase}/download`} className="btn btn-secondary" style={{ padding: '0.42rem 0.65rem', fontSize: '0.78rem' }}>
                <Download size={14} /> 다운로드
              </a>
              {selectedFile.conversionStatus === 'failed' && !isPreview && (
                <button type="button" onClick={retryConversion} disabled={retrying} className="btn btn-secondary" style={{ padding: '0.42rem 0.65rem', fontSize: '0.78rem' }}>
                  {retrying ? <Loader2 size={14} className="spin" /> : <RotateCcw size={14} />} 재시도
                </button>
              )}
              {!isPreview && (
                <button
                  type="button"
                  onClick={clearSelectedFile}
                  className="btn btn-secondary"
                  style={{ padding: '0.42rem 0.65rem', fontSize: '0.78rem' }}
                >
                  변경
                </button>
              )}
              {!isPreview && !publicMode && (
                <button
                  type="button"
                  onClick={() => deleteUploadedFile(selectedFile)}
                  disabled={deletingId === selectedFile.id}
                  className="btn btn-secondary"
                  style={{ padding: '0.42rem 0.65rem', fontSize: '0.78rem', color: '#B91C1C' }}
                >
                  {deletingId === selectedFile.id ? <Loader2 size={14} className="spin" /> : <Trash2 size={14} />}
                  파일 삭제
                </button>
              )}
            </div>
          </div>

          {error && (
            <div style={{ margin: '0.75rem 1rem 0', background: '#FEE2E2', color: '#991B1B', borderRadius: 'var(--radius-md)', padding: '0.6rem 0.75rem', fontSize: '0.82rem', display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
              <AlertCircle size={15} />
              {error}
            </div>
          )}

          {canPreview ? (
            <div>
              <PdfCanvasViewer
                src={previewUrl}
                title={`${selectedFile.originalName} 미리보기`}
                height={viewerExpanded ? 760 : 420}
                expanded={viewerExpanded}
              />
            </div>
          ) : (
            <div style={{ padding: '1rem', color: '#718096', background: '#F8FAFC', fontSize: '0.86rem' }}>
              PDF 미리보기를 준비 중입니다. HWP/HWPX 파일은 변환 완료 후 블록 안에서 바로 볼 수 있습니다.
            </div>
          )}

          {selectedFile.description && (
            <div style={{ padding: '0.75rem 1rem', color: '#4A5568', fontSize: '0.85rem', borderTop: '1px solid #E2E8F0', background: '#FFFFFF' }}>
              {selectedFile.description}
            </div>
          )}
        </div>
        <style jsx>{`@keyframes spin { to { transform: rotate(360deg); } } .spin { animation: spin 1s linear infinite; }`}</style>
      </div>
    );
  }

  return (
    <div style={{ border: '2px dashed #CBD5E0', borderRadius: 'var(--radius-lg)', padding: '1.5rem', margin: '1rem 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', color: 'var(--primary)' }}>
        <Paperclip size={22} />
        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#1A202C' }}>첨부 파일 추가</h3>
      </div>
      <p style={{ fontSize: '0.85rem', color: '#718096', marginBottom: '1rem' }}>
        PDF, HWP, HWPX 수업 자료를 업로드하거나 기존 파일을 선택해 이 수업 콘텐츠에 첨부합니다.
      </p>

      {error && (
        <div style={{ background: '#FEE2E2', color: '#991B1B', borderRadius: 'var(--radius-md)', padding: '0.6rem 0.9rem', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <label className="btn btn-primary" style={{ padding: '0.55rem 0.85rem', fontSize: '0.85rem', cursor: uploading ? 'not-allowed' : 'pointer' }}>
          {uploading ? <Loader2 size={15} className="spin" /> : <Upload size={15} />}
          {uploading ? '업로드 중...' : '파일 업로드'}
          <input
            type="file"
            accept=".pdf,.hwp,.hwpx"
            disabled={uploading}
            onChange={(event) => {
              uploadFile(event.target.files);
              event.currentTarget.value = '';
            }}
            style={{ display: 'none' }}
          />
        </label>
        <button type="button" onClick={loadFiles} disabled={loading} className="btn btn-secondary" style={{ padding: '0.55rem 0.85rem', fontSize: '0.85rem' }}>
          {loading ? <Loader2 size={15} className="spin" /> : <RefreshCw size={15} />}
          새로고침
        </button>
      </div>

      {loading && files.length === 0 ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#718096', fontSize: '0.86rem' }}>
          <Loader2 size={16} className="spin" />
          파일 목록을 불러오는 중...
        </div>
      ) : files.length === 0 ? (
        <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 'var(--radius-md)', padding: '0.85rem', color: '#718096', fontSize: '0.86rem' }}>
          아직 업로드된 파일이 없습니다. 새 파일을 업로드해 첨부하세요.
        </div>
      ) : (
        <>
          <div style={{ position: 'relative', marginBottom: '0.5rem' }}>
            <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#A0AEC0' }} />
            <input
              className="input"
              type="text"
              placeholder="파일 검색..."
              value={pickerSearch}
              onChange={e => setPickerSearch(e.target.value)}
              style={{ paddingLeft: '2.25rem', fontSize: '0.85rem' }}
            />
          </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '260px', overflowY: 'auto' }}>
          {files.filter(f => {
            const q = pickerSearch.trim().toLowerCase();
            return !q || f.originalName.toLowerCase().includes(q);
          }).map((file) => {
            const statusStyle = statusColors[file.conversionStatus] ?? statusColors.pending;
            return (
              <div
                key={file.id}
                style={{
                  border: '1px solid #E2E8F0',
                  borderRadius: 'var(--radius-md)',
                  background: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  overflow: 'hidden',
                }}
              >
                <button
                  type="button"
                  onClick={() => selectFile(file)}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    background: 'transparent',
                    border: 'none',
                    padding: '0.75rem',
                    textAlign: 'left',
                    display: 'flex',
                    gap: '0.75rem',
                    alignItems: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <FileText size={20} color="var(--primary)" style={{ flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ color: '#1A202C', fontWeight: 700, fontSize: '0.9rem', wordBreak: 'break-word' }}>{file.originalName}</p>
                    <p style={{ color: '#718096', fontSize: '0.78rem', marginTop: '0.15rem' }}>
                      {file.fileType.toUpperCase()} · {formatFileSize(file.fileSize)}
                    </p>
                  </div>
                  <span style={{ borderRadius: '999px', padding: '0.18rem 0.5rem', fontSize: '0.7rem', fontWeight: 800, background: statusStyle.background, color: statusStyle.color, whiteSpace: 'nowrap' }}>
                    {statusLabels[file.conversionStatus] ?? file.conversionStatus}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => deleteUploadedFile(file)}
                  disabled={deletingId === file.id}
                  title="파일 삭제"
                  style={{
                    alignSelf: 'stretch',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '44px',
                    border: 'none',
                    borderLeft: '1px solid #E2E8F0',
                    background: '#FFFFFF',
                    color: '#B91C1C',
                    cursor: deletingId === file.id ? 'not-allowed' : 'pointer',
                  }}
                >
                  {deletingId === file.id ? <Loader2 size={15} className="spin" /> : <Trash2 size={15} />}
                </button>
              </div>
            );
          })}
        </div>
        </>
      )}

      <style jsx>{`@keyframes spin { to { transform: rotate(360deg); } } .spin { animation: spin 1s linear infinite; }`}</style>
    </div>
  );
}
