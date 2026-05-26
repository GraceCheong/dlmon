'use client';

import { AlertCircle, ChevronLeft, ChevronRight, Loader2, Minus, Plus } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist';

const DEFAULT_VIEWER_WIDTH = 720;
const ZOOM_MIN = 0.8;
const ZOOM_MAX = 1.35;
const ZOOM_STEP = 0.05;

interface PageSize {
  width: number;
  height: number;
}

let pdfjsPromise: Promise<typeof import('pdfjs-dist/legacy/build/pdf.mjs')> | null = null;

function loadPdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = import('pdfjs-dist/legacy/build/pdf.mjs').then((pdfjs) => {
      pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/legacy/build/pdf.worker.min.mjs',
        import.meta.url,
      ).toString();
      return pdfjs;
    });
  }
  return pdfjsPromise;
}

function clampZoom(value: number) {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Number(value.toFixed(2))));
}

function getCssPageSize(pageSize: PageSize, viewerWidth: number, zoom: number) {
  const baseWidth = Math.max(1, viewerWidth || DEFAULT_VIEWER_WIDTH);
  const scale = (baseWidth / pageSize.width) * zoom;
  return {
    width: pageSize.width * scale,
    height: pageSize.height * scale,
  };
}

function PdfPageCanvas({
  pdf,
  pageNumber,
  pageSize,
  viewerWidth,
  zoom,
  onRendered,
}: {
  pdf: PDFDocumentProxy;
  pageNumber: number;
  pageSize: PageSize;
  viewerWidth: number;
  zoom: number;
  onRendered?: () => void;
}) {
  const pageRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState('');
  const cssSize = getCssPageSize(pageSize, viewerWidth, zoom);

  useEffect(() => {
    let cancelled = false;
    let renderTask: RenderTask | null = null;
    let canvas: HTMLCanvasElement | null = null;

    const renderPage = async () => {
      setError('');
      const page = await pdf.getPage(pageNumber);
      if (cancelled) return;

      const targetWidth = Math.max(1, viewerWidth || DEFAULT_VIEWER_WIDTH);
      const baseViewport = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({ scale: (targetWidth / baseViewport.width) * zoom });
      const pageEl = pageRef.current;
      if (!pageEl) return;

      canvas = document.createElement('canvas');
      canvas.style.display = 'block';
      canvas.style.background = '#FFFFFF';

      const outputScale = window.devicePixelRatio || 1;
      canvas.width = Math.floor(viewport.width * outputScale);
      canvas.height = Math.floor(viewport.height * outputScale);
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;
      pageEl.replaceChildren(canvas);

      const context = canvas.getContext('2d');
      if (!context) return;

      renderTask = page.render({
        canvas,
        canvasContext: context,
        viewport,
        transform: outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : undefined,
      });
      await renderTask.promise;
      if (!cancelled) {
        onRendered?.();
      }
    };

    renderPage().catch((err: unknown) => {
      if (cancelled) return;
      console.error(`PDF page ${pageNumber} render failed:`, err);
      const errorName = err instanceof Error ? err.name : '';
      const message = err instanceof Error ? err.message : String(err);
      if (errorName !== 'RenderingCancelledException' && !message.toLowerCase().includes('cancel')) {
        setError('페이지를 렌더링하지 못했습니다.');
      }
    });

    return () => {
      cancelled = true;
      renderTask?.cancel();
      canvas?.remove();
    };
  }, [onRendered, pageNumber, pdf, viewerWidth, zoom]);

  return (
    <div style={{ width: `${cssSize.width}px`, minWidth: '100%', height: `${cssSize.height}px`, background: '#FFFFFF' }}>
      <div ref={pageRef} style={{ width: `${cssSize.width}px`, height: `${cssSize.height}px`, background: '#FFFFFF' }} />
      {error && (
        <div style={{ color: '#991B1B', background: '#FEF2F2', borderRadius: 'var(--radius-md)', padding: '0.45rem 0.6rem', fontSize: '0.78rem' }}>
          {error}
        </div>
      )}
    </div>
  );
}

