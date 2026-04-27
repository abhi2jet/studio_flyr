/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { GoogleGenAI } from "@google/genai";
import { 
  Sparkles, 
  Plus, 
  Download, 
  ChevronLeft, 
  History, 
  LayoutGrid,
  Info,
  Loader2,
  Share2,
  RefreshCw,
  Watch,
  Smartphone,
  Shirt,
  Box,
  Sparkle,
  Home,
  Video,
  AlertCircle,
  SlidersHorizontal,
  RotateCcw,
  Trash2,
  X,
  Settings2,
  Check,
  Layers
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import UploadZone from './components/UploadZone';
import BeforeAfterSlider from './components/BeforeAfterSlider';
import ProcessingOverlay from './components/ProcessingOverlay';
import ProjectCard from './components/ProjectCard';
import { ApiStatusBadge } from './components/ApiStatusBadge';
import { cn, base64ToFile } from './lib/utils';
import { saveProjects, loadProjects } from './lib/storage';
import { testGeminiConnection, generateVideo } from './services/geminiService';
import { applyWatermark, WatermarkOptions } from './lib/imageUtils';
import AccountManager from './components/AccountManager';
import PricingSection from './components/PricingSection';
import ShowcaseSection from './components/ShowcaseSection';
import EnvironmentGallery from './components/EnvironmentGallery';
import CameraModal from './components/CameraModal';
import { testConnection } from './lib/firebase';

interface Project {
  id: string;
  originalImage: string;
  enhancedImage: string;
  noBgImage?: string;
  tryOnImage?: string;
  modelVariations?: string[];
  environments?: string[];
  templateId?: string;
  templateName?: string;
  aspectRatio?: string;
  timestamp: number;
  category?: string;
}

interface Template {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  prompt: string;
  suggestedBgs: string[];
  envSuggestions: string[];
  categoryPresets: { name: string; prompt: string }[];
}

const getAI = () => {
  const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("API Key is not configured. Please select an API key from the settings menu (gear icon) to enable AI features.");
  }
  return new GoogleGenAI({ apiKey });
};

