import React from 'react';
import { motion } from 'framer-motion';
import { Database, Cpu, Layout, CheckCircle } from 'lucide-react';

const HowItWorks: React.FC = () => {
  const steps = [
    {
      icon: <Database className="w-8 h-8 text-white" />,
      title: "1. Tell us what you need to do",
      desc: "Break down your syllabus. Just list the chapters or modules you have left to study."
    },
    {
      icon: <Cpu className="w-8 h-8 text-white" />,
      title: "2. We analyze the time",
      desc: "We look at how many days you have left and figure out the 'pressure score' of your workload."
    },
    {
      icon: <Layout className="w-8 h-8 text-white" />,
      title: "3. We build the schedule",
      desc: "We create a balanced plan that prioritizes important topics but gives you breaks so you don't crash."
    },
    {
      icon: <CheckCircle className="w-8 h-8 text-white" />,
      title: "4. You get a clear plan",
      desc: "You get a simple 7-day checklist. No confusion. Just wake up, check the list, and study."
    }
  ];

  return (
    <div className="min-h-screen bg-black pt-32 pb-20 px-6">
      <div className="max-w-4xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-20"
        >
          <h1 className="font-display text-4xl md:text-6xl font-bold text-white mb-6">How It Works</h1>
          <p className="text-gray-400 text-xl max-w-2xl mx-auto">
            It's not magic, it's just smart planning. Here is how we help you recover.
          </p>
        </motion.div>

        <div className="relative">
          <div className="absolute left-8 md:left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-red-600/50 via-red-900/20 to-transparent"></div>
          
          <div className="space-y-16">
            {steps.map((step, index) => (
              <motion.div 
                key={index}
                initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className={`flex flex-col md:flex-row gap-8 items-start relative ${index % 2 !== 0 ? 'md:flex-row-reverse' : ''}`}
              >
                <div className="absolute left-8 md:left-1/2 -translate-x-1/2 w-4 h-4 bg-black border-2 border-red-500 rounded-full z-10 mt-6 shadow-[0_0_15px_rgba(220,38,38,0.8)]"></div>
                
                <div className={`ml-16 md:ml-0 md:w-1/2 ${index % 2 === 0 ? 'md:pr-12 md:text-right' : 'md:pl-12'}`}>
                  <div className={`inline-flex p-4 rounded-xl bg-gradient-to-br from-red-900/40 to-black border border-red-500/20 mb-4 ${index % 2 === 0 && 'md:ml-auto'}`}>
                    {step.icon}
                  </div>
                  <h3 className="font-display text-2xl font-bold text-white mb-3">{step.title}</h3>
                  <p className="text-gray-400 leading-relaxed">{step.desc}</p>
                </div>
                <div className="md:w-1/2"></div>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="mt-24 p-8 glass-card rounded-2xl text-center border border-white/5">
           <h3 className="font-display text-2xl text-white mb-4">Ready to try it?</h3>
           <p className="text-gray-500 mb-8">The planner is ready for you.</p>
           <a href="#/engine" className="inline-block px-8 py-3 bg-red-700 text-white font-bold rounded-lg hover:bg-red-600 transition-colors">
             Create My Plan
           </a>
        </div>
      </div>
    </div>
  );
};

export default HowItWorks;