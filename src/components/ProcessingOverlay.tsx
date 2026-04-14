import { motion } from 'motion/react';
import { Sparkles, Loader2 } from 'lucide-react';

export default function ProcessingOverlay() {
  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-xl rounded-3xl overflow-hidden">
      <motion.div 
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative mb-8"
      >
        <div className="w-24 h-24 rounded-3xl bg-white flex items-center justify-center shadow-[0_0_50px_rgba(255,255,255,0.3)]">
          <Sparkles className="w-12 h-12 text-black animate-pulse" />
        </div>
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          className="absolute -inset-4 border-2 border-dashed border-white/20 rounded-full"
        />
      </motion.div>

      <div className="text-center space-y-4">
        <h2 className="text-2xl font-medium text-white tracking-tight">
          Enhancing your photo...
        </h2>
        <div className="flex items-center justify-center gap-3 text-neutral-400">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm font-mono uppercase tracking-widest">AI Processing</span>
        </div>
      </div>

      {/* Progress Bar Simulation */}
      <div className="mt-12 w-64 h-1 bg-neutral-800 rounded-full overflow-hidden">
        <motion.div 
          initial={{ x: "-100%" }}
          animate={{ x: "100%" }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="w-full h-full bg-gradient-to-r from-transparent via-white to-transparent"
        />
      </div>

      <div className="absolute bottom-12 left-0 right-0 px-12">
        <p className="text-xs text-neutral-500 text-center leading-relaxed">
          Our AI is analyzing lighting, clarity, and textures to create a professional studio result. This usually takes a few seconds.
        </p>
      </div>
    </div>
  );
}
