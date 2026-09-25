"use client";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Maximize2, Pause, Play } from "lucide-react";
import { cn } from "@/lib/utils";

interface Slide {
  eyebrow: string;
  title: string;
  body?: string;
}

/**
 * Presentation-style lesson player. Renders the lesson as timed slides (dark stage,
 * large type, orange/blue accent lines). Swap for a <video> when `videoUrl` is set.
 */
export function SlidePlayer({ dayLabel, title, summary, keyPoints, videoUrl, durationMin }: { dayLabel: string; title: string; summary: string; keyPoints: string[]; videoUrl?: string | null; durationMin: number }) {
  const slides: Slide[] = [
    { eyebrow: dayLabel, title, body: summary },
    ...keyPoints.map((k, i) => ({ eyebrow: `Key point ${i + 1} of ${keyPoints.length}`, title: k })),
    { eyebrow: "Recap", title: "Now apply it inside Leadabo", body: "Mark the lesson complete when you’ve finished the task below." },
  ];
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [t, setT] = useState(0);
  const PER = 6000;

  useEffect(() => {
    if (!playing) return;
    const start = Date.now() - t;
    const id = setInterval(() => {
      const el = Date.now() - start;
      if (el >= PER) {
        setT(0);
        setI((x) => {
          if (x >= slides.length - 1) {
            setPlaying(false);
            return x;
          }
          return x + 1;
        });
      } else setT(el);
    }, 50);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, i]);

  if (videoUrl) {
    return <video src={videoUrl} controls className="aspect-video w-full rounded-2xl border bg-black" />;
  }

  const s = slides[i];
  const overall = ((i + t / PER) / slides.length) * 100;
  return (
    <div id="player" className="group relative overflow-hidden rounded-2xl border bg-[#07080b] text-white">
      <div className="relative aspect-video">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(244,120,42,0.14),transparent_55%),radial-gradient(ellipse_at_bottom_right,rgba(57,135,229,0.14),transparent_55%)]" />
        <div className="absolute left-[7%] top-[18%] h-[64%] w-[3px] rounded-full bg-gradient-to-b from-[#f4782a] via-[#f4782a]/60 to-transparent" />
        <div className="absolute bottom-[14%] left-[7%] right-[7%] h-px bg-gradient-to-r from-[#3987e5]/70 via-white/10 to-transparent" />
        <div key={i} className="absolute inset-0 flex flex-col justify-center px-[11%] animate-fade-in">
          <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#f4782a] sm:text-xs">{s.eyebrow}</p>
          <h2 className={cn("mt-3 font-semibold tracking-tight", i === 0 ? "text-2xl sm:text-4xl lg:text-5xl" : "text-xl sm:text-3xl lg:text-4xl")}>{s.title}</h2>
          {s.body && <p className="mt-4 max-w-2xl text-sm text-white/60 sm:text-base">{s.body}</p>}
        </div>
        <p className="absolute right-[7%] top-[8%] text-[10px] font-semibold uppercase tracking-[0.3em] text-white/30">Leadabo Academy</p>
        {!playing && i === 0 && t === 0 && (
          <button onClick={() => setPlaying(true)} className="absolute bottom-[20%] right-[7%] flex items-center gap-2 rounded-xl border border-[#f4782a]/40 bg-[#f4782a]/20 px-4 py-2.5 text-sm font-medium text-[#f4782a] backdrop-blur transition-transform hover:scale-105" aria-label="Play lesson">
            <Play className="size-4 fill-[#f4782a]" /> Play lesson
          </button>
        )}
      </div>
      <div className="flex items-center gap-3 border-t border-white/10 bg-black/40 px-4 py-2.5 text-xs">
        <button onClick={() => setPlaying(!playing)} className="rounded p-1 hover:bg-white/10" aria-label={playing ? "Pause" : "Play"}>
          {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
        </button>
        <button onClick={() => { setI(Math.max(0, i - 1)); setT(0); }} className="rounded p-1 hover:bg-white/10" aria-label="Previous slide">
          <ChevronLeft className="size-4" />
        </button>
        <button onClick={() => { setI(Math.min(slides.length - 1, i + 1)); setT(0); }} className="rounded p-1 hover:bg-white/10" aria-label="Next slide">
          <ChevronRight className="size-4" />
        </button>
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-[#f4782a] transition-[width] duration-100" style={{ width: `${overall}%` }} />
        </div>
        <span className="tabular-nums text-white/60">
          {i + 1}/{slides.length} · {durationMin} min
        </span>
        <button onClick={() => document.getElementById("player")?.requestFullscreen?.()} className="rounded p-1 hover:bg-white/10" aria-label="Fullscreen">
          <Maximize2 className="size-4" />
        </button>
      </div>
    </div>
  );
}
