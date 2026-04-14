import { motion } from 'motion/react';
import { ExternalLink, Trash2 } from 'lucide-react';

interface ProjectCardProps {
  id: string;
  originalImage: string;
  enhancedImage: string;
  timestamp: number;
  onDelete: (id: string) => void;
  onClick: () => void;
}

export default function ProjectCard({ 
  id, 
  originalImage, 
  enhancedImage, 
  timestamp, 
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
      className="group relative bg-neutral-900 rounded-2xl overflow-hidden border border-neutral-800 hover:border-neutral-700 transition-all duration-300"
    >
      <div 
        className="aspect-square overflow-hidden cursor-pointer"
        onClick={onClick}
      >
        <img 
          src={enhancedImage} 
          alt="Project" 
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-white/70 uppercase tracking-widest font-medium">
              View Project
            </span>
            <ExternalLink className="w-4 h-4 text-white" />
          </div>
        </div>
      </div>

      <div className="p-4 flex items-center justify-between">
        <div className="space-y-1">
          <h4 className="text-sm font-medium text-white truncate max-w-[120px]">
            Project {id.slice(0, 4)}
          </h4>
          <p className="text-[10px] text-neutral-500 uppercase tracking-wider">
            {date}
          </p>
        </div>
        
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onDelete(id);
          }}
          className="p-2 rounded-full hover:bg-red-500/10 text-neutral-600 hover:text-red-500 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}
