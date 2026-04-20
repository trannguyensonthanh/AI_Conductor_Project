import { useState, useEffect, useCallback, useRef } from 'react';
import { useAppStore } from '@/stores/useAppStore';
import { Button } from '@/components/ui/button';
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  Upload,
  Trash2,
  FileImage,
  Loader2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from '@/hooks/use-toast';
import { get, set } from 'idb-keyval';
// const defaultSlides = [
//   {
//     id: 'default-1',
//     title: 'Introduction',
//     subtitle: 'AI Conductor System Overview',
//   },
//   {
//     id: 'default-2',
//     title: 'Architecture',
//     subtitle: 'ESP32 + IMU + BLE Pipeline',
//   },
//   {
//     id: 'default-3',
//     title: 'Gesture Recognition',
//     subtitle: 'ML Model & Classification',
//   },
//   { id: 'default-4', title: 'Demo', subtitle: 'Live Interaction Showcase' },
//   { id: 'default-5', title: 'Future Work', subtitle: 'Next Steps & Roadmap' },
// ];

type SlideItem = {
  id: string;
  title: string;
  subtitle: string;
  type: 'default' | 'uploaded' | 'imported';
  url: string;
  groupId?: string;
  groupName?: string;
};

interface ImportedGroup {
  id: string;
  name: string;
  images: string[]; // data URLs
}

/**
 * Render a PPTX file into images using pptx-preview + html2canvas.
 */
async function pptxToImages(buffer: ArrayBuffer): Promise<string[]> {
  const { init } = await import('pptx-preview');
  const html2canvas = (await import('html2canvas')).default;

  const container = document.createElement('div');
  container.style.cssText =
    'position:fixed;left:-9999px;top:0;width:960px;height:540px;overflow:hidden;background:white;z-index:-1;';
  document.body.appendChild(container);

  try {
    const previewer = init(container, {
      width: 960,
      height: 540,
      mode: 'slide',
    });
    await previewer.preview(buffer);
    const count = Math.max(previewer.slideCount || 1, 1);
    const images: string[] = [];

    for (let i = 0; i < count; i++) {
      previewer.renderSingleSlide(i);
      // Wait a bit for rendering
      await new Promise((r) => setTimeout(r, 300));
      const canvas = await html2canvas(container, {
        width: 960,
        height: 540,
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
      });
      images.push(canvas.toDataURL('image/jpeg', 0.92));
    }

    try {
      previewer.destroy();
    } catch {}
    return images;
  } finally {
    document.body.removeChild(container);
  }
}

/**
 * Render PDF pages to images using pdfjs-dist.
 */
async function pdfToImages(buffer: ArrayBuffer): Promise<string[]> {
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  const images: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 2 });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d')!;
    await page.render({ canvasContext: ctx, viewport }).promise;
    images.push(canvas.toDataURL('image/jpeg', 0.92));
  }

  return images;
}

export default function PresentationPage() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [overlayDir, setOverlayDir] = useState<'left' | 'right' | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [isParsing, setIsParsing] = useState(false);
  const [importedGroups, setImportedGroups] = useState<ImportedGroup[]>([]);
  const lastGesture = useAppStore((s) => s.lastGesture);
  const setLastGesture = useAppStore((s) => s.setLastGesture);
  const { uploadedSlides, addSlide, removeSlide, setLastVoiceCommand  } = useAppStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastVoiceCommand = useAppStore((s) => s.lastVoiceCommand);
  const lastActionTime = useRef<number>(0); 
  const [isIdbLoaded, setIsIdbLoaded] = useState(false);
  // Build the slide list
  const allSlides: SlideItem[] = [
    // ...defaultSlides.map((s) => ({ ...s, type: 'default' as const, url: '' })),
    ...uploadedSlides.map((s) => ({
      id: s.id,
      title: s.name,
      subtitle: '',
      type: 'uploaded' as const,
      url: s.url,
    })),
  ];

useEffect(() => {
    get('presentation_slides').then((savedGroups) => {
      if (savedGroups) {
        setImportedGroups(savedGroups);
      }
      setIsIdbLoaded(true);
    }).catch(err => {
      console.error("Lỗi đọc dữ liệu từ IndexedDB:", err);
      setIsIdbLoaded(true);
    });
  }, []);

