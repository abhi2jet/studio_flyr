import React from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Sparkles, Camera } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { AnimatePresence } from 'framer-motion';
import CameraModal from './CameraModal';

interface UploadZoneProps {
  onUpload: (files: File[]) => void;
  isProcessing?: boolean;
}

export default function UploadZone({ onUpload, isProcessing }: UploadZoneProps) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        onUpload(acceptedFiles);
      }
    },
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp']
    },
    multiple: true,
    disabled: isProcessing
  } as any);

  const [showCamera, setShowCamera] = React.useState(false);

  return (
    <>
      <div
        {...getRootProps()}
        className={cn(
          "relative w-full max-w-2xl aspect-square sm:aspect-[4/3] rounded-3xl border-2 border-dashed transition-all duration-300 flex flex-col items-center justify-center gap-6 cursor-pointer group overflow-hidden",
          isDragActive 
            ? "border-white bg-white/5" 
            : "border-neutral-800 hover:border-neutral-600 bg-neutral-900/50",
          isProcessing && "pointer-events-none opacity-50"
        )}
      >
        <input {...getInputProps()} />
        
        <div className="relative">
          <div className="w-20 h-20 rounded-2xl bg-neutral-800 flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
            <Upload className="w-8 h-8 text-neutral-400 group-hover:text-white transition-colors" />
          </div>
          <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-xl animate-bounce">
            <Sparkles className="w-4 h-4 text-black" />
          </div>
        </div>

        <div className="text-center space-y-2">
          <h3 className="text-xl font-medium text-white">
            {isDragActive ? "Drop your photo here" : "Upload product photo"}
          </h3>
          <p className="text-neutral-500 text-sm max-w-xs mx-auto">
            Transform your ordinary product shots into professional studio-quality images instantly.
          </p>
        </div>

        <div className="flex gap-4 mt-4">
          <button 
            type="button"
            onClick={(e) => { e.stopPropagation(); setShowCamera(true); }}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-white text-black text-sm font-medium hover:bg-neutral-200 transition-colors"
          >
            <Camera className="w-4 h-4" />
            Use Camera
          </button>
        </div>

        {/* Background Glow */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      </div>

      <AnimatePresence>
        {showCamera && (
          <CameraModal 
            onCapture={(file) => onUpload([file])} 
            onClose={() => setShowCamera(false)} 
          />
        )}
      </AnimatePresence>
    </>
  );
}
