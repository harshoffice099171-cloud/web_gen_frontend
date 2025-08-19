import React from 'react';

interface VideoMetadataProps {
  totalSlides: number;
  duration: string;
  resolution: string;
}

export function VideoMetadata({ totalSlides, duration, resolution }: VideoMetadataProps) {
  return (
    <div className="flex items-center gap-6 p-4 bg-white/5 rounded-lg backdrop-blur-sm">
      <div className="flex items-center gap-2">
        <svg className="w-5 h-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M3 9h18" />
        </svg>
        <div>
          <p className="text-sm font-medium text-gray-200">{totalSlides}</p>
          <p className="text-xs text-gray-400">Slides</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <svg className="w-5 h-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 6v6l4 2" />
        </svg>
        <div>
          <p className="text-sm font-medium text-gray-200">{duration}</p>
          <p className="text-xs text-gray-400">Duration</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <svg className="w-5 h-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M3 9h18" />
          <path d="M9 3v18" />
        </svg>
        <div>
          <p className="text-sm font-medium text-gray-200">{resolution}</p>
          <p className="text-xs text-gray-400">Resolution</p>
        </div>
      </div>
    </div>
  );
} 