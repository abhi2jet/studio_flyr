import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';

interface BeforeAfterSliderProps {
  beforeImage: string;
  afterImage: string;
  filters?: {
    brightness: number;
    contrast: number;
    saturate: number;
    sharpen: number;
  };
}

export default function BeforeAfterSlider({ beforeImage, afterImage, filters }: BeforeAfterSliderProps) {
  const [sliderPosition, setSliderPosition] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);

  const filterStyle = filters ? {
    filter: `brightness(${filters.brightness}%) contrast(${filters.contrast}%) saturate(${filters.saturate}%) ${filters.sharpen > 0 ? `contrast(${100 + filters.sharpen}%) brightness(${100 + (filters.sharpen / 4)}%)` : ''}`
  } : {};

  const handleMove = (clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percent = (x / rect.width) * 100;
    setSliderPosition(percent);
  };

  const onMouseMove = (e: React.MouseEvent) => handleMove(e.clientX);
  const onTouchMove = (e: React.TouchEvent) => handleMove(e.touches[0].clientX);

  return (
    <div 
      ref={containerRef}
      className="relative w-full aspect-square md:aspect-video rounded-2xl overflow-hidden cursor-ew-resize select-none bg-neutral-900 shadow-2xl"
      onMouseMove={onMouseMove}
      onTouchMove={onTouchMove}
    >
      {/* After Image (Base) */}
      <img 
        src={afterImage} 
        alt="Enhanced" 
        className="absolute inset-0 w-full h-full object-contain"
        style={filterStyle}
        referrerPolicy="no-referrer"
      />

      {/* Before Image (Clipped) */}
      <div 
        className="absolute inset-0 w-full h-full overflow-hidden"
        style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
      >
        <img 
          src={beforeImage} 
          alt="Original" 
          className="absolute inset-0 w-full h-full object-contain"
          referrerPolicy="no-referrer"
        />
      </div>

      {/* Slider Line */}
      <div 
        className="absolute inset-y-0 w-1 bg-white shadow-[0_0_10px_rgba(0,0,0,0.5)] z-10"
        style={{ left: `${sliderPosition}%` }}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center">
          <div className="flex gap-1">
            <div className="w-0.5 h-3 bg-neutral-400 rounded-full" />
            <div className="w-0.5 h-3 bg-neutral-400 rounded-full" />
          </div>
        </div>
      </div>

      {/* Labels */}
      <div className="absolute bottom-4 left-4 z-20 px-3 py-1 bg-black/50 backdrop-blur-md rounded-full text-[10px] uppercase tracking-widest text-white/70 font-medium">
        Original
      </div>
      <div className="absolute bottom-4 right-4 z-20 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] uppercase tracking-widest text-white font-medium border border-white/20">
        Enhanced
      </div>
    </div>
  );
}
