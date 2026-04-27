import React from 'react';
import { Check } from 'lucide-react';
import { motion } from 'motion/react';

export default function PricingSection() {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="py-20 px-6 max-w-5xl mx-auto"
    >
      <div className="text-center mb-16">
        <h2 className="text-4xl font-bold mb-4">Simple, transparent pricing</h2>
        <p className="text-neutral-400">Choose the plan that fits your creative needs.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {[
          {
            title: "Starter",
            price: "$0",
            features: ["5 Projects/month", "Standard AI models", "Community support"],
            button: "Get Started"
          },
          {
            title: "Pro",
            price: "$29",
            features: ["Unlimited Projects", "Premium AI models", "Priority processing", "Advanced features"],
            button: "Upgrade Now",
            highlight: true
          }
        ].map((plan, i) => (
          <div key={i} className={`p-8 rounded-3xl border ${plan.highlight ? 'bg-neutral-900 border-white/20' : 'bg-neutral-950 border-neutral-800'}`}>
            <h3 className="text-xl font-bold mb-2">{plan.title}</h3>
            <div className="text-4xl font-bold mb-6">{plan.price}<span className="text-lg text-neutral-500 font-normal">/mo</span></div>
            <ul className="space-y-4 mb-8">
              {plan.features.map(f => (
                <li key={f} className="flex items-center gap-3 text-neutral-300">
                  <Check className="w-5 h-5 text-green-500" />
                  {f}
                </li>
              ))}
            </ul>
            <button className={`w-full py-3 rounded-xl font-medium ${plan.highlight ? 'bg-white text-black' : 'bg-neutral-800 text-white'}`}>
              {plan.button}
            </button>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