export default function App() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRemovingBg, setIsRemovingBg] = useState(false);
  const [isTryingOn, setIsTryingOn] = useState(false);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [variationProgress, setVariationProgress] = useState<{current: number, total: number} | null>(null);
  const [isGeneratingEnv, setIsGeneratingEnv] = useState(false);
  const [imagePrompt, setImagePrompt] = useState('');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [showInteriorCamera, setShowInteriorCamera] = useState(false);
  const [retryStatus, setRetryStatus] = useState<string | null>(null);
  const [selectedModelVarIndex, setSelectedModelVarIndex] = useState<number | null>(null);
  const [view, setView] = useState<'home' | 'editor' | 'pricing' | 'showcase'>('home');
  const [bgColor, setBgColor] = useState<string>('transparent');
  const [activeTab, setActiveTab] = useState<'enhanced' | 'noBg' | 'tryOn' | 'environment'>('enhanced');
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>(['general']);
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [batchSettings, setBatchSettings] = useState({
    removeBg: false,
    autoEnv: false,
    autoTryOn: false
  });

  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });
  const [batchComplete, setBatchComplete] = useState(false);
  const [envPrompt, setEnvPrompt] = useState('');
  const [selectedEnvIndex, setSelectedEnvIndex] = useState<number | null>(null);
  const [selectedEnvCategory, setSelectedEnvCategory] = useState<string>('All');
  const [projectCategory, setProjectCategory] = useState<string>('All');
  const [apiStatus, setApiStatus] = useState<'idle' | 'testing' | 'ok' | 'error'>('idle');
  const [apiErrorMessage, setApiErrorMessage] = useState<string | null>(null);

  // Test API connection on mount and when key might have changed
  useEffect(() => {
    testConnection();
    const testConnectionAI = async () => {
      setApiStatus('testing');
      try {
        const ai = getAI();
        // Use a very lightweight model for testing
        await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: [{ parts: [{ text: 'ping' }] }],
          config: { maxOutputTokens: 1 }
        });
        setApiStatus('ok');
        setApiErrorMessage(null);
      } catch (err: any) {
        console.error("API Connection Test Failed:", err);
        setApiStatus('error');
        const errStr = JSON.stringify(err).toLowerCase();
        if (errStr.includes("403") || errStr.includes("permission_denied")) {
          setApiErrorMessage("Your API key doesn't have permission for these models. Please switch to a key with 'Gemini Ecosystem' access.");
        } else if (errStr.includes("429") || errStr.includes("quota")) {
          setApiErrorMessage("API Quota exceeded. Please wait or switch keys.");
        } else {
          setApiErrorMessage(err?.message || "API connection failed.");
        }
      }
    };

    testConnectionAI();
  }, []);
  const [error, setError] = useState<{ message: string; suggestion?: string; onRetry?: () => void; isQuota?: boolean } | null>(null);
  const [cooldown, setCooldown] = useState<number>(0);
  
  // Global error handling
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error("Global error:", event.error);
      setError({ message: `An unexpected error occurred: ${event.message}` });
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      console.error("Unhandled rejection:", event.reason);
      setError({ message: `A background task failed: ${event.reason?.message || 'Unknown error'}` });
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  const [modelGender, setModelGender] = useState('female');
  const [modelEthnicity, setModelEthnicity] = useState('diverse');
  const [modelPose, setModelPose] = useState('portrait');
  const [modelAge, setModelAge] = useState('young-adult');
  const [modelVibe, setModelVibe] = useState('elegant');
  const [modelSkinTone, setModelSkinTone] = useState('natural');
  const [modelHairColor, setModelHairColor] = useState('natural');
  const [modelClothingStyle, setModelClothingStyle] = useState('minimalist');
  const [modelCustomPrompt, setModelCustomPrompt] = useState('');

  const [filters, setFilters] = useState({
    brightness: 100,
    contrast: 100,
    saturate: 100,
    sharpen: 0
  });

  const [watermarkOptions, setWatermarkOptions] = useState<WatermarkOptions>({
    text: 'PALLAVI JEWELLERS',
    placement: 'center',
    opacity: 30,
    size: 8,
    disabled: false,
    fontWeight: 'bold',
    fontStyle: 'normal',
    fontFamily: 'Arial'
  });

  useEffect(() => {
    (window as any).__watermarkOptions = watermarkOptions;
  }, [watermarkOptions]);


  const [selectedAspectRatios, setSelectedAspectRatios] = useState<('1:1' | '16:9' | '9:16')[]>(['1:1']);

  const aspectRatioOptions = [
    { id: '1:1', label: 'Square', icon: <div className="w-3 h-3 border border-current rounded-sm" /> },
    { id: '16:9', label: 'Landscape', icon: <div className="w-4 h-2.5 border border-current rounded-sm" /> },
    { id: '9:16', label: 'Portrait', icon: <div className="w-2.5 h-4 border border-current rounded-sm" /> }
  ];

  const genderOptions = [
    { id: 'female', label: 'Female' },
    { id: 'male', label: 'Male' },
    { id: 'non-binary', label: 'Non-binary' }
  ];

  const ethnicityOptions = [
    { id: 'diverse', label: 'Diverse' },
    { id: 'caucasian', label: 'Caucasian' },
    { id: 'black', label: 'Black' },
    { id: 'asian', label: 'Asian' },
    { id: 'hispanic', label: 'Hispanic' },
    { id: 'south-asian', label: 'South Asian' }
  ];

  const poseOptions = [
    { id: 'portrait', label: 'Portrait' },
    { id: 'close-up', label: 'Close-up' },
    { id: 'lifestyle', label: 'Lifestyle' },
    { id: 'editorial', label: 'Editorial' }
  ];

  const ageOptions = [
    { id: 'young-adult', label: 'Young Adult' },
    { id: 'middle-aged', label: 'Middle Aged' },
    { id: 'senior', label: 'Senior' }
  ];

  const vibeOptions = [
    { id: 'elegant', label: 'Elegant' },
    { id: 'minimalist', label: 'Minimalist' },
    { id: 'bold', label: 'Bold' },
    { id: 'natural', label: 'Natural' }
  ];

  const skinToneOptions = [
    { id: 'natural', label: 'Natural' },
    { id: 'fair', label: 'Fair' },
    { id: 'tan', label: 'Tan' },
    { id: 'deep', label: 'Deep' },
    { id: 'olive', label: 'Olive' }
  ];

  const hairColorOptions = [
    { id: 'natural', label: 'Natural' },
    { id: 'black', label: 'Black' },
    { id: 'brown', label: 'Brown' },
    { id: 'blonde', label: 'Blonde' },
    { id: 'red', label: 'Red' },
    { id: 'grey', label: 'Grey' }
  ];

  const clothingStyleOptions = [
    { id: 'minimalist', label: 'Minimalist' },
    { id: 'formal', label: 'Formal' },
    { id: 'casual', label: 'Casual' },
    { id: 'streetwear', label: 'Streetwear' },
    { id: 'bohemian', label: 'Bohemian' },
    { id: 'luxury', label: 'Luxury' }
  ];

  const presetEnvironments = [
    { name: 'Luxury Marble', prompt: 'a high-end luxury marble surface with soft golden hour lighting and elegant shadows', category: 'Luxury' },
    { name: 'Silk Fabric', prompt: 'a soft, draped silk fabric background with gentle folds and pearlescent lighting', category: 'Luxury' },
    { name: 'Gold Accents', prompt: 'a dark matte surface with subtle gold leaf accents and warm spotlighting', category: 'Luxury' },
    { name: 'Velvet Stage', prompt: 'a deep royal blue velvet surface with dramatic theatrical spotlighting', category: 'Luxury' },
    
    { name: 'Minimal Studio', prompt: 'a clean, minimalist professional studio background with soft grey gradients', category: 'Minimalist' },
    { name: 'Pure White', prompt: 'a seamless pure white studio background with soft natural shadows', category: 'Minimalist' },
    { name: 'Soft Sand', prompt: 'a smooth, fine sand surface with minimalist zen-like lighting', category: 'Minimalist' },
    { name: 'Matte Pastel', prompt: 'a soft matte pastel pink background with minimal geometric shadows', category: 'Minimalist' },
    
    { name: 'Natural Wood', prompt: 'a rustic wooden table in a sunlit garden with soft bokeh greenery', category: 'Nature' },
    { name: 'Tropical Palm', prompt: 'a sandy surface with palm leaf shadows and bright turquoise ocean background', category: 'Nature' },
    { name: 'Forest Moss', prompt: 'a damp mossy forest floor with dappled sunlight through ancient trees', category: 'Nature' },
    { name: 'Autumn Leaves', prompt: 'a wooden deck covered in vibrant orange and red maple leaves with soft morning mist', category: 'Nature' },
    
    { name: 'Urban Concrete', prompt: 'a polished concrete surface in a modern industrial loft with cool blue lighting', category: 'Urban' },
    { name: 'Brick Wall', prompt: 'a weathered red brick wall background with industrial pendant lighting', category: 'Urban' },
    { name: 'Rooftop Dusk', prompt: 'a glass table on a city rooftop at dusk with glowing city lights in the background', category: 'Urban' },
    
    { name: 'Neon Cyberpunk', prompt: 'a dark reflective surface with vibrant neon blue and purple ambient lighting', category: 'Tech' },
    { name: 'Circuit Board', prompt: 'a futuristic glowing circuit board surface with green data streams', category: 'Tech' },
    { name: 'Glass Lab', prompt: 'a clean white laboratory setting with frosted glass and surgical precision lighting', category: 'Tech' },
    
    { name: 'Jewelry Showroom', prompt: 'a high-end luxury jewelry showroom with elegant glass displays and soft premium lighting', category: 'Events' },
    { name: 'Royal Wedding', prompt: 'a grand royal wedding hall with ornate gold decorations, floral arrangements, and majestic lighting', category: 'Events' },
    { name: 'Marriage Stage', prompt: 'a beautifully decorated traditional marriage stage with vibrant flowers and celebratory lighting', category: 'Events' },
    { name: 'Banquet Hall', prompt: 'a sophisticated banquet hall with crystal chandeliers and elegant table settings', category: 'Events' },
  ];

  const templates: Template[] = [
    { 
      id: 'studio-softbox', 
      name: 'Studio Softbox', 
      description: 'Professional softbox lighting for multiple items.',
      icon: <Sparkles className="w-4 h-4" />,
      prompt: 'Enhance this product photo using professional studio softbox lighting. This mode is specifically designed for multiple items. Ensure all items are clearly visible with soft, even lighting and professional grey studio background. Maintain high clarity and identical item appearance.',
      suggestedBgs: ['transparent', 'white', 'grey'],
      envSuggestions: ['infinite grey studio', 'white sweep background', 'minimalist commercial set'],
      categoryPresets: [
        { name: 'Pure White', prompt: 'a seamless pure white studio background with soft natural shadows and high-key lighting' },
        { name: 'Technical Grey', prompt: 'a professional technical grey studio background with precise softbox gradients' }
      ]
    },
    { 
      id: 'jewelry-set', 
      name: 'Jewelry Set', 
      description: 'Optimized for sets or multiple jewelry pieces.',
      icon: <Layers className="w-4 h-4" />,
      prompt: 'Enhance this photo of multiple jewelry items or a jewelry set. Use professional studio lighting to ensure every piece is perfectly clear, sparkling, and luxurious. Focus on macro details for every item in the set. Maintain consistent metallic shine and gemstone clarity across all pieces. Make it look like a high-end luxury brand catalog shot.',
      suggestedBgs: ['transparent', 'black', 'white', 'grey'],
      envSuggestions: ['luxury display case', 'presentation box', 'multi-tier jewelry stand'],
      categoryPresets: [
        { name: 'Display Case', prompt: 'a high-end jewelry display case with plush navy velvet lining and elegant spotlighting' },
        { name: 'Studio Stand', prompt: 'a professional multi-tier jewelry stand on a clean white reflective surface' },
        { name: 'Gift Box', prompt: 'an open luxury jewelry gift box with soft satin lining and warm boutique lighting' }
      ]
    },
    { 
      id: 'general', 
      name: 'General', 
      description: 'Versatile studio look for any product type.',
      icon: <Box className="w-4 h-4" />,
      prompt: 'Enhance this product photo to look professional, studio-quality. Improve lighting, clarity, and overall appearance. Make it look like a high-end commercial photoshoot. Keep the product identical but make the environment and lighting perfect.',
      suggestedBgs: ['transparent', 'white', 'grey'],
      envSuggestions: ['minimalist studio', 'marble countertop', 'wooden shelf'],
      categoryPresets: [
        { name: 'Studio Softbox', prompt: 'a professional product photography studio with softbox lighting and a clean grey background' },
        { name: 'Floating Platform', prompt: 'a minimalist floating stone platform in a void with dramatic spotlighting' }
      ]
    },
    { 
      id: 'jewelry', 
      name: 'Jewelry', 
      description: 'Macro focus with high-end sparkle and shine.',
      icon: <Watch className="w-4 h-4" />,
      prompt: 'Enhance this jewelry photo. Focus on sparkle, macro details, and luxurious studio lighting. Make it look like a high-end luxury brand photoshoot. Enhance reflections and metallic shine.',
      suggestedBgs: ['transparent', 'black', 'white'],
      envSuggestions: ['velvet display', 'silk fabric background', 'luxury boutique window'],
      categoryPresets: [
        { name: 'Velvet Cushion', prompt: 'a plush dark velvet cushion with soft focused lighting highlighting jewelry details' },
        { name: 'Diamond Bokeh', prompt: 'a luxury background with shimmering diamond-like bokeh and soft golden light' },
        { name: 'Mirror Surface', prompt: 'a highly reflective black mirror surface with sharp professional studio lighting' }
      ]
    },
    { 
      id: 'electronics', 
      name: 'Electronics', 
      description: 'Sleek, modern tech aesthetic with clean lines.',
      icon: <Smartphone className="w-4 h-4" />,
      prompt: 'Enhance this electronics product photo. Focus on clean lines, matte textures, and modern tech lighting. Make it look like a sleek product launch image. Ensure screens look vibrant and surfaces are dust-free.',
      suggestedBgs: ['transparent', 'black', 'blue'],
      envSuggestions: ['modern tech desk', 'neon cyberpunk setting', 'clean white lab'],
      categoryPresets: [
        { name: 'Gaming Desk', prompt: 'a modern gaming setup with RGB lighting and dark carbon fiber textures' },
        { name: 'Tech Blueprint', prompt: 'a clean white surface with faint blue technical blueprint lines in the background' },
        { name: 'Circuit Board', prompt: 'a high-tech background featuring glowing green circuit board patterns and depth of field' }
      ]
    },
    { 
      id: 'fashion', 
      name: 'Fashion', 
      description: 'Editorial magazine style with soft textures.',
      icon: <Shirt className="w-4 h-4" />,
      prompt: 'Enhance this fashion item photo. Focus on fabric texture, natural soft lighting, and lifestyle studio vibes. Make it look like a high-end fashion magazine shot. Ensure colors are accurate and textures are soft.',
      suggestedBgs: ['transparent', 'white', 'grey', 'blue'],
      envSuggestions: ['sunny loft apartment', 'urban street background', 'minimalist concrete studio'],
      categoryPresets: [
        { name: 'Parisian Street', prompt: 'a blurred romantic Parisian street background with soft morning sunlight' },
        { name: 'Industrial Loft', prompt: 'a modern industrial loft with exposed brick walls and large windows with natural light' },
        { name: 'Walk-in Closet', prompt: 'a luxury high-end walk-in closet with warm wooden textures and organized aesthetic' }
      ]
    },
    { 
      id: 'cosmetics', 
      name: 'Cosmetics', 
      description: 'Premium beauty look with elegant reflections.',
      icon: <Sparkle className="w-4 h-4" />,
      prompt: 'Enhance this cosmetics product photo. Focus on creamy textures, elegant reflections, and soft-focus backgrounds. Make it look like a premium beauty brand advertisement. Highlight the product packaging and texture.',
      suggestedBgs: ['transparent', 'white', 'grey'],
      envSuggestions: ['water ripples background', 'soft pastel petals', 'marble vanity'],
      categoryPresets: [
        { name: 'Water Ripples', prompt: 'a serene background of clear water ripples with soft caustic lighting effects' },
        { name: 'Floral Petals', prompt: 'a soft-focus background of delicate pink rose petals and morning dew' },
        { name: 'Vanity Mirror', prompt: 'a luxury marble vanity with a blurred mirror reflection and warm makeup lighting' }
      ]
    },
    { 
      id: 'home', 
      name: 'Home', 
      description: 'Warm, inviting interior design catalog vibes.',
      icon: <Home className="w-4 h-4" />,
      prompt: 'Enhance this home decor product photo. Focus on warm, inviting lighting and natural shadows. Make it look like a high-end interior design catalog shot. Ensure materials like wood or fabric look rich and detailed.',
      suggestedBgs: ['transparent', 'white', 'grey'],
      envSuggestions: ['cozy living room', 'modern kitchen counter', 'sunlit bedroom'],
      categoryPresets: [
        { name: 'Scandinavian Living', prompt: 'a bright Scandinavian style living room with light wood and neutral tones' },
        { name: 'Sunlit Nook', prompt: 'a cozy reading nook with warm sunlight streaming through a window and soft shadows' },
        { name: 'Modern Kitchen', prompt: 'a sleek modern kitchen with white marble countertops and minimalist decor' }
      ]
    },
    { 
      id: 'cyberpunk', 
      name: 'Cyberpunk', 
      description: 'Futuristic neon aesthetic with high contrast.',
      icon: <Sparkles className="w-4 h-4" />,
      prompt: 'Enhance this product photo with a cyberpunk, futuristic aesthetic. Use high contrast, neon lighting (cyan, magenta, yellow), and dark reflective surfaces. Make it look like a product from a high-tech dystopian future. Add digital artifacts and glowing elements.',
      suggestedBgs: ['transparent', 'black', 'purple'],
      envSuggestions: ['neon city street', 'high-tech server room', 'underground hacker den'],
      categoryPresets: [
        { name: 'Neon Alley', prompt: 'a dark rainy alleyway in a futuristic city with glowing neon signs reflecting in puddles' },
        { name: 'Data Center', prompt: 'a futuristic data center with rows of glowing servers and blue laser security lines' },
        { name: 'Night Market', prompt: 'a vibrant futuristic night market with holographic advertisements and crowded stalls' }
      ]
    },
    { 
      id: 'editorial', 
      name: 'Editorial', 
      description: 'High-fashion magazine aesthetic with grain.',
      icon: <LayoutGrid className="w-4 h-4" />,
      prompt: 'Enhance this product photo with a high-fashion editorial magazine aesthetic. Use soft, directional lighting, subtle film grain, and a muted color palette. Make it look like a spread in Vogue or Harper\'s Bazaar. Focus on composition and artistic flair.',
      suggestedBgs: ['transparent', 'white', 'beige'],
      envSuggestions: ['minimalist art gallery', 'sun-drenched studio', 'architectural concrete space'],
      categoryPresets: [
        { name: 'Gallery White', prompt: 'a pristine white art gallery space with soft shadows and architectural lines' },
        { name: 'Sun Drenched', prompt: 'a minimalist studio space with harsh but beautiful sunlight streaming through large windows' },
        { name: 'Brutalist Space', prompt: 'a raw concrete brutalist architectural space with dramatic shadows and minimalist vibes' }
      ]
    }
  ];

  const currentTemplate = templates.find(t => t.id === (currentProject?.templateId || selectedTemplateIds[0])) || templates[0];

  const bgOptions = [
    { id: 'transparent', label: 'Transparent', color: 'transparent' },
    { id: 'white', label: 'White', color: '#FFFFFF' },
    { id: 'black', label: 'Black', color: '#000000' },
    { id: 'grey', label: 'Grey', color: '#F3F4F6' },
    { id: 'blue', label: 'Blue', color: '#EBF5FF' },
  ];

  // Load projects from IndexedDB on mount
  useEffect(() => {
    const initStorage = async () => {
      try {
        const saved = await loadProjects();
        if (saved && saved.length > 0) {
          setProjects(saved.sort((a, b) => b.timestamp - a.timestamp));
        } else {
          // Fallback to localStorage for migration
          const legacy = localStorage.getItem('studioflyr_projects');
          if (legacy) {
            const parsed = JSON.parse(legacy);
            setProjects(parsed);
            // Save to IndexedDB immediately
            await saveProjects(parsed);
            // Clear legacy
            localStorage.removeItem('studioflyr_projects');
          }
        }
      } catch (e) {
        console.error("Failed to load projects from storage", e);
      }
    };
    initStorage();
  }, []);

  // Save projects to IndexedDB whenever they change
  useEffect(() => {
    const persist = async () => {
      try {
        await saveProjects(projects);
      } catch (e) {
        console.error("Failed to save projects to IndexedDB", e);
        setError({ 
          message: "Storage error: Could not save your project.",
          suggestion: "Your device storage might be full. Try clearing your browser cache or deleting some old projects to free up space."
        });
      }
    };
    if (projects.length > 0) {
      persist();
    }
  }, [projects]);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const handleAIError = (error: any, context: string, onRetry?: () => void) => {
    console.error(`${context} failed:`, error);
    
    // Improved stringification for Error objects
    const errorStr = typeof error === 'string' 
      ? error 
      : (error instanceof Error ? `${error.message} ${JSON.stringify(error)}` : JSON.stringify(error));

    let message = error?.message || (typeof error === 'string' ? error : `${context} failed. Please try again.`);
    
    if (message.includes('{"error":')) {
      try {
        const parsed = JSON.parse(message.substring(message.indexOf('{')));
        message = parsed.error?.message || message;
      } catch (e) {
        // ignore
      }
    }
    
    let suggestion = "";
    let isQuota = false;
    
    // Check for 429 Resource Exhausted or other specific errors
    const errorStrLower = errorStr.toLowerCase();
    if (errorStrLower.includes("resource_exhausted") || errorStrLower.includes("429")) {
      message = "AI Quota Exceeded";
      suggestion = "You've reached the rate limit for the free AI tier. You can wait a moment, or select a different API key from the settings menu to continue.";
      isQuota = true;
      setCooldown(30);
    } else if (errorStrLower.includes("safety")) {
      message = "AI Safety Filter";
      suggestion = "This request was blocked by safety filters. Please try a different image or prompt.";
    } else if (errorStrLower.includes("invalid_argument")) {
      message = "AI Error: Invalid request";
      suggestion = "Please ensure your photo is clear and try again.";
    } else if (errorStrLower.includes("permission_denied") || errorStrLower.includes("403")) {
      message = "API Permission Denied";
      suggestion = "Your current API key is restricted and cannot access the high-quality image models. Please click 'Switch API Key' and select a key from a different project (e.g., a paid project or one with full Gemini access).";
      const aistudio = (window as any).aistudio;
      if (aistudio) {
        aistudio.openSelectKey();
      }
    }
    
    setError({ message, suggestion, onRetry, isQuota });
    // Don't auto-clear if there's a retry option, or clear after longer
    setTimeout(() => setError(null), onRetry ? 15000 : 5000);
  };

  // Cooldown timer effect
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const callAIWithRetry = async <T extends unknown>(
    operation: () => Promise<T>,
    context: string,
    maxRetries = 7
  ): Promise<T> => {
    let lastError: any;
    for (let i = 0; i < maxRetries; i++) {
      try {
        setRetryStatus(null);
        return await operation();
      } catch (err: any) {
        lastError = err;
        const errorStr = JSON.stringify(err).toLowerCase();
        if (errorStr.includes("resource_exhausted") || errorStr.includes("429") || errorStr.includes("overloaded") || errorStr.includes("deadline_exceeded")) {
          if (i < maxRetries - 1) {
            // Exponential backoff with jitter and longer base delay
            const baseDelay = Math.pow(2, i + 1) * 2000; // 4s, 8s, 16s, 32s, 64s...
            const jitter = Math.random() * 2000;
            const delay = baseDelay + jitter;
            const waitTime = Math.round(delay/1000);
            console.warn(`${context} quota hit, retrying in ${waitTime}s... (Attempt ${i + 1}/${maxRetries})`);
            setRetryStatus(`Quota hit (${i + 1}/${maxRetries}). Retrying in ${waitTime}s...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
        }
        setRetryStatus(null);
        throw err;
      }
    }
    setRetryStatus(null);
    throw lastError;
  };

  const handleBatchUpload = async (files: File[]) => {
    if (files.length === 0) return;
    
    // If only one file and only one template/aspect ratio choice, go to editor (old behavior)
    if (files.length === 1 && selectedTemplateIds.length === 1 && selectedAspectRatios.length === 1) {
      enhanceImage(files[0]);
      return;
    }

    setIsBatchProcessing(true);
    const totalTasks = files.length * selectedTemplateIds.length * selectedAspectRatios.length;
    setBatchProgress({ current: 0, total: totalTasks });
    
    let completedCount = 0;
    
    // Create all tasks first
    const tasks: { file: File, templateId: string, aspectRatio: '1:1' | '16:9' | '9:16' }[] = [];
    files.forEach(file => {
      selectedTemplateIds.forEach(templateId => {
        selectedAspectRatios.forEach(aspectRatio => {
          tasks.push({ file, templateId, aspectRatio });
        });
      });
    });

    // Process tasks
    await Promise.all(tasks.map(async (task) => {
      try {
        let project = await enhanceImage(task.file, false, true, task.templateId, task.aspectRatio);
        
        if (project && batchSettings.removeBg) {
          project = await removeBackground('transparent', project, true);
        }
        
        if (project && batchSettings.autoEnv) {
          const template = templates.find(t => t.id === project!.templateId) || templates[0];
          const prompt = template.envSuggestions[0];
          project = await generateEnvironment(prompt, project, true);
        }
        
        if (project && project.enhancedImage && batchSettings.autoTryOn && (project.templateId?.includes('jewelry') || project.templateId === 'studio-softbox')) {
          const result = await tryOnModel(project, true);
          if (result) project = result;
        }
      } catch (err) {
        console.error(`Batch processing failed for a task:`, err);
      } finally {
        completedCount++;
        setBatchProgress({ current: completedCount, total: totalTasks });
      }
    }));
    
    setIsBatchProcessing(false);
    setBatchProgress({ current: 0, total: 0 });
    setBatchComplete(true);
    setTimeout(() => setBatchComplete(false), 5000);
  };

  const enhanceImage = async (input: File | string, useFallback = false, isBatch = false, overrideTemplateId?: string, overrideAspectRatio?: '1:1' | '16:9' | '9:16'): Promise<Project | null> => {
    if (!isBatch) {
      setIsProcessing(true);
      setView('editor');
    }
    setBgColor('transparent');
    setActiveTab('enhanced');
    
    const templateId = overrideTemplateId || selectedTemplateIds[0] || 'general';
    const aspectRatio = overrideAspectRatio || selectedAspectRatios[0] || '1:1';
    const template = templates.find(t => t.id === templateId) || templates[0];
    
    try {
      const ai = getAI();
      let base64Data = '';
      let mimeType = 'image/png';

      if (input instanceof File) {
        base64Data = await fileToBase64(input);
        mimeType = input.type;
      } else {
        base64Data = input;
        const match = input.match(/^data:([^;]+);base64,/);
        if (match) mimeType = match[1];
      }

      const base64Content = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;

      // Validation check for multiple jewelry items
      const multiItemAllowedIds = ['studio-softbox', 'jewelry-set'];
      if (!multiItemAllowedIds.includes(templateId)) {
        try {
          const validationResponse = await callAIWithRetry(() => ai.models.generateContent({
            model: 'gemini-2.0-flash',
            contents: {
              parts: [
                {
                  inlineData: {
                    data: base64Content,
                    mimeType: mimeType,
                  },
                },
                {
                  text: "Analyze this image. Does it contain more than one distinct jewelry item (e.g. multiple rings, multiple necklaces, multiple pairs of earrings)? Reply with EXACTLY 'YES' or 'NO'.",
                },
              ],
            },
            config: {
              maxOutputTokens: 5,
              temperature: 0,
            }
          }), "Validation");

          const validationText = validationResponse.candidates?.[0]?.content?.parts?.[0]?.text;
          const result = validationText?.trim().toUpperCase();
          if (result === 'YES') {
            if (templateId !== 'jewelry-set') {
              console.warn("Multiple jewelry items detected, automatically switching to 'Jewelry Set' template.");
              return enhanceImage(input, useFallback, isBatch, 'jewelry-set', aspectRatio);
            }
            throw new Error(`Multiple jewelry items detected in an image. Please use 'Jewelry Set' or 'Studio Softbox' for multiple items. (Template: ${template.name})`);
          }
        } catch (vErr: any) {
          if (vErr.message?.includes("Multiple jewelry items detected")) {
            throw vErr;
          }
          console.warn("Validation check failed, continuing enhancement:", vErr);
        }
      }

      // Fallback to 2.5 if 3.1 fails with permission error
      const modelName = useFallback ? 'gemini-2.5-flash-image' : 'gemini-3.1-flash-image-preview';
      
      const response = await callAIWithRetry(() => ai.models.generateContent({
        model: modelName,
        contents: {
          parts: [
            {
              inlineData: {
                data: base64Content,
                mimeType: mimeType,
              },
            },
            {
              text: template.prompt,
            },
          ],
        },
        config: modelName.includes('3.1') ? {
          imageConfig: {
            imageSize: "1K",
            aspectRatio: aspectRatio
          }
        } : undefined
      }), `Image enhancement (${useFallback ? 'Standard' : 'Pro'})`, 10);

      let enhancedImageBase64 = '';
      if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) {
            const rawBase64 = `data:image/png;base64,${part.inlineData.data}`;
            enhancedImageBase64 = await applyWatermark(rawBase64);
            break;
          }
        }
      }

      // Fallback if no image returned
      if (!enhancedImageBase64) {
        throw new Error("No enhanced image returned from AI");
      }

      const newProject: Project = {
        id: Math.random().toString(36).substring(7),
        originalImage: base64Data,
        enhancedImage: enhancedImageBase64,
        templateId: templateId,
        templateName: template.name,
        aspectRatio: aspectRatio,
        category: 'Uncategorized',
        timestamp: Date.now(),
      };

      setProjects(prev => [newProject, ...prev]);
      if (!isBatch) setCurrentProject(newProject);
      return newProject;
    } catch (error: any) {
      const errorStr = JSON.stringify(error).toLowerCase();
      // Handle permission denied/403/quota issues with fallback model
      if (!useFallback && (errorStr.includes("403") || errorStr.includes("permission_denied") || errorStr.includes("resource_exhausted"))) {
        console.warn("Model unavailable or quota reached, falling back to Standard model...");
        return enhanceImage(input, true, isBatch, overrideTemplateId, overrideAspectRatio);
      }
      
      if (!isBatch) {
        handleAIError(error, "Enhancement", () => enhanceImage(input, false, isBatch, overrideTemplateId, overrideAspectRatio));
        setView('home');
      } else {
        throw error;
      }
      return null;
    } finally {
      if (!isBatch) {
        setIsProcessing(false);
      }
    }
  };

  const removeBackground = async (color: string, projectOverride?: Project, isBatch = false): Promise<Project | null> => {
    const project = projectOverride || currentProject;
    if (!project) return null;
    
    if (!isBatch) {
      setIsRemovingBg(true);
      setBgColor(color);
    }

    try {
      const ai = getAI();
      const base64Data = project.enhancedImage;
      const base64Content = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
      const mimeType = base64Data.includes(';') ? base64Data.split(';')[0].split(':')[1] : 'image/png';

      const prompt = color === 'transparent' 
        ? "Remove the background of this product image and make it transparent. Return only the isolated product."
        : `Remove the background of this product image and replace it with a solid ${color} background. Return the isolated product on the new background.`;

      const response = await callAIWithRetry(() => ai.models.generateContent({
        model: 'gemini-3.1-flash-image-preview',
        contents: {
          parts: [
            {
              inlineData: {
                data: base64Content,
                mimeType: mimeType,
              },
            },
            {
              text: prompt,
            },
          ],
        },
        config: {
          imageConfig: {
            imageSize: "1K",
            aspectRatio: "1:1"
          }
        }
      }), "Background removal", 10);

      let processedImage = '';
      if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) {
            const rawBase64 = `data:image/png;base64,${part.inlineData.data}`;
            processedImage = await applyWatermark(rawBase64);
            break;
          }
        }
      }

      if (processedImage) {
        const updatedProject = { ...project, noBgImage: processedImage };
        setProjects(prev => prev.map(p => p.id === project.id ? updatedProject : p));
        if (currentProject?.id === project.id) setCurrentProject(updatedProject);
        if (!isBatch) setActiveTab('noBg');
        return updatedProject;
      }
      return null;
    } catch (error) {
      if (!isBatch) {
        handleAIError(error, "Background removal", () => removeBackground(color));
      } else {
        throw error;
      }
      return null;
    } finally {
      if (!isBatch) setIsRemovingBg(false);
    }
  };

  const tryOnModel = async (projectOverride?: Project, isBatch = false): Promise<Project | null> => {
    const project = projectOverride || currentProject;
    if (!project) return null;
    
    if (!isBatch) setIsTryingOn(true);

    try {
      const ai = getAI();
      const base64Data = project.enhancedImage;
      if (!base64Data) {
        console.warn("Project missing enhanced image, skipping try-on.");
        return null;
      }
      const base64Content = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
      const mimeType = base64Data.includes(';') ? base64Data.split(';')[0].split(':')[1] : 'image/png';

      const modelDesc = `${modelAge.replace('-', ' ')} ${modelEthnicity === 'diverse' ? '' : modelEthnicity} ${modelGender} model with ${modelSkinTone !== 'natural' ? modelSkinTone + ' skin tone, ' : ''}${modelHairColor !== 'natural' ? modelHairColor + ' hair, ' : ''}wearing a ${modelClothingStyle} style outfit, with a ${modelVibe} aesthetic ${modelCustomPrompt ? ', ' + modelCustomPrompt : ''} in a ${modelPose} pose`;
      const prompt = `Generate a professional, high-end fashion photography shot of ${modelDesc} wearing this specific piece of jewelry. The jewelry should be clearly visible and look identical to the original. The model should be in a studio setting with professional lighting that matches the ${modelVibe} vibe. The focus should be on how the jewelry looks on a person.`;

      const response = await callAIWithRetry(() => ai.models.generateContent({
        model: 'gemini-3.1-flash-image-preview',
        contents: {
          parts: [
            {
              inlineData: {
                data: base64Content,
                mimeType: mimeType,
              },
            },
            {
              text: prompt,
            },
          ],
        },
        config: {
          imageConfig: {
            imageSize: "1K",
            aspectRatio: "1:1"
          }
        }
      }), "Model try-on", 10);

      let processedImage = '';
      if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) {
            const rawBase64 = `data:image/png;base64,${part.inlineData.data}`;
            processedImage = await applyWatermark(rawBase64);
            break;
          }
        }
      }

      if (processedImage) {
        const updatedProject = { ...project, tryOnImage: processedImage };
        setProjects(prev => prev.map(p => p.id === project.id ? updatedProject : p));
        if (currentProject?.id === project.id) {
          setCurrentProject(updatedProject);
          if (!isBatch) setActiveTab('tryOn');
        }
        return updatedProject;
      }
      return null;
    } catch (error) {
      if (!isBatch) {
        handleAIError(error, "Model try-on");
      } else {
        throw error;
      }
      return null;
    } finally {
      if (!isBatch) setIsTryingOn(false);
    }
  };

  const generateVideoHandler = async () => {
    if (!currentProject) return;
    setIsGeneratingVideo(true);
    try {
        const videoUrl = await generateVideo(`Generate a video based on the style of the current project: ${currentProject.templateId}`);
        console.log("Video generated:", videoUrl);
    } catch (err) {
        handleAIError(err, "Video generation", () => generateVideoHandler());
    } finally {
        setIsGeneratingVideo(false);
    }
  };

  const generateModelVariations = async () => {
    if (!currentProject) return;
    setIsTryingOn(true);
    setVariationProgress({ current: 0, total: 3 });

    try {
      const ai = getAI();
      const base64Data = currentProject.enhancedImage;
      const base64Content = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
      const mimeType = base64Data.includes(';') ? base64Data.split(';')[0].split(':')[1] : 'image/png';

      const baseModelDesc = `${modelAge.replace('-', ' ')} ${modelEthnicity === 'diverse' ? '' : modelEthnicity} ${modelGender} model with ${modelSkinTone !== 'natural' ? modelSkinTone + ' skin tone, ' : ''}${modelHairColor !== 'natural' ? modelHairColor + ' hair, ' : ''}wearing a ${modelClothingStyle} style outfit, with a ${modelVibe} aesthetic ${modelCustomPrompt ? ', ' + modelCustomPrompt : ''}`;
      
      const variationPrompts = [
        `a professional fashion shot of ${baseModelDesc} in a dynamic ${modelPose} pose with a confident expression`,
        `a high-end editorial shot of ${baseModelDesc} in a subtle ${modelPose} pose with a soft, elegant expression`,
        `a professional lifestyle shot of ${baseModelDesc} in a natural ${modelPose} pose with a warm, friendly smile`
      ];

      const newVariations: string[] = [];

      for (let i = 0; i < variationPrompts.length; i++) {
        const promptText = variationPrompts[i];
        setVariationProgress({ current: i + 1, total: variationPrompts.length });
        try {
          const prompt = `Generate a professional, high-end fashion photography shot of ${promptText} wearing this specific piece of jewelry. The jewelry should be clearly visible and look identical to the original. The model should be in a studio setting with professional lighting. The focus should be on how the jewelry looks on a person.`;

          const res = await callAIWithRetry(() => ai.models.generateContent({
            model: 'gemini-3.1-flash-image-preview',
            contents: {
              parts: [
                { inlineData: { data: base64Content, mimeType } },
                { text: prompt }
              ]
            },
            config: {
              imageConfig: {
                imageSize: "1K",
                aspectRatio: "1:1"
              }
            }
          }), `Variation ${i + 1}`, 10);

          if (res.candidates?.[0]?.content?.parts) {
            for (const part of res.candidates[0].content.parts) {
              if (part.inlineData) {
                const rawBase64 = `data:image/png;base64,${part.inlineData.data}`;
                newVariations.push(await applyWatermark(rawBase64));
                break;
              }
            }
          }
          
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (err) {
          console.warn(`Failed to generate variation`, err);
          if (JSON.stringify(err).includes("429") || JSON.stringify(err).includes("RESOURCE_EXHAUSTED")) break;
        }
      }

      if (newVariations.length > 0) {
        const updatedVariations = [...newVariations, ...(currentProject.modelVariations || [])];
        const updatedProject = { 
          ...currentProject, 
          modelVariations: updatedVariations,
          tryOnImage: updatedVariations[0] 
        };
        setCurrentProject(updatedProject);
        setProjects(prev => prev.map(p => p.id === currentProject.id ? updatedProject : p));
        setSelectedModelVarIndex(0);
        setActiveTab('tryOn');
      }
    } catch (error) {
      handleAIError(error, "Model variations", () => generateModelVariations());
    } finally {
      setIsTryingOn(false);
      setVariationProgress(null);
    }
  };

  const generateImageArt = async () => {
    if (!imagePrompt.trim()) return;
    setIsGeneratingImage(true);
    try {
      const ai = getAI();
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-image-preview',
        contents: { parts: [{ text: imagePrompt }] },
      });
      // @ts-ignore
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          setGeneratedImage(`data:image/png;base64,${part.inlineData.data}`);
          break;
        }
      }
    } catch (e) {
      console.error(e);
      alert('Failed to generate image');
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const generateEnvironment = async (customPrompt?: string, projectOverride?: Project, isBatch = false): Promise<Project | null> => {
    const project = projectOverride || currentProject;
    if (!project) return null;
    
    if (!isBatch) setIsGeneratingEnv(true);
    const promptToUse = customPrompt || envPrompt || "a professional, minimalist studio setting with soft shadows and elegant lighting";

    try {
      const ai = getAI();
      const base64Data = project.enhancedImage;
      const base64Content = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
      const mimeType = base64Data.includes(';') ? base64Data.split(';')[0].split(':')[1] : 'image/png';

      const response = await callAIWithRetry(() => ai.models.generateContent({
        model: 'gemini-3.1-flash-image-preview',
        contents: {
          parts: [
            {
              inlineData: {
                data: base64Content,
                mimeType: mimeType,
              },
            },
            {
              text: `Place this product in a new environment: ${promptToUse}. The product itself must remain exactly the same in shape, color, and details. The lighting of the product should be adjusted to match the new environment naturally. Return the full image with the product in the new setting.`,
            },
          ],
        },
        config: {
          imageConfig: {
            aspectRatio: project.aspectRatio || selectedAspectRatios[0]
          }
        } as any
      }), "Environment generation", 10);

      let processedImage = '';
      if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) {
            const rawBase64 = `data:image/png;base64,${part.inlineData.data}`;
            processedImage = await applyWatermark(rawBase64);
            break;
          }
        }
      }

      if (processedImage) {
        const newEnvs = [processedImage, ...(project.environments || [])];
        const updatedProject = { ...project, environments: newEnvs };
        setProjects(prev => prev.map(p => p.id === project.id ? updatedProject : p));
        if (currentProject?.id === project.id) {
          setCurrentProject(updatedProject);
          setSelectedEnvIndex(0);
          if (!isBatch) {
            setActiveTab('environment');
            setEnvPrompt('');
          }
        }
        return updatedProject;
      }
      return null;
    } catch (error) {
      if (!isBatch) {
        handleAIError(error, "Environment generation", () => generateEnvironment(customPrompt));
      } else {
        throw error;
      }
      return null;
    } finally {
      if (!isBatch) setIsGeneratingEnv(false);
    }
  };

  const generateSuggestions = async () => {
    if (!currentProject) return;
    const suggestions = currentTemplate.envSuggestions;
    setIsGeneratingEnv(true);

    try {
      const ai = getAI();
      const base64Data = currentProject.enhancedImage;
      const base64Content = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
      const mimeType = base64Data.includes(';') ? base64Data.split(';')[0].split(':')[1] : 'image/png';

      const newImages: string[] = [];

      // Run suggestions sequentially to avoid hitting rate limits (429)
      for (const prompt of suggestions) {
        try {
          const res = await callAIWithRetry(() => ai.models.generateContent({
            model: 'gemini-3.1-flash-image-preview',
            contents: {
              parts: [
                { inlineData: { data: base64Content, mimeType } },
                { text: `Place this product in a new environment: ${prompt}. The product itself must remain exactly the same. Adjust lighting to match. Return the full image.` }
              ]
            },
            config: {
              imageConfig: {
                aspectRatio: selectedAspectRatios[0]
              }
            } as any
          }), `Suggestion: ${prompt}`, 10);

          if (res.candidates?.[0]?.content?.parts) {
            for (const part of res.candidates[0].content.parts) {
              if (part.inlineData) {
                const rawBase64 = `data:image/png;base64,${part.inlineData.data}`;
                newImages.push(await applyWatermark(rawBase64));
                break;
              }
            }
          }
          
          // Larger delay between requests to avoid rate limits
          await new Promise(resolve => setTimeout(resolve, 3000));
        } catch (err) {
          console.warn(`Failed to generate suggestion for prompt: ${prompt}`, err);
          // If we hit a rate limit, stop the loop early but keep what we have
          if (JSON.stringify(err).includes("429") || JSON.stringify(err).includes("RESOURCE_EXHAUSTED")) {
            break;
          }
        }
      }

      if (newImages.length > 0) {
        const newEnvs = [...newImages, ...(currentProject.environments || [])];
        const updatedProject = { ...currentProject, environments: newEnvs };
        setCurrentProject(updatedProject);
        setProjects(prev => prev.map(p => p.id === currentProject.id ? updatedProject : p));
        setSelectedEnvIndex(0);
        setActiveTab('environment');
      }
    } catch (error) {
      handleAIError(error, "Environment suggestions", () => generateSuggestions());
    } finally {
      setIsGeneratingEnv(false);
    }
  };

  const deleteProject = (id: string) => {
    setProjects(prev => prev.filter(p => p.id !== id));
    if (currentProject?.id === id) {
      setCurrentProject(null);
      setView('home');
    }
  };

  const downloadAllProjects = async () => {
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();
    
    for (const project of projects) {
      const base64Data = project.enhancedImage.split(',')[1];
      zip.file(`studioflyr-${project.id}.png`, base64Data, { base64: true });
    }
    
    const content = await zip.generateAsync({ type: 'blob' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(content);
    link.download = `studioflyr-batch-${Date.now()}.zip`;
    link.click();
  };

  const downloadImage = () => {
    if (!currentProject) return;
    
    const activeImage = activeTab === 'environment' && currentProject.environments && selectedEnvIndex !== null
      ? currentProject.environments[selectedEnvIndex]
      : activeTab === 'tryOn' && currentProject.modelVariations && selectedModelVarIndex !== null
        ? currentProject.modelVariations[selectedModelVarIndex]
        : activeTab === 'tryOn' && currentProject.tryOnImage 
          ? currentProject.tryOnImage 
          : activeTab === 'noBg' && currentProject.noBgImage 
          ? currentProject.noBgImage 
          : currentProject.enhancedImage;

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.filter = `brightness(${filters.brightness}%) contrast(${filters.contrast}%) saturate(${filters.saturate}%) ${filters.sharpen > 0 ? `contrast(${100 + filters.sharpen}%) brightness(${100 + (filters.sharpen / 4)}%)` : ''}`;
        ctx.drawImage(img, 0, 0);
        const link = document.createElement('a');
        link.href = canvas.toDataURL('image/png');
        link.download = `studioflyr-${activeTab}-${currentProject.id}.png`;
        link.click();
      }
    };
    img.src = activeImage;
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-white selection:text-black">
      {/* Error Toast */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] w-full max-w-md px-4"
          >
            <div className="bg-red-500/10 backdrop-blur-xl border border-red-500/20 rounded-2xl p-4 flex items-center gap-4 shadow-2xl">
              <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-5 h-5 text-red-500" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold text-red-500 uppercase tracking-widest">AI Error</p>
                <p className="text-sm text-white/90 font-medium">{error.message}</p>
                {error.suggestion && (
                  <p className="text-[11px] text-white/50 mt-1 italic leading-tight">{error.suggestion}</p>
                )}
                {error.onRetry && (
                  <button 
                    disabled={cooldown > 0}
                    onClick={() => {
                      const retry = error.onRetry;
                      setError(null);
                      retry?.();
                    }}
                    className={cn(
                      "mt-2 text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5",
                      cooldown > 0 
                        ? "bg-white/5 text-white/30 cursor-not-allowed" 
                        : "bg-white/10 hover:bg-white/20 text-white"
                    )}
                  >
                    <RefreshCw className={cn("w-3 h-3", cooldown > 0 && "opacity-50")} />
                    {cooldown > 0 ? `Retry in ${cooldown}s` : "Retry Now"}
                  </button>
                )}
                {error.isQuota && (
                  <button 
                    onClick={() => {
                      const aistudio = (window as any).aistudio;
                      if (aistudio) aistudio.openSelectKey();
                    }}
                    className="mt-2 text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg bg-white text-black hover:bg-neutral-200 transition-all flex items-center gap-1.5 ml-2"
                  >
                    <Smartphone className="w-3 h-3" />
                    Switch API Key
                  </button>
                )}
              </div>
              <button 
                onClick={() => setError(null)}
                className="p-2 hover:bg-white/5 rounded-lg transition-colors"
              >
                <X className="w-4 h-4 text-white/40" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-black/50 backdrop-blur-xl border-b border-neutral-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
          <div 
            className="flex items-center gap-2 sm:gap-3 cursor-pointer group"
            onClick={() => setView('home')}
          >
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-white flex items-center justify-center group-hover:rotate-12 transition-transform duration-500">
              <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-black" />
            </div>
            <span className="text-lg sm:text-xl font-bold tracking-tighter uppercase">StudioFlyr</span>
            <ApiStatusBadge status={apiStatus} />
          </div>

          <nav className="hidden md:flex items-center gap-8">
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setView('home')}
              className={cn(
                "text-sm font-medium transition-colors",
                view === 'home' ? "text-white" : "text-neutral-500 hover:text-white"
              )}
            >
              Feed
            </motion.button>
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setView('showcase')}
              className={cn(
                "text-sm font-medium transition-colors",
                view === 'showcase' ? "text-white" : "text-neutral-500 hover:text-white"
              )}
            >
              Showcase
            </motion.button>
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setView('pricing')}
              className={cn(
                "text-sm font-medium transition-colors",
                view === 'pricing' ? "text-white" : "text-neutral-500 hover:text-white"
              )}
            >
              Pricing
            </motion.button>
          </nav>

          <div className="flex items-center gap-2 sm:gap-4">
            <AccountManager />
            {view === 'editor' && (
              <button 
                onClick={() => setView('home')}
                className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full bg-neutral-900 border border-neutral-800 text-xs sm:text-sm font-medium hover:bg-neutral-800 transition-all"
              >
                <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">New Project</span>
                <span className="sm:hidden">New</span>
              </button>
            )}
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center overflow-hidden">
              <img 
                src="https://picsum.photos/seed/user/100/100" 
                alt="User" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        </div>
      </header>

      <main className="pt-24 sm:pt-32 pb-12 sm:pb-20 px-4 sm:px-6 max-w-7xl mx-auto">
        <AnimatePresence mode="wait">
          {view === 'pricing' && (
            <motion.div
              key="pricing"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
            >
              <PricingSection />
            </motion.div>
          )}
          {view === 'showcase' && (
            <motion.div
              key="showcase"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
            >
              <ShowcaseSection />
            </motion.div>
          )}
          {view === 'home' && (
            <motion.div 
              key="home"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-16"
            >
              {/* Hero / Upload Section */}
              <section className="flex flex-col items-center text-center space-y-8 sm:space-y-12">
                <div className="space-y-4 max-w-2xl">
                  <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[9px] sm:text-[10px] uppercase tracking-[0.2em] font-bold text-white/50"
                  >
                    <Sparkles className="w-3 h-3" />
                    Powered by Gemini 3.1
                  </motion.div>
                  <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold tracking-tight leading-[0.9]">
                    Studio Quality <br />
                    <span className="text-neutral-500">In One Click.</span>
                  </h1>
                </div>

                {/* Template Selection */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 w-full max-w-5xl">
                  {templates.map((t) => {
                    const isSelected = selectedTemplateIds.includes(t.id);
                    return (
                      <button
                        key={t.id}
                        onClick={() => {
                          setSelectedTemplateIds(prev => {
                            if (prev.includes(t.id)) {
                              if (prev.length === 1) return prev; // Keep at least one
                              return prev.filter(id => id !== t.id);
                            }
                            return [...prev, t.id];
                          });
                        }}
                        className={cn(
                          "flex flex-col items-center gap-2 sm:gap-3 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border transition-all text-center group relative overflow-hidden",
                          isSelected 
                            ? "bg-white text-black border-white shadow-[0_0_40px_rgba(255,255,255,0.1)]" 
                            : "bg-neutral-900/50 text-neutral-400 border-neutral-800 hover:border-neutral-700 hover:bg-neutral-900"
                        )}
                      >
                        {isSelected && (
                          <motion.div 
                            layoutId={t.id + "-active-dot"}
                            className="absolute top-2 right-2 w-2 h-2 rounded-full bg-black z-20"
                          />
                        )}
                        
                        {isSelected && (
                          <motion.div 
                            layoutId="active-bg"
                            className="absolute inset-0 bg-white"
                            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                          />
                        )}
                        
                        <div className={cn(
                          "relative z-10 w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center transition-colors duration-500",
                          isSelected ? "bg-black text-white" : "bg-neutral-800 text-neutral-400 group-hover:bg-neutral-700"
                        )}>
                          {t.icon}
                        </div>
                        
                        <div className="relative z-10 space-y-0.5 sm:space-y-1">
                          <p className="font-bold text-xs sm:text-sm tracking-tight">{t.name}</p>
                          <p className={cn(
                            "text-[9px] sm:text-[10px] leading-tight opacity-60",
                            isSelected ? "text-black" : "text-neutral-500"
                          )}>
                            {t.description}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Batch Settings */}
                <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 py-5 px-8 bg-white/[0.02] border border-white/5 rounded-3xl w-full max-w-4xl backdrop-blur-md">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-white/5">
                      <Settings2 className="w-4 h-4 text-white/50" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[9px] uppercase tracking-[0.2em] font-bold text-white/30 leading-none">Automation</span>
                      <span className="text-xs font-bold text-white/80">Jewelry Batch Flow</span>
                    </div>
                  </div>
                  
                  <div className="h-8 w-px bg-white/5 hidden sm:block" />

                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className={cn(
                      "w-5 h-5 rounded-md border flex items-center justify-center transition-all",
                      batchSettings.removeBg ? "bg-white border-white" : "border-white/10 bg-black/50 group-hover:border-white/30"
                    )}>
                      <input 
                        type="checkbox" 
                        checked={batchSettings.removeBg}
                        onChange={(e) => setBatchSettings(prev => ({ ...prev, removeBg: e.target.checked }))}
                        className="hidden"
                      />
                      {batchSettings.removeBg && <Check className="w-3.5 h-3.5 text-black stroke-[3]" />}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-white group-hover:text-white transition-colors">Clear Cuts</span>
                      <span className="text-[9px] text-white/40 leading-tight">Auto BG Removal</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className={cn(
                      "w-5 h-5 rounded-md border flex items-center justify-center transition-all",
                      batchSettings.autoEnv ? "bg-white border-white" : "border-white/10 bg-black/50 group-hover:border-white/30"
                    )}>
                      <input 
                        type="checkbox" 
                        checked={batchSettings.autoEnv}
                        onChange={(e) => setBatchSettings(prev => ({ ...prev, autoEnv: e.target.checked }))}
                        className="hidden"
                      />
                      {batchSettings.autoEnv && <Check className="w-3.5 h-3.5 text-black stroke-[3]" />}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-white group-hover:text-white transition-colors">Smart Scene</span>
                      <span className="text-[9px] text-white/40 leading-tight">Auto Environment</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className={cn(
                      "w-5 h-5 rounded-md border flex items-center justify-center transition-all",
                      batchSettings.autoTryOn ? "bg-white border-white" : "border-white/10 bg-black/50 group-hover:border-white/30"
                    )}>
                      <input 
                        type="checkbox" 
                        checked={batchSettings.autoTryOn}
                        onChange={(e) => setBatchSettings(prev => ({ ...prev, autoTryOn: e.target.checked }))}
                        className="hidden"
                      />
                      {batchSettings.autoTryOn && <Check className="w-3.5 h-3.5 text-black stroke-[3]" />}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-white group-hover:text-white transition-colors">Model AI</span>
                      <span className="text-[9px] text-white/40 leading-tight">Auto Jewelry Model</span>
                    </div>
                  </label>
                </div>

                {batchComplete && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full max-w-2xl p-4 bg-green-500/10 border border-green-500/20 rounded-2xl flex items-center justify-center gap-3"
                  >
                    <Sparkles className="w-4 h-4 text-green-500" />
                    <span className="text-sm font-medium text-green-500">Batch processing complete! All images added to your feed.</span>
                  </motion.div>
                )}

                {isBatchProcessing && (
                  <div className="w-full max-w-2xl p-6 bg-neutral-900 border border-neutral-800 rounded-3xl space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Loader2 className="w-5 h-5 text-white animate-spin" />
                        <span className="text-sm font-medium">Processing Batch...</span>
                      </div>
                      <span className="text-xs font-bold text-neutral-500">
                        {batchProgress.current} / {batchProgress.total}
                      </span>
                    </div>
                    <div className="w-full h-2 bg-neutral-800 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }}
                        className="h-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)]"
                      />
                    </div>
                  </div>
                )}

                <UploadZone onUpload={handleBatchUpload} isProcessing={isProcessing || isBatchProcessing} />
                
                <div className="bg-neutral-900/50 border border-neutral-800 rounded-3xl p-8 space-y-6 w-full max-w-2xl mx-auto mt-8">
                  <h3 className="text-lg font-medium">Generate Background Image</h3>
                  <div className="space-y-4">
                    <input 
                      type="text" 
                      value={imagePrompt}
                      onChange={(e) => setImagePrompt(e.target.value)}
                      placeholder="e.g., A futuristic office space"
                      className="w-full bg-neutral-800 p-3 rounded-xl text-sm"
                    />
                    <button 
                      onClick={generateImageArt}
                      disabled={isGeneratingImage}
                      className="w-full h-12 bg-white text-black rounded-xl font-bold uppercase text-xs flex items-center justify-center gap-2 hover:bg-neutral-200 transition-colors"
                    >
                      {isGeneratingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                      Generate
                    </button>
                    {generatedImage && (
                      <div className="mt-4">
                        <img src={generatedImage} alt="Generated" className="w-full rounded-xl" referrerPolicy="no-referrer" />
                        <button 
                          onClick={() => {
                            if (generatedImage) {
                              handleBatchUpload([base64ToFile(generatedImage, 'generated-image.jpg')]);
                            }
                          }}
                          className="mt-2 w-full text-xs underline"
                        >
                          Use this image
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </section>

              {/* Projects Feed */}
              {projects.length > 0 && (
                <section className="space-y-6 sm:space-y-8">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-neutral-900 pb-6 gap-4">
                    <div className="flex items-center gap-3">
                      <History className="w-5 h-5 text-neutral-500" />
                      <h2 className="text-lg sm:text-xl font-medium tracking-tight">Recent Projects</h2>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <button 
                        onClick={downloadAllProjects}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-white text-black hover:bg-neutral-200 transition-all text-[10px] font-bold uppercase tracking-widest"
                      >
                        <Download className="w-4 h-4" />
                        Download All
                      </button>
                      <button 
                        onClick={() => projects.length > 0 && deleteProject(projects[0].id)}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-all text-[10px] font-bold uppercase tracking-widest"
                        title="Delete most recent project"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete Latest
                      </button>
                      <button className="p-2 rounded-lg bg-neutral-900 text-white">
                        <LayoutGrid className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 mb-6">
                    <select 
                      value={projectCategory}
                      onChange={(e) => setProjectCategory(e.target.value)}
                      className="bg-neutral-900 border border-neutral-800 text-white text-sm rounded-lg p-2 focus:ring-2 focus:ring-neutral-700"
                    >
                      {['All', ...Array.from(new Set(projects.map(p => p.category || 'Uncategorized')))].map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {projects.filter(p => projectCategory === 'All' || (p.category || 'Uncategorized') === projectCategory).map(project => {
                      const template = templates.find(t => t.id === project.templateId);
                      return (
                        <ProjectCard 
                          key={project.id}
                          {...project}
                          category={project.category}
                          templateName={project.templateName || template?.name}
                          onDelete={deleteProject}
                          onClick={() => {
                            setCurrentProject(project);
                            setView('editor');
                          }}
                        />
                      );
                    })}
                  </div>
                </section>
              )}
            </motion.div>
          )}
          {view === 'editor' && (
            <motion.div 
              key="editor"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start"
            >
              {/* Editor View */}
              <div className="lg:col-span-8 space-y-6 sm:space-y-8">
                <div className="flex items-center justify-between">
                  <button 
                    onClick={() => setView('home')}
                    className="flex items-center gap-2 text-neutral-500 hover:text-white transition-colors group"
                  >
                    <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                    <span className="text-sm font-medium">Back to Feed</span>
                  </button>
                  
                  <div className="flex items-center gap-4">
                    <input 
                      type="text" 
                      value={currentProject?.category || 'Uncategorized'}
                      onChange={(e) => {
                        if (currentProject) {
                           setProjects(prev => prev.map(p => p.id === currentProject.id ? {...p, category: e.target.value} : p));
                           setCurrentProject({...currentProject, category: e.target.value});
                        }
                      }}
                      className="bg-neutral-900 border border-neutral-800 text-white text-sm rounded-lg p-2 focus:ring-2 focus:ring-neutral-700 w-32"
                      placeholder="Category"
                    />
                    <button 
                      onClick={() => currentProject && deleteProject(currentProject.id)}
                      className="p-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-all"
                      title="Delete this project"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-neutral-900 border border-neutral-800">
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-[10px] uppercase tracking-widest font-bold text-neutral-400">AI Ready</span>
                    </div>
                  </div>
                </div>

                <div className="relative">
                  {isProcessing ? (
                    <ProcessingOverlay />
                  ) : currentProject ? (
                    <BeforeAfterSlider 
                      beforeImage={currentProject.originalImage}
                      afterImage={
                        activeTab === 'environment' && currentProject.environments && selectedEnvIndex !== null
                          ? currentProject.environments[selectedEnvIndex]
                          : activeTab === 'tryOn' && currentProject.modelVariations && selectedModelVarIndex !== null
                            ? currentProject.modelVariations[selectedModelVarIndex]
                            : activeTab === 'tryOn' && currentProject.tryOnImage 
                              ? currentProject.tryOnImage 
                              : activeTab === 'noBg' && currentProject.noBgImage 
                              ? currentProject.noBgImage 
                              : currentProject.enhancedImage
                      }
                      filters={filters}
                    />
                  ) : null}
                  
                  {(isRemovingBg || isTryingOn || isGeneratingEnv) && (
                    <div className="absolute inset-0 z-30 bg-black/40 backdrop-blur-sm flex items-center justify-center rounded-2xl">
                      <div className="flex flex-col items-center gap-3">
                        <RefreshCw className="w-8 h-8 text-white animate-spin" />
                        <span className="text-xs font-bold uppercase tracking-widest text-white">
                          {retryStatus || (isRemovingBg ? "Removing Background..." : isTryingOn ? (variationProgress ? `Generating Variation ${variationProgress.current}/${variationProgress.total}...` : "Generating Model Shot...") : "Generating Environment...")}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 sm:gap-6 pt-4">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <button 
                      onClick={downloadImage}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl bg-white text-black font-bold hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_0_30px_rgba(255,255,255,0.2)] text-sm sm:text-base"
                    >
                      <Download className="w-4 h-4 sm:w-5 sm:h-5" />
                      Download Result
                    </button>
                    <button className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 transition-all">
                      <Share2 className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2 text-neutral-500">
                    <Info className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="text-[10px] sm:text-xs">
                      {activeTab === 'environment' ? "Showing AI Generated Environment" : activeTab === 'tryOn' ? "Showing AI Model Try-On" : activeTab === 'noBg' ? "Showing background-removed version" : "Slider shows comparison between original and AI enhanced version"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Sidebar / Controls */}
              <div className="lg:col-span-4 space-y-8">
                {/* View Selector Tabs */}
                <div className="flex p-1 bg-neutral-900 border border-neutral-800 rounded-2xl overflow-x-auto scrollbar-hide">
                  <button 
                    onClick={() => setActiveTab('enhanced')}
                    className={cn(
                      "flex-1 min-w-[80px] py-2 text-[9px] sm:text-[10px] uppercase tracking-widest font-bold rounded-xl transition-all",
                      activeTab === 'enhanced' ? "bg-neutral-800 text-white" : "text-neutral-500 hover:text-neutral-300"
                    )}
                  >
                    Enhanced
                  </button>
                  <button 
                    onClick={() => currentProject?.noBgImage && setActiveTab('noBg')}
                    disabled={!currentProject?.noBgImage}
                    className={cn(
                      "flex-1 min-w-[80px] py-2 text-[9px] sm:text-[10px] uppercase tracking-widest font-bold rounded-xl transition-all",
                      activeTab === 'noBg' ? "bg-neutral-800 text-white" : "text-neutral-500 hover:text-neutral-300",
                      !currentProject?.noBgImage && "opacity-30 cursor-not-allowed"
                    )}
                  >
                    No BG
                  </button>
                  <button 
                    onClick={() => currentProject?.tryOnImage && setActiveTab('tryOn')}
                    disabled={!currentProject?.tryOnImage}
                    className={cn(
                      "flex-1 min-w-[80px] py-2 text-[9px] sm:text-[10px] uppercase tracking-widest font-bold rounded-xl transition-all",
                      activeTab === 'tryOn' ? "bg-neutral-800 text-white" : "text-neutral-500 hover:text-neutral-300",
                      !currentProject?.tryOnImage && "opacity-30 cursor-not-allowed"
                    )}
                  >
                    Model
                  </button>
                  <button 
                    onClick={() => currentProject?.environments?.length && setActiveTab('environment')}
                    disabled={!currentProject?.environments?.length}
                    className={cn(
                      "flex-1 min-w-[80px] py-2 text-[9px] sm:text-[10px] uppercase tracking-widest font-bold rounded-xl transition-all",
                      activeTab === 'environment' ? "bg-neutral-800 text-white" : "text-neutral-500 hover:text-neutral-300",
                      !currentProject?.environments?.length && "opacity-30 cursor-not-allowed"
                    )}
                  >
                    Scene
                  </button>
                </div>

                {/* AI Environment Generation */}
                <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl sm:rounded-3xl p-6 sm:p-8 space-y-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <h3 className="text-lg font-medium">AI Environments</h3>
                      <p className="text-xs text-neutral-500">Generate a custom scene for your product.</p>
                    </div>
                    <button 
                      onClick={generateSuggestions}
                      disabled={isGeneratingEnv}
                      className="w-full sm:w-auto px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-[10px] uppercase tracking-widest font-bold hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                    >
                      <Sparkles className="w-3 h-3" />
                      Auto-Suggest
                    </button>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-neutral-500">Aspect Ratio</label>
                    <div className="flex gap-2">
                      {aspectRatioOptions.map(opt => {
                        const isSelected = selectedAspectRatios.includes(opt.id as any);
                        return (
                          <button
                            key={opt.id}
                            onClick={() => {
                              setSelectedAspectRatios(prev => {
                                if (prev.includes(opt.id as any)) {
                                  if (prev.length === 1) return prev;
                                  return prev.filter(a => a !== opt.id);
                                }
                                return [...prev, opt.id as any];
                              });
                            }}
                            className={cn(
                              "flex-1 py-2 rounded-xl border text-[10px] font-bold transition-all flex items-center justify-center gap-2",
                              isSelected ? "bg-white text-black border-white" : "bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700"
                            )}
                          >
                            {opt.icon}
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="relative">
                      <input 
                        type="text"
                        value={envPrompt}
                        onChange={(e) => setEnvPrompt(e.target.value)}
                        placeholder="e.g. on a marble table with sunlight..."
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-neutral-600 transition-all pr-12"
                      />
                      <button 
                        onClick={() => generateEnvironment()}
                        disabled={isGeneratingEnv || !envPrompt.trim()}
                        className="absolute right-2 top-2 p-2 rounded-lg bg-white text-black hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>

                    {currentProject?.environments && currentProject.environments.length > 0 && (
                      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                        {currentProject.environments.map((env, idx) => (
                          <button
                            key={idx}
                            onClick={() => {
                              setSelectedEnvIndex(idx);
                              setActiveTab('environment');
                            }}
                            className={cn(
                              "w-16 h-16 rounded-lg border-2 flex-shrink-0 overflow-hidden transition-all",
                              activeTab === 'environment' && selectedEnvIndex === idx ? "border-white" : "border-transparent hover:border-neutral-700"
                            )}
                          >
                            <img src={env} alt={`Env ${idx}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    {currentTemplate.categoryPresets && currentTemplate.categoryPresets.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] uppercase tracking-widest font-bold text-neutral-500">Recommended for {currentTemplate.name}</label>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {currentTemplate.categoryPresets.map((preset) => (
                            <button
                              key={preset.name}
                              onClick={() => generateEnvironment(preset.prompt)}
                              disabled={isGeneratingEnv}
                              className="group relative h-20 rounded-xl overflow-hidden border border-neutral-800 hover:border-neutral-600 transition-all"
                            >
                              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent z-10" />
                              <div className="absolute inset-0 bg-neutral-900 group-hover:scale-110 transition-transform duration-500" />
                              <div className="absolute bottom-2 left-2 right-2 z-20">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-white truncate">{preset.name}</p>
                                <p className="text-[8px] text-neutral-500 uppercase tracking-tighter">AI Suggestion</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <label className="text-[10px] uppercase tracking-widest font-bold text-neutral-500">Preset Gallery</label>
                    </div>

                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                      {['All', 'Luxury', 'Minimalist', 'Nature', 'Urban', 'Tech', 'Events'].map((cat) => (
                        <button
                          key={cat}
                          onClick={() => setSelectedEnvCategory(cat)}
                          className={cn(
                            "px-3 py-1 rounded-full text-[10px] font-bold whitespace-nowrap transition-all border",
                            selectedEnvCategory === cat 
                              ? "bg-white text-black border-white" 
                              : "bg-neutral-950 border-neutral-800 text-neutral-500 hover:border-neutral-700"
                          )}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {currentTemplate.id === 'home' && (
                        <button
                          onClick={() => setShowInteriorCamera(true)}
                          className="col-span-2 flex items-center justify-center gap-2 h-12 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-neutral-600 transition-all font-bold text-xs uppercase"
                        >
                          <Camera className="w-4 h-4" />
                          Take room photo
                        </button>
                      )}
                      <EnvironmentGallery 
                        presets={presetEnvironments.map(p => ({ ...p, image: ''}))}
                        selectedCategory={selectedEnvCategory}
                        onSelect={generateEnvironment}
                        isGenerating={isGeneratingEnv}
                      />
                    </div>
                  </div>
                </div>

                {showInteriorCamera && (
                  <CameraModal 
                    onCapture={(file) => handleBatchUpload([file])} 
                    onClose={() => setShowInteriorCamera(false)} 
                  />
                )}

                <div className="bg-neutral-900/50 border border-neutral-800 rounded-3xl p-8 space-y-6">
                  <h3 className="text-lg font-medium">Image Generation</h3>
                  <div className="space-y-4">
                    <input 
                      type="text" 
                      value={imagePrompt}
                      onChange={(e) => setImagePrompt(e.target.value)}
                      placeholder="e.g., A futuristic office space"
                      className="w-full bg-neutral-800 p-3 rounded-xl text-sm"
                    />
                    <button 
                      onClick={generateImageArt}
                      disabled={isGeneratingImage}
                      className="w-full h-12 bg-white text-black rounded-xl font-bold uppercase text-xs flex items-center justify-center gap-2 hover:bg-neutral-200 transition-colors"
                    >
                      {isGeneratingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                      Generate
                    </button>
                    {generatedImage && (
                      <div className="mt-4">
                        <img src={generatedImage} alt="Generated" className="w-full rounded-xl" referrerPolicy="no-referrer" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Watermark Settings */}
                <div className="bg-neutral-900/50 border border-neutral-800 rounded-3xl p-8 space-y-6">
                  <h3 className="text-lg font-medium">Watermark Settings</h3>
                  <div className="space-y-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={!watermarkOptions.disabled} onChange={(e) => setWatermarkOptions(prev => ({ ...prev, disabled: !e.target.checked }))} />
                      <span className="text-sm">Enable Watermark</span>
                    </label>
                    <input type="text" value={watermarkOptions.text} onChange={(e) => setWatermarkOptions(prev => ({ ...prev, text: e.target.value }))} className="w-full bg-neutral-800 p-2 rounded-lg text-sm" placeholder="Watermark Text" />
                    
                    <div className="grid grid-cols-2 gap-2">
                       <select value={watermarkOptions.placement} onChange={(e) => setWatermarkOptions(prev => ({ ...prev, placement: e.target.value as any }))} className="bg-neutral-800 p-2 rounded-lg text-sm">
                         {['center', 'top-left', 'top-right', 'bottom-left', 'bottom-right'].map(p => <option key={p} value={p}>{p}</option>)}
                       </select>
                       <input type="number" min="1" max="20" value={watermarkOptions.size} onChange={(e) => setWatermarkOptions(prev => ({ ...prev, size: parseInt(e.target.value) }))} className="bg-neutral-800 p-2 rounded-lg text-sm" placeholder="Size" />
                    </div>
                     <div className="grid grid-cols-2 gap-2">
                       <select value={watermarkOptions.fontWeight} onChange={(e) => setWatermarkOptions(prev => ({ ...prev, fontWeight: e.target.value as any }))} className="bg-neutral-800 p-2 rounded-lg text-sm">
                         <option value="normal">Normal</option>
                         <option value="bold">Bold</option>
                       </select>
                        <select value={watermarkOptions.fontStyle} onChange={(e) => setWatermarkOptions(prev => ({ ...prev, fontStyle: e.target.value as any }))} className="bg-neutral-800 p-2 rounded-lg text-sm">
                         <option value="normal">Normal</option>
                         <option value="italic">Italic</option>
                       </select>
                    </div>
                    <input type="text" value={watermarkOptions.fontFamily} onChange={(e) => setWatermarkOptions(prev => ({ ...prev, fontFamily: e.target.value }))} className="w-full bg-neutral-800 p-2 rounded-lg text-sm" placeholder="Font Family (e.g., Arial, sans-serif)" />
                  </div>
                </div>

                {/* Model Try-On Controls */}
                <div className="bg-neutral-900/50 border border-neutral-800 rounded-3xl p-8 space-y-6">
                  <div className="space-y-1">
                    <h3 className="text-lg font-medium">Model Customization</h3>
                    <p className="text-xs text-neutral-500">Customize the model's appearance.</p>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-widest font-bold text-neutral-500">Skin Tone</label>
                        <select 
                          value={modelSkinTone}
                          onChange={(e) => setModelSkinTone(e.target.value)}
                          className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-neutral-600 transition-all text-neutral-300"
                        >
                          {skinToneOptions.map(opt => (
                            <option key={opt.id} value={opt.id}>{opt.label}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-widest font-bold text-neutral-500">Hair Color</label>
                        <select 
                          value={modelHairColor}
                          onChange={(e) => setModelHairColor(e.target.value)}
                          className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-neutral-600 transition-all text-neutral-300"
                        >
                          {hairColorOptions.map(opt => (
                            <option key={opt.id} value={opt.id}>{opt.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest font-bold text-neutral-500">Clothing Style</label>
                      <select 
                        value={modelClothingStyle}
                        onChange={(e) => setModelClothingStyle(e.target.value)}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-neutral-600 transition-all text-neutral-300"
                      >
                        {clothingStyleOptions.map(opt => (
                          <option key={opt.id} value={opt.id}>{opt.label}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest font-bold text-neutral-500">Gender</label>
                      <div className="flex gap-2">
                        {genderOptions.map(opt => (
                          <button
                            key={opt.id}
                            onClick={() => setModelGender(opt.id)}
                            className={cn(
                              "flex-1 py-2 rounded-xl border text-[10px] font-bold transition-all",
                              modelGender === opt.id ? "bg-white text-black border-white" : "bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700"
                            )}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest font-bold text-neutral-500">Ethnicity</label>
                      <select 
                        value={modelEthnicity}
                        onChange={(e) => setModelEthnicity(e.target.value)}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-neutral-600 transition-all text-neutral-300"
                      >
                        {ethnicityOptions.map(opt => (
                          <option key={opt.id} value={opt.id}>{opt.label}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest font-bold text-neutral-500">Pose</label>
                      <div className="grid grid-cols-2 gap-2">
                        {poseOptions.map(opt => (
                          <button
                            key={opt.id}
                            onClick={() => setModelPose(opt.id)}
                            className={cn(
                              "py-2 rounded-xl border text-[10px] font-bold transition-all",
                              modelPose === opt.id ? "bg-white text-black border-white" : "bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700"
                            )}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest font-bold text-neutral-500">Age Range</label>
                      <div className="flex gap-2">
                        {ageOptions.map(opt => (
                          <button
                            key={opt.id}
                            onClick={() => setModelAge(opt.id)}
                            className={cn(
                              "flex-1 py-2 rounded-xl border text-[10px] font-bold transition-all",
                              modelAge === opt.id ? "bg-white text-black border-white" : "bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700"
                            )}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest font-bold text-neutral-500">Aesthetic Vibe</label>
                      <div className="grid grid-cols-2 gap-2">
                        {vibeOptions.map(opt => (
                          <button
                            key={opt.id}
                            onClick={() => setModelVibe(opt.id)}
                            className={cn(
                              "py-2 rounded-xl border text-[10px] font-bold transition-all",
                              modelVibe === opt.id ? "bg-white text-black border-white" : "bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700"
                            )}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] uppercase tracking-widest font-bold text-neutral-500">Custom Details</label>
                        <span className="text-[8px] text-neutral-600 uppercase font-bold">Optional</span>
                      </div>
                      <textarea 
                        value={modelCustomPrompt}
                        onChange={(e) => setModelCustomPrompt(e.target.value)}
                        placeholder="e.g. model with blue eyes, wearing a black dress..."
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-neutral-600 transition-all text-neutral-300 resize-none h-20"
                      />
                    </div>

                    {currentProject?.modelVariations && currentProject.modelVariations.length > 0 && (
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-widest font-bold text-neutral-500">Model Variations</label>
                        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                          {currentProject.modelVariations.map((img, idx) => (
                            <button
                              key={idx}
                              onClick={() => {
                                setSelectedModelVarIndex(idx);
                                setActiveTab('tryOn');
                              }}
                              className={cn(
                                "w-16 h-16 rounded-lg border-2 flex-shrink-0 overflow-hidden transition-all",
                                activeTab === 'tryOn' && selectedModelVarIndex === idx ? "border-white" : "border-transparent hover:border-neutral-700"
                              )}
                            >
                              <img src={img} alt={`Variation ${idx}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                    <div className="space-y-1">
                      <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold">Quick Actions</p>
                    </div>
                    <div className="flex gap-3">
                    <button 
                      onClick={tryOnModel}
                      disabled={isTryingOn || !currentProject?.enhancedImage}
                      className={cn(
                        "flex-1 py-4 rounded-2xl bg-white text-black font-bold hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2",
                        (isTryingOn || !currentProject?.enhancedImage) && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <Sparkles className={cn("w-4 h-4", isTryingOn && "animate-spin")} />
                      {currentProject?.tryOnImage ? "Re-generate" : "Generate Shot"}
                    </button>
                    <button 
                      onClick={generateVideoHandler}
                      disabled={isGeneratingVideo || !currentProject}
                      className={cn(
                        "flex-1 py-4 rounded-2xl bg-white text-black font-bold hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2",
                        (isGeneratingVideo || !currentProject) && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <Video className={cn("w-4 h-4", isGeneratingVideo && "animate-spin")} />
                      <span>{isGeneratingVideo ? "Generating..." : "Generate Video"}</span>
                    </button>
                    <button 
                      onClick={generateModelVariations}
                      disabled={isTryingOn}
                      className={cn(
                        "flex-1 py-4 rounded-2xl bg-neutral-800 text-white font-bold hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 border border-neutral-700",
                        isTryingOn && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <LayoutGrid className="w-4 h-4" />
                      <span>Variations</span>
                      <span className="text-[8px] bg-white/10 px-1.5 py-0.5 rounded-md ml-1">x3</span>
                    </button>
                  </div>
                </div>

                {/* Background Removal Controls */}
                <div className="bg-neutral-900/50 border border-neutral-800 rounded-3xl p-8 space-y-6">
                  <div className="space-y-1">
                    <h3 className="text-lg font-medium">Background Removal</h3>
                    <p className="text-xs text-neutral-500">Isolate your product with one click.</p>
                  </div>

                  <div className="grid grid-cols-5 gap-2">
                    {bgOptions.map((opt) => {
                      const isSuggested = currentTemplate.suggestedBgs.includes(opt.id);
                      return (
                        <button
                          key={opt.id}
                          onClick={() => removeBackground(opt.id)}
                          disabled={isRemovingBg}
                          className={cn(
                            "aspect-square rounded-xl border-2 transition-all flex items-center justify-center relative group",
                            bgColor === opt.id ? "border-white" : "border-transparent hover:border-neutral-700",
                            !isSuggested && "opacity-60"
                          )}
                          title={opt.label + (isSuggested ? " (Suggested)" : "")}
                        >
                          {opt.id === 'transparent' ? (
                            <div className="w-full h-full rounded-lg bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] bg-neutral-800" />
                          ) : (
                            <div 
                              className="w-full h-full rounded-lg shadow-inner" 
                              style={{ backgroundColor: opt.color }} 
                            />
                          )}
                          {bgColor === opt.id && (
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center">
                              <div className="w-1.5 h-1.5 bg-black rounded-full" />
                            </div>
                          )}
                          {isSuggested && bgColor !== opt.id && (
                            <div className="absolute -top-1 -right-1 w-2 h-2 bg-white/30 rounded-full" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <button 
                    onClick={() => removeBackground(bgColor)}
                    disabled={isRemovingBg}
                    className="w-full py-4 rounded-2xl bg-neutral-800 border border-neutral-700 text-sm font-medium hover:bg-neutral-700 transition-all flex items-center justify-center gap-2"
                  >
                    <Sparkles className={cn("w-4 h-4", isRemovingBg && "animate-spin")} />
                    {currentProject?.noBgImage ? "Update Background" : "Remove Background"}
                  </button>
                </div>

                {/* Image Filters Controls */}
                <div className="bg-neutral-900/50 border border-neutral-800 rounded-3xl p-8 space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <h3 className="text-lg font-medium">Image Filters</h3>
                      <p className="text-xs text-neutral-500">Fine-tune the final look.</p>
                    </div>
                    <button 
                      onClick={() => setFilters({ brightness: 100, contrast: 100, saturate: 100, sharpen: 0 })}
                      className="p-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 transition-all text-neutral-400 hover:text-white"
                      title="Reset Filters"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] uppercase tracking-widest font-bold text-neutral-500" title="Adjusts the overall lightness or darkness of the image">Brightness</label>
                        <span className="text-[10px] font-mono text-neutral-400">{filters.brightness}%</span>
                      </div>
                      <input 
                        type="range" 
                        min="50" 
                        max="150" 
                        value={filters.brightness} 
                        onChange={(e) => setFilters(prev => ({ ...prev, brightness: parseInt(e.target.value) }))}
                        className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-white"
                      />
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] uppercase tracking-widest font-bold text-neutral-500" title="Adjusts the separation between dark and light areas">Contrast</label>
                        <span className="text-[10px] font-mono text-neutral-400">{filters.contrast}%</span>
                      </div>
                      <input 
                        type="range" 
                        min="50" 
                        max="150" 
                        value={filters.contrast} 
                        onChange={(e) => setFilters(prev => ({ ...prev, contrast: parseInt(e.target.value) }))}
                        className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-white"
                      />
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] uppercase tracking-widest font-bold text-neutral-500" title="Adjusts the intensity of colors">Saturation</label>
                        <span className="text-[10px] font-mono text-neutral-400">{filters.saturate}%</span>
                      </div>
                      <input 
                        type="range" 
                        min="0" 
                        max="200" 
                        value={filters.saturate} 
                        onChange={(e) => setFilters(prev => ({ ...prev, saturate: parseInt(e.target.value) }))}
                        className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-white"
                      />
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] uppercase tracking-widest font-bold text-neutral-500" title="Enhances the fine details of the image">Sharpen</label>
                        <span className="text-[10px] font-mono text-neutral-400">{filters.sharpen}%</span>
                      </div>
                      <input 
                        type="range" 
                        min="0" 
                        max="100" 
                        value={filters.sharpen} 
                        onChange={(e) => setFilters(prev => ({ ...prev, sharpen: parseInt(e.target.value) }))}
                        className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-white"
                      />
                    </div>

                    <div className="space-y-6 mt-8 pt-8 border-t border-neutral-800">
                      <h3 className="text-lg font-medium">Watermark</h3>
                      
                      <div className="space-y-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={!watermarkOptions.disabled} onChange={(e) => setWatermarkOptions(prev => ({...prev, disabled: !e.target.checked}))} className="accent-white" />
                          <span className="text-sm">Enable Watermark</span>
                        </label>
                        
                        {!watermarkOptions.disabled && (
                          <>
                            <label className="block text-sm">
                              <span className="text-[10px] uppercase tracking-widest font-bold text-neutral-500">Text</span>
                              <input type="text" value={watermarkOptions.text} onChange={(e) => setWatermarkOptions(prev => ({...prev, text: e.target.value}))} className="w-full bg-neutral-800 p-2 rounded text-sm mt-1" />
                            </label>
                            
                            <label className="block text-sm">
                              <span className="text-[10px] uppercase tracking-widest font-bold text-neutral-500">Placement</span>
                              <select value={watermarkOptions.placement} onChange={(e) => setWatermarkOptions(prev => ({...prev, placement: e.target.value as any}))} className="w-full bg-neutral-800 p-2 rounded text-sm mt-1">
                                <option value="center">Center</option>
                                <option value="top-left">Top Left</option>
                                <option value="top-right">Top Right</option>
                                <option value="bottom-left">Bottom Left</option>
                                <option value="bottom-right">Bottom Right</option>
                              </select>
                            </label>
                            
                            <label className="block text-sm">
                              <span className="text-[10px] uppercase tracking-widest font-bold text-neutral-500">Opacity: {watermarkOptions.opacity}%</span>
                              <input type="range" min="0" max="100" value={watermarkOptions.opacity} onChange={(e) => setWatermarkOptions(prev => ({...prev, opacity: parseInt(e.target.value)}))} className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-white mt-2" />
                            </label>
                            
                            <label className="block text-sm">
                              <span className="text-[10px] uppercase tracking-widest font-bold text-neutral-500">Size: {watermarkOptions.size}%</span>
                              <input type="range" min="1" max="20" value={watermarkOptions.size} onChange={(e) => setWatermarkOptions(prev => ({...prev, size: parseInt(e.target.value)}))} className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-white mt-2" />
                            </label>

                            <label className="block text-sm">
                              <span className="text-[10px] uppercase tracking-widest font-bold text-neutral-500">Font Weight</span>
                              <select value={watermarkOptions.fontWeight} onChange={(e) => setWatermarkOptions(prev => ({...prev, fontWeight: e.target.value as any}))} className="w-full bg-neutral-800 p-2 rounded text-sm mt-1">
                                <option value="normal">Normal</option>
                                <option value="bold">Bold</option>
                              </select>
                            </label>

                            <label className="block text-sm">
                              <span className="text-[10px] uppercase tracking-widest font-bold text-neutral-500">Font Family</span>
                              <select value={watermarkOptions.fontFamily} onChange={(e) => setWatermarkOptions(prev => ({...prev, fontFamily: e.target.value}))} className="w-full bg-neutral-800 p-2 rounded text-sm mt-1">
                                <option value="Arial">Arial</option>
                                <option value="Times New Roman">Times New Roman</option>
                                <option value="Courier New">Courier New</option>
                                <option value="Georgia">Georgia</option>
                              </select>
                            </label>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-neutral-900/50 border border-neutral-800 rounded-3xl p-8 space-y-8">
                  <div className="space-y-2">
                    <h3 className="text-lg font-medium">Enhancement Details</h3>
                    <p className="text-sm text-neutral-500 leading-relaxed">
                      Our AI has optimized the lighting, removed minor imperfections, and balanced the color profile for a professional studio look.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-2xl bg-neutral-800/50 border border-neutral-700">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-neutral-700 flex items-center justify-center">
                          <Sparkles className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-sm font-medium">Studio Lighting</span>
                      </div>
                      <span className="text-[10px] text-green-500 font-bold uppercase tracking-widest">Applied</span>
                    </div>
                    <div className="flex items-center justify-between p-4 rounded-2xl bg-neutral-800/50 border border-neutral-700">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-neutral-700 flex items-center justify-center">
                          <RefreshCw className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-sm font-medium">Clarity Boost</span>
                      </div>
                      <span className="text-[10px] text-green-500 font-bold uppercase tracking-widest">Applied</span>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-neutral-800">
                    <button 
                      onClick={() => currentProject && enhanceImage(currentProject.originalImage)} 
                      disabled={isProcessing}
                      className="w-full py-4 rounded-2xl border border-neutral-800 text-sm font-medium hover:bg-neutral-800 transition-all flex items-center justify-center gap-2"
                    >
                      <RefreshCw className={cn("w-4 h-4", isProcessing && "animate-spin")} />
                      Re-generate AI Result
                    </button>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-neutral-900 to-black border border-neutral-800 rounded-3xl p-8 space-y-4">
                  <h4 className="text-sm font-bold uppercase tracking-widest text-neutral-500">Pro Tip</h4>
                  <p className="text-sm text-neutral-400 leading-relaxed">
                    For best results, ensure your product is well-centered and the background is relatively clean. The AI works best with clear, high-resolution inputs.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-900 py-8 sm:py-12 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 sm:gap-8">
          <div className="flex items-center gap-3 opacity-50">
            <Sparkles className="w-5 h-5" />
            <span className="text-sm font-bold tracking-tighter uppercase">StudioFlyr</span>
          </div>
          <p className="text-neutral-600 text-[10px] sm:text-xs text-center md:text-left">
            © 2026 StudioFlyr AI. All rights reserved. Professional product photography made accessible.
          </p>
          <div className="flex items-center gap-4 sm:gap-6">
            <a href="#" className="text-[10px] sm:text-xs text-neutral-600 hover:text-white transition-colors">Privacy</a>
            <a href="#" className="text-[10px] sm:text-xs text-neutral-600 hover:text-white transition-colors">Terms</a>
            <a href="#" className="text-[10px] sm:text-xs text-neutral-600 hover:text-white transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
