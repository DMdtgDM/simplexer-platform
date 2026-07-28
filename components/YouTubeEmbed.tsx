'use client';

import { useState } from 'react';
import { Play } from 'lucide-react';

function getYouTubeId(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/
  );
  return match ? match[1] : null;
}

export function YouTubeEmbed({ url, title }: { url: string; title: string }) {
  const [loaded, setLoaded] = useState(false);
  const videoId = getYouTubeId(url);

  if (!videoId) return null;

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black">
      {loaded ? (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1`}
          title={title}
          className="h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      ) : (
        <button
          type="button"
          onClick={() => setLoaded(true)}
          className="group relative h-full w-full"
          aria-label={`Play video: ${title}`}
        >
          {/* thumbnail only downloads on render, no video payload until tap */}
          <img
            src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`}
            alt={title}
            width={480}
            height={360}
            loading="lazy"
            className="h-full w-full object-cover opacity-90 transition-opacity group-hover:opacity-100"
          />
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/90 shadow-lg transition-transform group-active:scale-95">
              <Play size={26} className="ml-1 fill-primary text-primary" />
            </span>
          </span>
          <span className="absolute bottom-2 right-2 rounded bg-black/70 px-1.5 py-0.5 text-[10px] text-white">
            Tap to load video
          </span>
        </button>
      )}
    </div>
  );
}