// 4. LƯU DỮ LIỆU VÀO INDEXED DB MỖI KHI CÓ THAY ĐỔI (Thêm/Xoá file)
  useEffect(() => {
    if (isIdbLoaded) {
      set('presentation_slides', importedGroups).catch(err => {
        console.error("Lỗi lưu dữ liệu vào IndexedDB:", err);
      });
    }
  }, [importedGroups, isIdbLoaded]);

  // Add imported file slides (PPTX/PDF converted to images)
  for (const group of importedGroups) {
    group.images.forEach((imgUrl, i) => {
      allSlides.push({
        id: `${group.id}-${i}`,
        title: `${group.name} — Slide ${i + 1}`,
        subtitle: '',
        type: 'imported',
        url: imgUrl,
        groupId: group.id,
        groupName: group.name,
      });
    });
  }

  const totalSlides = allSlides.length;

  const goNext = useCallback(() => {
    if (currentSlide < totalSlides - 1) {
      setCurrentSlide((p) => p + 1);
      setOverlayDir('right');
      setTimeout(() => setOverlayDir(null), 800);
    }
  }, [currentSlide, totalSlides]);

  const goPrev = useCallback(() => {
    if (currentSlide > 0) {
      setCurrentSlide((p) => p - 1);
      setOverlayDir('left');
      setTimeout(() => setOverlayDir(null), 800);
    }
  }, [currentSlide]);

  // 🔥 BẮT SỰ KIỆN TỪ AI (CẢ TAY VÀ MIỆNG) 🔥
  useEffect(() => {
    if (lastGesture === 'NONE' && lastVoiceCommand === 'NONE') return;

    const now = Date.now();
    if (now - lastActionTime.current < 1000) {
      setLastGesture('NONE'); 
      setLastVoiceCommand('NONE');
      return; 
    }

    // XỬ LÝ LẬT TỚI (Tay vuốt phải HOẶC Miệng nói "Phải")
    if (lastGesture === 'SWIPE_RIGHT' || lastVoiceCommand === 'RIGHT') {
      goNext();
      toast({ title: "Tiếp tục", description: lastGesture === 'SWIPE_RIGHT' ? "Cử chỉ Tay" : "Lệnh Giọng nói" });
      lastActionTime.current = now;
      setLastGesture('NONE');
      setLastVoiceCommand('NONE');
    } 
    // XỬ LÝ LẬT LÙI (Tay vuốt trái HOẶC Miệng nói "Trái")
    else if (lastGesture === 'SWIPE_LEFT' || lastVoiceCommand === 'LEFT') {
      goPrev();
      toast({ title: "Quay lại", description: lastGesture === 'SWIPE_LEFT' ? "Cử chỉ Tay" : "Lệnh Giọng nói" });
      lastActionTime.current = now;
      setLastGesture('NONE');
      setLastVoiceCommand('NONE');
    }

  },[lastGesture, lastVoiceCommand, goNext, goPrev, setLastGesture, setLastVoiceCommand]);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement
        .requestFullscreen()
        .then(() => setIsFullscreen(true))
        .catch(() => {});
    } else {
      document
        .exitFullscreen()
        .then(() => setIsFullscreen(false))
        .catch(() => {});
    }
  }, []);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') goNext();
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'Escape' && isFullscreen) document.exitFullscreen();
      if (e.key === 'f' || e.key === 'F') toggleFullscreen();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [goNext, goPrev, isFullscreen, toggleFullscreen]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    for (const file of Array.from(files)) {
      const ext = file.name.split('.').pop()?.toLowerCase();

      // Handle PPTX
      if (ext === 'pptx' || ext === 'ppt') {
        setIsParsing(true);
        try {
          const buffer = await file.arrayBuffer();
          toast({
            title: 'Đang xử lý...',
            description: `Đang chuyển "${file.name}" thành ảnh slide...`,
          });
          const images = await pptxToImages(buffer);
          const groupId = `pptx-${Date.now()}-${Math.random().toString(36).slice(2)}`;
          setImportedGroups((prev) => [
            ...prev,
            { id: groupId, name: file.name, images },
          ]);
          toast({
            title: 'Thành công!',
            description: `"${file.name}" — ${images.length} slide đã được import.`,
          });
        } catch (err) {
          console.error('PPTX processing error:', err);
          toast({
            title: 'Lỗi',
            description: 'Không thể xử lý file PPTX.',
            variant: 'destructive',
          });
        } finally {
          setIsParsing(false);
        }
        continue;
      }

      // Handle PDF
      if (ext === 'pdf' || file.type === 'application/pdf') {
        setIsParsing(true);
        try {
          const buffer = await file.arrayBuffer();
          toast({
            title: 'Đang xử lý...',
            description: `Đang chuyển "${file.name}" thành ảnh...`,
          });
          const images = await pdfToImages(buffer);
          const groupId = `pdf-${Date.now()}-${Math.random().toString(36).slice(2)}`;
          setImportedGroups((prev) => [
            ...prev,
            { id: groupId, name: file.name, images },
          ]);
          toast({
            title: 'Thành công!',
            description: `"${file.name}" — ${images.length} trang đã được import.`,
          });
        } catch (err) {
          console.error('PDF processing error:', err);
          toast({
            title: 'Lỗi',
            description: 'Không thể xử lý file PDF.',
            variant: 'destructive',
          });
        } finally {
          setIsParsing(false);
        }
        continue;
      }

      // Handle images
if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const base64Url = event.target?.result as string;
          addSlide({
            id: `slide-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            name: file.name,
            url: base64Url, // Lưu luôn dạng text base64
            uploadedAt: new Date().toISOString(),
          });
        };
        reader.readAsDataURL(file);
        continue;
      }

      toast({
        title: 'Lỗi',
        description: `"${file.name}" không được hỗ trợ. Dùng PPTX, PDF hoặc ảnh.`,
        variant: 'destructive',
      });
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeGroup = (groupId: string) => {
    setImportedGroups((prev) => prev.filter((g) => g.id !== groupId));
    setCurrentSlide((c) => Math.max(0, Math.min(c, totalSlides - 2)));
  };

  const slide = allSlides[currentSlide];

  const renderSlideContent = () => {
    if (!slide) return null;

    if ((slide.type === 'uploaded' || slide.type === 'imported') && slide.url) {
      return (
        <img
          src={slide.url}
          alt={slide.title}
          className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
          draggable={false}
        />
      );
    }

    // Default slide
    return (
      <div>
        <p className="font-mono text-xs text-muted-foreground mb-2 tracking-widest">
          SLIDE {currentSlide + 1} / {totalSlides}
        </p>
        <h2 className="text-4xl lg:text-6xl font-bold neon-text mb-4">
          {slide.title}
        </h2>
        <p className="text-lg text-muted-foreground">{slide.subtitle}</p>
      </div>
    );
  };

  const importedCount = uploadedSlides.length + importedGroups.length;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className={`flex flex-col gap-4 ${isFullscreen ? 'fixed inset-0 z-50 bg-background p-4' : 'h-full'}`}
    >
      {/* Upload bar */}
      {!isFullscreen && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileImage className="w-5 h-5 text-primary" />
            <span className="font-mono text-xs text-muted-foreground">
              {importedCount} file đã import
            </span>
          </div>
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.ppt,.pptx,.pdf,application/pdf,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
              multiple
              onChange={handleFileUpload}
              className="hidden"
              id="slide-upload"
            />
            <Button
              variant="outline"
              size="sm"
              className="font-mono gap-2"
              onClick={() => fileInputRef.current?.click()}
              disabled={isParsing}
            >
              {isParsing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              {isParsing ? 'Đang xử lý...' : 'Import (IMG/PPTX/PDF)'}
            </Button>
          </div>
        </div>
      )}

      {/* Slide area */}
      <div className="flex-1 glass neon-border rounded-xl relative overflow-hidden flex items-center justify-center min-h-[400px]">
        <div
          style={{
            transform: `scale(${zoom})`,
            transition: 'transform 0.2s ease',
          }}
          className="w-full h-full flex items-center justify-center p-4"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={slide?.id ?? currentSlide}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              transition={{ duration: 0.3 }}
              className="text-center w-full h-full flex items-center justify-center"
            >
              {renderSlideContent()}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Direction overlay */}
        <AnimatePresence>
          {overlayDir && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 0.6, scale: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
            >
              {overlayDir === 'right' ? (
                <ChevronRight className="w-32 h-32 text-primary" />
              ) : (
                <ChevronLeft className="w-32 h-32 text-primary" />
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Slide indicator dots */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 max-w-[80%] overflow-x-auto py-1">
          {allSlides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentSlide(i)}
              className={`w-2 h-2 rounded-full transition-all flex-shrink-0 ${
                i === currentSlide
                  ? 'bg-primary w-6 neon-glow'
                  : 'bg-muted-foreground/30'
              }`}
            />
          ))}
        </div>

        {/* Zoom & fullscreen */}
        <div className="absolute top-4 right-4 flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="w-8 h-8"
            onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))}
          >
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className="font-mono text-[10px] text-muted-foreground w-10 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="w-8 h-8"
            onClick={() => setZoom((z) => Math.min(2, z + 0.1))}
          >
            <ZoomIn className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="w-8 h-8"
            onClick={toggleFullscreen}
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </Button>
        </div>

        {/* Slide info */}
        {slide && slide.type !== 'default' && (
          <div className="absolute top-4 left-4 flex items-center gap-2">
            <span className="font-mono text-[10px] text-muted-foreground bg-muted/80 px-2 py-1 rounded">
              {currentSlide + 1}/{totalSlides} — {slide.title}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="w-7 h-7"
              onClick={() => {
                if (slide.type === 'imported' && slide.groupId)
                  removeGroup(slide.groupId);
                else removeSlide(slide.id);
              }}
            >
              <Trash2 className="w-3.5 h-3.5 text-destructive" />
            </Button>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4">
        <Button
          onClick={goPrev}
          disabled={currentSlide === 0}
          variant="outline"
          size="lg"
          className="font-mono border-border/50 hover:neon-border hover:text-primary"
        >
          <ChevronLeft className="w-5 h-5 mr-2" /> PREVIOUS
        </Button>
        <Button
          onClick={goNext}
          disabled={currentSlide === totalSlides - 1}
          size="lg"
          className="font-mono bg-primary text-primary-foreground hover:bg-primary/80"
        >
          NEXT <ChevronRight className="w-5 h-5 ml-2" />
        </Button>
      </div>
    </motion.div>
  );
}
