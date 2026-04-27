import React from 'react';
import { motion } from 'motion/react';
import { cn } from '@/src/lib/utils';

interface EnvironmentPreset {
  name: string;
  prompt: string;
  category: string;
  image: string;
}

interface EnvironmentGalleryProps {
  presets: EnvironmentPreset[];
  selectedCategory: string;
  onSelect: (prompt: string) => void;
  isGenerating: boolean;
}

export default function EnvironmentGallery({ presets, selectedCategory, onSelect, isGenerating }: EnvironmentGalleryProps) {
  const filtered = selectedCategory === 'All' 
    ? presets 
    : presets.filter(p => p.category === selectedCategory);

  return (
    <div className="grid grid-cols-2 gap-3">
      {filtered.map((preset) => (
        <motion.button
          key={preset.name}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onSelect(preset.prompt)}
          disabled={isGenerating}
          className="group relative h-24 rounded-2xl overflow-hidden border border-neutral-800 hover:border-neutral-500 transition-all"
        >
          <img 
            src={preset.image || 'https://images.unsplash.com/photo-1549488344-c6c77d706509?q=80&w=600'} 
            alt={preset.name} 
            className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" 
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent z-10" />
          <div className="absolute bottom-3 left-3 right-3 z-20">
            <p className="text-xs font-bold text-white truncate">{preset.name}</p>
            <p className="text-[10px] text-neutral-400 capitalize">{preset.category}</p>
          </div>
        </motion.button>
      ))}
    </div>
  );
}
