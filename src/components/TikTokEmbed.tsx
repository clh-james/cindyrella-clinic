"use client";


interface TikTokEmbedProps {
  videoId: string;
  author: string;
}

export function TikTokEmbed({ videoId, author }: TikTokEmbedProps) {

  return (
    <div className="flex w-full justify-center overflow-hidden rounded-[2rem] bg-paper shadow-sm border border-line h-[700px]">
      <iframe
        src={`https://www.tiktok.com/embed/v2/${videoId}?lang=en-US`}
        style={{ width: "100%", height: "100%", border: "none", display: "block" }}
        allow="encrypted-media;"
        title="TikTok video"
      />
    </div>
  );
}
