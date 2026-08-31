"use client";

import { useEffect, useRef, useState } from "react";
import { Play, Pause, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

function buildAudioSrc(url: string): string {
  if (!url) return "";
  if (url.includes("drive.google.com")) {
    return `/api/audio-proxy?url=${encodeURIComponent(url)}`;
  }
  return url;
}

export function AdminVoiceAudioPlayer({
  src,
  className,
}: {
  src: string;
  className?: string;
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress]   = useState(0);
  const [duration, setDuration]   = useState<number | null>(null);
  const [current, setCurrent]     = useState(0);
  const [error, setError]         = useState(false);
  const audioRef   = useRef<HTMLAudioElement | null>(null);
  const barRef     = useRef<HTMLDivElement>(null);

  const audioSrc = buildAudioSrc(src);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;

    setIsPlaying(false);
    setProgress(0);
    setCurrent(0);
    setDuration(null);
    setError(false);

    const onTime = () => {
      setCurrent(el.currentTime);
      if (el.duration && isFinite(el.duration)) {
        setProgress((el.currentTime / el.duration) * 100);
      }
    };

    const onMeta = () => {
      if (el.duration && isFinite(el.duration) && el.duration > 0) {
        setDuration(el.duration);
      }
    };

    const onEnded = () => {
      setIsPlaying(false);
      setProgress(0);
      setCurrent(0);
      el.currentTime = 0;
    };

    const onError = () => {
      setError(true);
      setIsPlaying(false);
    };

    el.addEventListener("timeupdate",    onTime);
    el.addEventListener("loadedmetadata",onMeta);
    el.addEventListener("durationchange",onMeta);
    el.addEventListener("ended",         onEnded);
    el.addEventListener("error",         onError);

    return () => {
      el.removeEventListener("timeupdate",    onTime);
      el.removeEventListener("loadedmetadata",onMeta);
      el.removeEventListener("durationchange",onMeta);
      el.removeEventListener("ended",         onEnded);
      el.removeEventListener("error",         onError);
    };
  }, [audioSrc]);

  const toggle = async () => {
    const el = audioRef.current;
    if (!el) return;
    if (isPlaying) {
      el.pause();
      setIsPlaying(false);
    } else {
      try {
        setError(false);
        // Pause all other audio elements on the page
        document.querySelectorAll("audio").forEach((a) => {
          if (a !== el) a.pause();
        });
        await el.play();
        setIsPlaying(true);
      } catch (e) {
        console.error("Playback failed:", e);
        setError(true);
        setIsPlaying(false);
      }
    }
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = audioRef.current;
    if (!el || !barRef.current) return;
    const { left, width } = barRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - left) / width));
    if (el.duration && isFinite(el.duration)) {
      el.currentTime = ratio * el.duration;
    }
  };

  const fmt = (t: number): string => {
    if (!isFinite(t) || t < 0) return "0:00";
    return `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;
  };

  if (!src) {
    return <div className="text-xs text-muted-foreground">—</div>;
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <audio ref={audioRef} src={audioSrc} preload="metadata" className="hidden" />
      
      {/* Simple Player matching UI */}
      <button
        onClick={toggle}
        className="flex items-center justify-center text-zinc-300 hover:text-white transition-colors"
      >
        {isPlaying ? (
          <Pause className="size-4" />
        ) : (
          <Play className="size-4" />
        )}
      </button>

      <div className="text-xs tabular-nums text-zinc-300 font-medium">
        {error ? "Error" : `${fmt(current)} / ${duration ? fmt(duration) : "0:00"}`}
      </div>

      <a 
        href={(function getPreviewUrl(url: string) {
          if (!url) return "";
          const match = url.match(/(?:id=|d\/)([a-zA-Z0-9_-]+)/);
          if (match && url.includes("drive.google.com")) {
            return `https://drive.google.com/file/d/${match[1]}/view`;
          }
          return url;
        })(src)}
        target="_blank" 
        rel="noopener noreferrer"
        className="flex size-7 items-center justify-center rounded-md bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white transition-colors ml-2"
        title="Preview original file"
      >
        <ExternalLink className="size-3.5" />
      </a>
    </div>
  );
}