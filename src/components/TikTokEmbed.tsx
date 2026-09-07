"use client";

import { useEffect } from "react";
import Script from "next/script";

interface TikTokEmbedProps {
  videoId: string;
  author: string;
}

export function TikTokEmbed({ videoId, author }: TikTokEmbedProps) {
  // We need to tell TikTok to render the blockquote when the component mounts
  // especially if navigating via Next.js client-side routing
  useEffect(() => {
    // Check if the script has already loaded and attached to window
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const win = window as any;
    if (win.tiktokEmbed && win.tiktokEmbed.load) {
      win.tiktokEmbed.load();
    }
  }, [videoId]);

  return (
    <div className="flex w-full justify-center overflow-hidden rounded-[2rem] bg-paper shadow-sm border border-line">
      <blockquote
        className="tiktok-embed"
        cite={`https://www.tiktok.com/@${author}/video/${videoId}`}
        data-video-id={videoId}
        style={{ maxWidth: "605px", minWidth: "325px", width: "100%", margin: "0 auto" }}
      >
        <section>
          <a
            target="_blank"
            rel="noopener noreferrer"
            title={`@${author}`}
            href={`https://www.tiktok.com/@${author}?refer=embed`}
          >
            @{author}
          </a>
        </section>
      </blockquote>
      <Script src="https://www.tiktok.com/embed.js" strategy="lazyOnload" />
    </div>
  );
}
