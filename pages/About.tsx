import React from 'react';
import { motion } from 'framer-motion';

const About: React.FC = () => {
  return (
    <div className="min-h-screen bg-black pt-32 pb-20 px-6">
      <div className="max-w-3xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="font-display text-5xl md:text-7xl font-bold text-white mb-12">Our Goal.</h1>
          
          <div className="prose prose-invert prose-lg text-gray-400">
            <p className="mb-8 text-xl leading-relaxed text-gray-300">
              RECAP wasn't built for the students who plan everything months in advance. It was built for the rest of us. The procrastinators. The overwhelmed. The brilliant minds buried under poor time management.
            </p>
            
            <div className="glass-panel p-8 border-l-4 border-l-red-600 my-12 rounded-r-xl">
              <h3 className="font-display text-2xl font-bold text-white mb-4">The Idea</h3>
              <p>
                Bad grades usually aren't about being smart enough. They are about being organized enough. When you have too much to do, you freeze up. RECAP unfreezes you.
              </p>
            </div>

            <h3 className="font-display text-3xl text-white mt-12 mb-6">Why "Recovery"?</h3>
            <p className="mb-6">
              We don't call it a study planner because it's more than that. It's about recovering your confidence. 
            </p>
            <p>
              We use simple logic to figure out what needs to be saved first. It's not about doing everything perfectly—it's about surviving the semester with your grades (and your sanity) intact.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default About;