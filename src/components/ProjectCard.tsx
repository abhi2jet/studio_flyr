import { motion } from 'motion/react';
import { ExternalLink, Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';

interface ProjectCardProps {
  id: string;
  originalImage: string;
  enhancedImage: string;
  templateId?: string;
  templateName?: string;
  aspectRatio?: string;
  timestamp: number;
  category?: string;
  onDelete: (id: string) => void;
  onClick: () => void;
}

export default function ProjectCard({ 
  id, 
  originalImage, 
  enhancedImage, 
  templateName,
  aspectRatio,
  timestamp,
  category,
  onDelete,
  onClick 
}: ProjectCardProps) {
  const date = new Date(timestamp).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="group relative bg-slate-900/50 backdrop-blur-sm rounded-2xl overflow-hidden border border-slate-800 hover:border-slate-700 hover:shadow-[0_0_30px_rgba(255,255,255,0.03)] transition-all duration-500"
    >
      <div 
        className={cn(
          "overflow-hidden cursor-pointer",
          aspectRatio === '16:9' ? "aspect-video" : aspectRatio === '9:16' ? "aspect-[9/16]" : "aspect-square"
        )}
        onClick={onClick}
      >
        <img 
          src={enhancedImage} 
          alt="Project" 
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-x-0 bottom-0 p-3 flex items-center justify-between bg-gradient-to-t from-slate-950/90 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
             <span className="text-[10px] text-white/90 font-medium bg-slate-950/50 px-2.5 py-1 rounded-full backdrop-blur-md border border-white/10">
                {category || 'Uncategorized'}
             </span>
        </div>
      </div>

      <div className="p-4 flex items-center justify-between">
        <div className="space-y-0.5">
          <h4 className="text-sm font-semibold text-slate-100 truncate max-w-[120px]">
            {templateName || `Project ${id.slice(0, 4)}`}
          </h4>
          <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">
            {date}
          </p>
        </div>
        
        <div className="space-y-1 text-right">
          <p className="text-[10px] text-slate-500 font-bold">
            {aspectRatio || '1:1'}
          </p>
        </div>
        
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onDelete(id);
          }}
          className="p-2 rounded-xl hover:bg-red-500/10 text-slate-600 hover:text-red-400 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}