export default function PdfCanvasViewer({
  src,
  height,
  title,
  expanded = false,
}: {
  src: string;
  height: number;
  title: string;
  expanded?: boolean;
}) {
  const viewerRef = useRef<HTMLDivElement | null>(null);
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollRestoreRef = useRef<{ left: number; top: number } | null>(null);
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [pageSizes, setPageSizes] = useState<PageSize[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewerWidth, setViewerWidth] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [controlsActive, setControlsActive] = useState(true);

  const visiblePages = expanded
    ? Array.from({ length: numPages }, (_, index) => index + 1)
    : [Math.min(Math.max(currentPage, 1), Math.max(numPages, 1))];

  const markControlsActive = () => {
    setControlsActive(true);
    if (fadeTimerRef.current) {
      clearTimeout(fadeTimerRef.current);
    }
    fadeTimerRef.current = setTimeout(() => setControlsActive(false), 2200);
  };

  const restoreWindowScroll = useCallback(() => {
    const target = scrollRestoreRef.current;
    if (!target) return;

    const restore = () => {
      window.scrollTo({ left: target.left, top: target.top, behavior: 'auto' });
    };

    requestAnimationFrame(restore);
    window.setTimeout(restore, 50);
    window.setTimeout(() => {
      restore();
      if (scrollRestoreRef.current === target) {
        scrollRestoreRef.current = null;
      }
    }, 180);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let loadedPdf: PDFDocumentProxy | null = null;

    const load = async () => {
      setLoading(true);
      setError('');
      setPdf(null);
      setNumPages(0);
      setPageSizes([]);
      setCurrentPage(1);

      try {
        const pdfjs = await loadPdfjs();
        const task = pdfjs.getDocument({
          url: src,
          withCredentials: true,
          cMapUrl: '/api/pdfjs/cmaps/',
          cMapPacked: true,
          standardFontDataUrl: '/api/pdfjs/standard-fonts/',
        });
        const nextPdf = await task.promise;
        loadedPdf = nextPdf;
        if (cancelled) {
          await nextPdf.destroy();
          return;
        }
        const sizes = await Promise.all(
          Array.from({ length: nextPdf.numPages }, async (_, index) => {
            const page = await nextPdf.getPage(index + 1);
            const viewport = page.getViewport({ scale: 1 });
            return { width: viewport.width, height: viewport.height };
          }),
        );
        if (cancelled) {
          await nextPdf.destroy();
          return;
        }
        setPdf(nextPdf);
        setNumPages(nextPdf.numPages);
        setPageSizes(sizes);
        setCurrentPage(1);
      } catch (err) {
        console.error('PDF load failed:', err);
        if (!cancelled) setError('PDF를 불러오지 못했습니다.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
      void loadedPdf?.destroy();
    };
  }, [src]);

  useEffect(() => {
    const viewerEl = viewerRef.current;
    if (!viewerEl) return;

    let frame = 0;
    const updateWidth = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        setViewerWidth(viewerEl.clientWidth);
      });
    };

    updateWidth();
    const resizeObserver = new ResizeObserver(updateWidth);
    resizeObserver.observe(viewerEl);

    return () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    setControlsActive(true);
    if (fadeTimerRef.current) {
      clearTimeout(fadeTimerRef.current);
    }
    fadeTimerRef.current = setTimeout(() => setControlsActive(false), 2200);

    return () => {
      if (fadeTimerRef.current) {
        clearTimeout(fadeTimerRef.current);
      }
    };
  }, [src]);

  const goToPage = (pageNumber: number) => {
    markControlsActive();
    scrollRestoreRef.current = { left: window.scrollX, top: window.scrollY };
    setCurrentPage(Math.min(Math.max(pageNumber, 1), Math.max(numPages, 1)));
    restoreWindowScroll();
  };

  return (
    <div
      aria-label={title}
      style={{
        height: expanded ? height : 'auto',
        minHeight: !expanded && (loading || error) ? 180 : undefined,
        position: 'relative',
        overflow: 'hidden',
        background: '#E2E8F0',
      }}
    >
      <div
        ref={viewerRef}
        onMouseMove={markControlsActive}
        style={{
          height: expanded ? '100%' : 'auto',
          overflowY: expanded ? 'auto' : 'hidden',
          overflowX: zoom > 1 ? 'auto' : 'hidden',
          background: '#E2E8F0',
        }}
      >
        {loading && (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: '#4A5568', fontWeight: 800 }}>
            <Loader2 size={18} className="spin" />
            PDF를 불러오는 중...
          </div>
        )}

        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#991B1B', background: '#FEF2F2', borderRadius: 'var(--radius-md)', padding: '0.8rem', fontWeight: 700 }}>
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        {pdf && !loading && !error && viewerWidth > 0 && pageSizes.length > 0 && (
          <div style={{ display: 'grid', gap: expanded ? '0.75rem' : 0, alignItems: 'start' }}>
            {visiblePages.map((pageNumber) => (
              <PdfPageCanvas
                key={pageNumber}
                pdf={pdf}
                pageNumber={pageNumber}
                pageSize={pageSizes[pageNumber - 1] ?? pageSizes[0]}
                viewerWidth={viewerWidth}
                zoom={zoom}
                onRendered={!expanded ? restoreWindowScroll : undefined}
              />
            ))}
          </div>
        )}
      </div>

      {!expanded && pdf && !loading && !error && (
        <>
          {numPages > 1 && (
            <>
              <button
                type="button"
                aria-label="이전 PDF 페이지"
                onMouseEnter={markControlsActive}
                onFocus={markControlsActive}
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage <= 1}
                style={{
                  position: 'absolute',
                  left: '0.65rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '42px',
                  height: '50px',
                  borderRadius: '999px',
                  border: '1px solid rgba(203, 213, 224, 0.9)',
                  background: 'rgba(255, 255, 255, 0.92)',
                  color: '#2D3748',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
                  boxShadow: '0 10px 28px rgba(15, 23, 42, 0.18)',
                  opacity: controlsActive ? (currentPage <= 1 ? 0.42 : 0.96) : 0.22,
                  transition: 'opacity 180ms ease, background 180ms ease',
                  zIndex: 2,
                }}
              >
                <ChevronLeft size={22} />
              </button>
              <button
                type="button"
                aria-label="다음 PDF 페이지"
                onMouseEnter={markControlsActive}
                onFocus={markControlsActive}
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage >= numPages}
                style={{
                  position: 'absolute',
                  right: '0.65rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '42px',
                  height: '50px',
                  borderRadius: '999px',
                  border: '1px solid rgba(203, 213, 224, 0.9)',
                  background: 'rgba(255, 255, 255, 0.92)',
                  color: '#2D3748',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: currentPage >= numPages ? 'not-allowed' : 'pointer',
                  boxShadow: '0 10px 28px rgba(15, 23, 42, 0.18)',
                  opacity: controlsActive ? (currentPage >= numPages ? 0.42 : 0.96) : 0.22,
                  transition: 'opacity 180ms ease, background 180ms ease',
                  zIndex: 2,
                }}
              >
                <ChevronRight size={22} />
              </button>
            </>
          )}
          <div
            aria-label="PDF 페이지 번호"
            style={{
              position: 'absolute',
              right: '0.75rem',
              bottom: '0.75rem',
              minWidth: '58px',
              padding: '0.45rem 0.65rem',
              borderRadius: '999px',
              background: 'rgba(255, 255, 255, 0.92)',
              color: '#2D3748',
              fontSize: '0.8rem',
              fontWeight: 800,
              textAlign: 'center',
              boxShadow: '0 8px 24px rgba(15, 23, 42, 0.18)',
              opacity: controlsActive ? 1 : 0.22,
              transition: 'opacity 180ms ease',
              zIndex: 2,
            }}
          >
            {currentPage}/{numPages}
          </div>
        </>
      )}

      {!expanded && pdf && !loading && !error && (
        <div
          onMouseEnter={markControlsActive}
          onFocus={markControlsActive}
          style={{
            position: 'absolute',
            left: '0.75rem',
            bottom: '0.75rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.35rem',
            borderRadius: '999px',
            background: 'rgba(255, 255, 255, 0.92)',
            boxShadow: '0 8px 24px rgba(15, 23, 42, 0.18)',
            opacity: controlsActive ? 1 : 0.18,
            transition: 'opacity 180ms ease',
            zIndex: 2,
          }}
        >
          <button
            type="button"
            aria-label="PDF 축소"
            onClick={() => {
              markControlsActive();
              setZoom((prev) => clampZoom(prev - ZOOM_STEP));
            }}
            disabled={zoom <= ZOOM_MIN}
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '999px',
              border: '1px solid #CBD5E0',
              background: '#FFFFFF',
              color: '#2D3748',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: zoom <= ZOOM_MIN ? 'not-allowed' : 'pointer',
            }}
          >
            <Minus size={14} />
          </button>
          <span style={{ minWidth: '44px', textAlign: 'center', fontSize: '0.78rem', fontWeight: 800, color: '#2D3748' }}>
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            aria-label="PDF 확대"
            onClick={() => {
              markControlsActive();
              setZoom((prev) => clampZoom(prev + ZOOM_STEP));
            }}
            disabled={zoom >= ZOOM_MAX}
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '999px',
              border: '1px solid #CBD5E0',
              background: '#FFFFFF',
              color: '#2D3748',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: zoom >= ZOOM_MAX ? 'not-allowed' : 'pointer',
            }}
          >
            <Plus size={14} />
          </button>
        </div>
      )}

      <style jsx>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
