import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Music, Video, Upload, Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Disc3, Link, X, Maximize, Minimize } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { VolumeKnob3D } from '@/components/ui/VolumeKnob3D';
import { useAppStore } from '@/stores/useAppStore';

type MediaType = 'none' | 'audio' | 'video' | 'youtube';

function extractYouTubeId(url: string): string | null {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

export default function MediaPlayer() {
  const [mediaType, setMediaType] = useState<MediaType>('none');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaName, setMediaName] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [youtubeId, setYoutubeId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(80);
  const [isMuted, setIsMuted] = useState(false);
  const [discRotation, setDiscRotation] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showVolumeKnob, setShowVolumeKnob] = useState(false);

  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number>(0);
  const lastVoiceCommand = useAppStore((s) => s.lastVoiceCommand);
  const setLastVoiceCommand = useAppStore((s) => s.setLastVoiceCommand);
  const activeMedia = mediaType === 'audio' ? audioRef.current : videoRef.current;

  // Disc spinning animation for audio
  useEffect(() => {
    if (mediaType !== 'audio' || !isPlaying) return;
    let last = performance.now();
    const spin = (now: number) => {
      setDiscRotation((r) => r + (now - last) * 0.06);
      last = now;
      animRef.current = requestAnimationFrame(spin);
    };
    animRef.current = requestAnimationFrame(spin);
    return () => cancelAnimationFrame(animRef.current);
  }, [isPlaying, mediaType]);

  // Volume sync
  useEffect(() => {
    if (activeMedia) {
      activeMedia.volume = isMuted ? 0 : volume / 100;
    }
  }, [volume, isMuted, activeMedia]);
  
  const togglePlay = useCallback(() => {
    if (!activeMedia) return;
    if (isPlaying) { activeMedia.pause(); setIsPlaying(false); }
    else { activeMedia.play(); setIsPlaying(true); }
  }, [activeMedia, isPlaying]);

  // 🔥 AI VOICE CONTROL: ĐIỀU CHỈNH VOLUME 🔥
  useEffect(() => {
    if (lastVoiceCommand === 'NONE') return;

    let newVol = volume;
    
    // Xử lý các con số (Set volume cứng)
    if (lastVoiceCommand === 'ONE') newVol = 20;
    else if (lastVoiceCommand === 'TWO') newVol = 40;
    else if (lastVoiceCommand === 'THREE') newVol = 60;
    else if (lastVoiceCommand === 'FOUR') newVol = 80;
    else if (lastVoiceCommand === 'FIVE') newVol = 100;
    
    // Xử lý To / Nhỏ (Tăng giảm tương đối)
    else if (lastVoiceCommand === 'BIG') newVol = Math.min(100, volume + 20);
    else if (lastVoiceCommand === 'SMALL') newVol = Math.max(0, volume - 20);

    // Nếu volume có thay đổi, cập nhật giao diện và thông báo
    if (newVol !== volume) {
      setVolume(newVol);
      setIsMuted(newVol === 0);
      toast({ 
        title: "🎵 Đã chỉnh Âm lượng", 
        description: `Mức hiện tại: ${newVol}% (Bằng lệnh giọng nói)`,
        variant: "default"
      });
    }
    
    // Xử lý lệnh Phát/Dừng nhạc (Dùng lệnh Bắn = Play/Pause cho vui)
    if (lastVoiceCommand === 'SHOOT') {
       togglePlay();
       toast({ title: isPlaying ? "⏸ Đã Dừng" : "▶ Đang Phát", description: "Lệnh giọng nói" });
    }

    // Reset lệnh để chờ lần nói tiếp theo
    setLastVoiceCommand('NONE');

  },[lastVoiceCommand, volume, isPlaying, togglePlay, setLastVoiceCommand]);

  // Time update
  useEffect(() => {
    const el = activeMedia;
    if (!el) return;
    const onTime = () => setCurrentTime(el.currentTime);
    const onDur = () => setDuration(el.duration || 0);
    const onEnd = () => setIsPlaying(false);
    el.addEventListener('timeupdate', onTime);
    el.addEventListener('loadedmetadata', onDur);
    el.addEventListener('ended', onEnd);
    return () => {
      el.removeEventListener('timeupdate', onTime);
      el.removeEventListener('loadedmetadata', onDur);
      el.removeEventListener('ended', onEnd);
    };
  }, [activeMedia]);

  // Fullscreen change listener
  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const isAudio = file.type.startsWith('audio/');
    const isVideo = file.type.startsWith('video/');
    if (!isAudio && !isVideo) {
      toast({ title: 'Lỗi', description: 'Chỉ hỗ trợ file MP3, MP4 hoặc video/audio.', variant: 'destructive' });
      return;
    }
    setMediaType(isAudio ? 'audio' : 'video');
    setMediaUrl(url);
    setMediaName(file.name);
    setYoutubeId(null);
    setIsPlaying(false);
    setCurrentTime(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleYoutube = () => {
    const id = extractYouTubeId(youtubeUrl);
    if (!id) {
      toast({ title: 'Lỗi', description: 'Link YouTube không hợp lệ.', variant: 'destructive' });
      return;
    }
    setYoutubeId(id);
    setMediaType('youtube');
    setMediaUrl('');
    setMediaName(`YouTube — ${id}`);
    setIsPlaying(true);
  };


  const seek = (val: number[]) => {
    if (activeMedia) {
      activeMedia.currentTime = val[0];
      setCurrentTime(val[0]);
    }
  };

  const toggleFullscreen = useCallback(() => {
    if (!playerContainerRef.current) return;
    if (!document.fullscreenElement) {
      playerContainerRef.current.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }, []);

  const clearMedia = () => {
    if (mediaUrl) URL.revokeObjectURL(mediaUrl);
    setMediaType('none');
    setMediaUrl('');
    setMediaName('');
    setYoutubeId(null);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  };

  const fmt = (t: number) => {
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-6">
      <AnimatePresence>
        {showVolumeKnob && (
          <VolumeKnob3D
            volume={isMuted ? 0 : volume}
            onVolumeChange={(v) => { setVolume(v); setIsMuted(v === 0); }}
            onClose={() => setShowVolumeKnob(false)}
          />
        )}
      </AnimatePresence>
      <div className="flex items-center gap-3">
        <Music className="w-6 h-6 text-primary" />
        <h2 className="font-mono text-xl font-bold neon-text tracking-widest">MEDIA PLAYER</h2>
      </div>

      {/* Import controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="glass rounded-xl p-4 border border-border/50 space-y-3">
          <h3 className="font-mono text-xs tracking-widest text-muted-foreground">IMPORT FILE</h3>
          <input ref={fileInputRef} type="file" accept="audio/*,video/*" onChange={handleFileUpload} className="hidden" />
          <Button variant="outline" className="w-full font-mono gap-2" onClick={() => fileInputRef.current?.click()}>
            <Upload className="w-4 h-4" /> Import MP3 / MP4
          </Button>
        </div>
        <div className="glass rounded-xl p-4 border border-border/50 space-y-3">
          <h3 className="font-mono text-xs tracking-widest text-muted-foreground">YOUTUBE LINK</h3>
          <div className="flex gap-2">
            <Input placeholder="https://youtube.com/watch?v=..." value={youtubeUrl} onChange={(e) => setYoutubeUrl(e.target.value)} className="font-mono text-xs" />
            <Button variant="default" size="sm" onClick={handleYoutube}><Link className="w-4 h-4" /></Button>
          </div>
        </div>
      </div>

      {/* Player area */}
      <div
        ref={playerContainerRef}
        className={`glass neon-border rounded-xl overflow-hidden relative ${isFullscreen ? 'flex flex-col justify-center bg-background' : ''}`}
        style={{ minHeight: isFullscreen ? '100vh' : 400 }}
      >
        {mediaType === 'none' && (
          <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground gap-4">
            <Disc3 className="w-20 h-20 opacity-20" />
            <p className="font-mono text-sm">Import file hoặc dán link YouTube để bắt đầu</p>
          </div>
        )}

        {/* Audio player with spinning disc */}
        {mediaType === 'audio' && (
          <div className={`flex flex-col items-center justify-center gap-6 relative ${isFullscreen ? 'flex-1' : 'h-[400px]'}`}>
            <audio ref={audioRef} src={mediaUrl} preload="metadata" />
            <div className="relative">
              <div
                className="w-56 h-56 rounded-full border-4 border-primary/30 flex items-center justify-center"
                style={{
                  transform: `rotate(${discRotation}deg)`,
                  background: 'conic-gradient(from 0deg, hsl(var(--primary) / 0.3), hsl(var(--muted)), hsl(var(--primary) / 0.5), hsl(var(--muted)), hsl(var(--primary) / 0.3))',
                  boxShadow: isPlaying ? '0 0 60px hsl(var(--primary) / 0.4), 0 0 120px hsl(var(--primary) / 0.15)' : 'none',
                  transition: isPlaying ? 'none' : 'box-shadow 0.3s',
                }}
              >
                <div className="w-12 h-12 rounded-full bg-background border-2 border-primary/50 flex items-center justify-center">
                  <div className="w-3 h-3 rounded-full bg-primary/50" />
                </div>
                {/* Vinyl grooves */}
                {[24, 32, 40, 48, 56, 64, 72, 80, 88, 96].map((r) => (
                  <div key={r} className="absolute rounded-full border border-foreground/[0.03]" style={{ width: r * 2, height: r * 2 }} />
                ))}
              </div>
            </div>
            <p className="font-mono text-sm text-foreground truncate max-w-xs">{mediaName}</p>
          </div>
        )}

        {/* Video player */}
        {mediaType === 'video' && (
          <div className={`flex items-center justify-center bg-black ${isFullscreen ? 'flex-1' : ''}`}>
            <video
              ref={videoRef}
              src={mediaUrl}
              className={`w-full object-contain ${isFullscreen ? 'max-h-[calc(100vh-100px)]' : 'max-h-[500px]'}`}
              preload="metadata"
              onClick={togglePlay}
            />
          </div>
        )}

        {/* YouTube embed */}
        {mediaType === 'youtube' && youtubeId && (
          <div className={`w-full ${isFullscreen ? 'flex-1' : 'aspect-video'}`}>
            <iframe
              src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&rel=0`}
              className="w-full h-full"
              allow="autoplay; encrypted-media"
              allowFullScreen
              title="YouTube"
            />
          </div>
        )}

        {/* Top-right buttons */}
        {mediaType !== 'none' && (
          <div className="absolute top-2 right-2 flex gap-1 z-10">
            <Button variant="ghost" size="icon" className="w-8 h-8" onClick={toggleFullscreen}>
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </Button>
            <Button variant="ghost" size="icon" className="w-8 h-8" onClick={clearMedia}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Fullscreen transport controls */}
        {isFullscreen && (mediaType === 'audio' || mediaType === 'video') && (
          <div className="p-4 space-y-3">
            <div className="flex items-center gap-3">
              <span className="font-mono text-[10px] text-muted-foreground w-10">{fmt(currentTime)}</span>
              <Slider value={[currentTime]} max={duration || 1} step={0.5} onValueChange={seek} className="flex-1" />
              <span className="font-mono text-[10px] text-muted-foreground w-10">{fmt(duration)}</span>
            </div>
            <div className="flex items-center justify-center gap-4">
              <Button variant="ghost" size="icon" className="w-9 h-9" onClick={() => { if (activeMedia) activeMedia.currentTime = Math.max(0, currentTime - 10); }}>
                <SkipBack className="w-4 h-4" />
              </Button>
              <Button variant="default" size="icon" className="w-14 h-14 rounded-full" onClick={togglePlay}>
                {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
              </Button>
              <Button variant="ghost" size="icon" className="w-9 h-9" onClick={() => { if (activeMedia) activeMedia.currentTime = Math.min(duration, currentTime + 10); }}>
                <SkipForward className="w-4 h-4" />
              </Button>
              <div className="flex items-center gap-2 w-40">
                <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => setIsMuted(!isMuted)}>
                  {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </Button>
                <Slider value={[isMuted ? 0 : volume]} max={100} step={1} onValueChange={(v) => { setVolume(v[0]); setIsMuted(false); }} className="flex-1" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Transport controls (non-fullscreen) */}
      {!isFullscreen && (mediaType === 'audio' || mediaType === 'video') && (
        <div className="glass rounded-xl p-4 border border-border/50 space-y-3">
          <div className="flex items-center gap-3">
            <span className="font-mono text-[10px] text-muted-foreground w-10">{fmt(currentTime)}</span>
            <Slider value={[currentTime]} max={duration || 1} step={0.5} onValueChange={seek} className="flex-1" />
            <span className="font-mono text-[10px] text-muted-foreground w-10">{fmt(duration)}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="w-9 h-9" onClick={() => { if (activeMedia) activeMedia.currentTime = Math.max(0, currentTime - 10); }}>
                <SkipBack className="w-4 h-4" />
              </Button>
              <Button variant="default" size="icon" className="w-12 h-12 rounded-full" onClick={togglePlay}>
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
              </Button>
              <Button variant="ghost" size="icon" className="w-9 h-9" onClick={() => { if (activeMedia) activeMedia.currentTime = Math.min(duration, currentTime + 10); }}>
                <SkipForward className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2 w-40">
              <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => setIsMuted(!isMuted)}>
                {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </Button>
              <Slider value={[isMuted ? 0 : volume]} max={100} step={1} onValueChange={(v) => { setVolume(v[0]); setIsMuted(false); }} className="flex-1" />
              <Button
                variant="ghost"
                size="icon"
                className="w-8 h-8 rounded-full border border-primary/40 hover:border-primary bg-primary/5 hover:bg-primary/15"
                title="Mở MPU Volume Knob"
                onClick={() => setShowVolumeKnob(true)}
              >
                <span className="text-[10px] font-bold text-primary">3D</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
