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
      
      {/* Player Box */}
      <div className="flex items-center gap-2 rounded-full bg-[#161719] border border-white/10 p-1 pr-3 w-[160px]">
        <button
          onClick={toggle}
          className="flex size-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
        >
          {isPlaying ? (
            <Pause className="size-3 fill-current" />
          ) : (
            <Play className="size-3 fill-current ml-0.5" />
          )}
        </button>

        <div className="flex flex-1 flex-col justify-center">
          <div className="text-[10px] tabular-nums text-white/90 text-center font-medium">
            {error ? "Error" : `${fmt(current)} / ${duration ? fmt(duration) : "0:00"}`}
          </div>
        </div>
      </div>

      {/* External Link */}
      <a 
        href={src}
        target="_blank" 
        rel="noopener noreferrer"
        className="flex size-7 items-center justify-center rounded-md bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white transition-colors"
        title="Open exact link"
      >
        <ExternalLink className="size-3.5" />
      </a>
    </div>
  );
}