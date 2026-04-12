import { useEffect, useRef, useState } from 'react';
import { init } from 'pptx-preview';
import { Loader2 } from 'lucide-react';

interface PptxSlideViewerProps {
  fileBuffer: ArrayBuffer;
  currentSlide: number;
  onTotalSlides: (count: number) => void;
}

/**
 * Render PPTX in native "slide" mode so the library itself draws one slide at a time.
 * This preserves layout better than manually hiding guessed DOM nodes.
 */
export default function PptxSlideViewer({ fileBuffer, currentSlide, onTotalSlides }: PptxSlideViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const previewerRef = useRef<ReturnType<typeof init> | null>(null);
  const onTotalSlidesRef = useRef(onTotalSlides);
  const [ready, setReady] = useState(false);

  onTotalSlidesRef.current = onTotalSlides;

  useEffect(() => {
    if (!containerRef.current || !fileBuffer) return;

    const container = containerRef.current;
    let cancelled = false;

    setReady(false);
    container.innerHTML = '';

    const previewer = init(container, {
      width: 960,
      height: 540,
      mode: 'slide',
    });

    previewerRef.current = previewer;

    previewer.preview(fileBuffer)
      .then(() => {
        if (cancelled) return;

        const slideCount = Math.max(previewer.slideCount || 1, 1);
        onTotalSlidesRef.current(slideCount);
        previewer.renderSingleSlide(Math.max(0, currentSlide));
        setReady(true);
      })
      .catch((err: unknown) => {
        console.error('pptx-preview error:', err);
      });

    return () => {
      cancelled = true;
      setReady(false);
      try {
        previewer.destroy();
      } catch {
        // Ignore cleanup errors from third-party viewer.
      }
      if (previewerRef.current === previewer) {
        previewerRef.current = null;
      }
      container.innerHTML = '';
    };
  }, [fileBuffer]);

  useEffect(() => {
    if (!ready || !previewerRef.current) return;
    previewerRef.current.renderSingleSlide(Math.max(0, currentSlide));
  }, [currentSlide, ready]);

  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden">
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/40">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}
      <div
        ref={containerRef}
        className="pptx-container flex h-full w-full items-center justify-center overflow-auto"
        style={{ maxWidth: '100%', maxHeight: '100%' }}
      />
    </div>
  );
}
