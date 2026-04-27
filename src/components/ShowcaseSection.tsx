import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/src/lib/utils';

const showcases = [
  { title: "Architectural Rendering", category: "Architecture", image: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=600" },
  { title: "Product Design", category: "Product", image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=600" },
  { title: "Interior Concept", category: "Interior", image: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?q=80&w=600" },
  { title: "Abstract Art", category: "Art", image: "https://images.unsplash.com/photo-1541963463532-d68292c34b19?q=80&w=600" },
  { title: "Tech UI", category: "UI", image: "https://images.unsplash.com/photo-1563986768609-322da13575f3?q=80&w=600" },
  { title: "Nature Photography", category: "Nature", image: "https://images.unsplash.com/photo-1493246507139-91e8bef99c02?q=80&w=600" },
];

const categories = ["All", "Architecture", "Product", "Interior", "Art", "UI", "Nature"];

export default function ShowcaseSection() {
  const [selectedCategory, setSelectedCategory] = React.useState("All");

  const filteredShowcases = selectedCategory === "All" 
    ? showcases 
    : showcases.filter(s => s.category === selectedCategory);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="py-20 px-6 max-w-7xl mx-auto"
    >
      <div className="text-center mb-16">
        <h2 className="text-4xl font-bold mb-4">Showcase</h2>
        <p className="text-neutral-400 mb-8">Discover incredible visuals created with our platform.</p>
        
        <div className="flex flex-wrap justify-center gap-2">
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={cn(
                "px-4 py-2 rounded-full text-sm transition-colors",
                selectedCategory === category 
                  ? "bg-white text-black" 
                  : "bg-neutral-800 text-neutral-400 hover:text-white"
              )}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <AnimatePresence>
          {filteredShowcases.map((s, i) => (
            <motion.div 
              key={s.title}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              whileHover={{ y: -10 }}
              className="group cursor-pointer rounded-3xl overflow-hidden bg-neutral-900 border border-neutral-800"
            >
              <img src={s.image} alt={s.title} className="w-full h-64 object-cover transition-transform duration-500 group-hover:scale-110" />
              <div className="p-6">
                <h3 className="text-lg font-semibold">{s.title}</h3>
                <span className="text-xs text-neutral-500 uppercase tracking-widest">{s.category}</span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
