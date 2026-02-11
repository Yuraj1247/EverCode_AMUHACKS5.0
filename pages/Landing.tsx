import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowRight, BarChart2, Clock, Zap, Shield, ChevronDown, CheckCircle, Activity } from 'lucide-react';

const Landing: React.FC = () => {
  const { scrollYProgress } = useScroll();
  const y = useTransform(scrollYProgress, [0, 1], [0, -50]);
  
  const [typedText, setTypedText] = useState('');
  const fullText = "Falling behind? Let's fix that.";

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      setTypedText(fullText.slice(0, i + 1));
      i++;
      if (i > fullText.length) clearInterval(interval);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
  };

  const features = [
    { icon: <Zap className="w-6 h-6 text-red-500" />, title: "Smart Pacing", desc: "We figure out exactly how much you need to study each day to finish on time." },
    { icon: <BarChart2 className="w-6 h-6 text-red-500" />, title: "Clear Workload", desc: "See your backlog clearly so you know exactly what you're dealing with." },
    { icon: <Clock className="w-6 h-6 text-red-500" />, title: "Adaptive Schedule", desc: "Fall behind? No worries. We'll adjust your plan automatically." },
    { icon: <Shield className="w-6 h-6 text-red-500" />, title: "Stress Free", desc: "We build in buffer time so you don't burn out before the exam." },
  ];

  return (
    <div className="bg-black min-h-screen text-white overflow-hidden">
      
      <section className="relative min-h-screen flex items-center justify-center px-6 pt-20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-red-900/20 via-black to-black opacity-50"></div>
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
        
        <div className="relative z-10 max-w-5xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-block px-4 py-1 mb-6 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm text-red-400 text-xs font-mono uppercase tracking-widest">
              Updated for 2024
            </div>
            <h1 className="font-display text-5xl md:text-7xl lg:text-8xl font-bold tracking-tighter mb-6 leading-tight">
              GET BACK ON <br />
              <span className="text-gradient">TRACK TODAY</span>
            </h1>
            <div className="h-8 md:h-12 mb-8">
               <p className="font-mono text-red-500/80 text-lg md:text-xl tracking-wide">{typedText}<span className="animate-pulse">_</span></p>
            </div>
            <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
              Stop guessing and start doing. We turn your overwhelming pile of work into a simple, manageable daily plan.
            </p>
            <div className="flex flex-col md:flex-row gap-4 justify-center items-center">
              <Link to="/engine">
                <button className="group relative px-8 py-4 bg-red-700 text-white font-bold rounded-lg overflow-hidden transition-all hover:scale-105 hover:shadow-[0_0_40px_rgba(220,38,38,0.4)]">
                  <span className="relative z-10 flex items-center gap-2">
                    Start Your Plan <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-red-600 to-rose-800 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </button>
              </Link>
              <Link to="/how-it-works">
                <button className="px-8 py-4 bg-white/5 border border-white/10 text-white font-medium rounded-lg hover:bg-white/10 transition-all backdrop-blur-sm">
                  See How It Works
                </button>
              </Link>
            </div>
          </motion.div>
        </div>
        
        <motion.div 
          className="absolute bottom-10 left-1/2 -translate-x-1/2 text-gray-500 animate-bounce"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2, duration: 1 }}
        >
          <ChevronDown />
        </motion.div>
      </section>

      <section className="py-32 px-6 relative border-t border-white/5 bg-neutral-950/50">
        <div className="max-w-7xl mx-auto">
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeIn}
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
          >
            <div className="glass-card p-8 rounded-2xl md:col-span-2 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-32 bg-red-600/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-red-600/20 transition-all duration-700"></div>
              <h3 className="font-display text-2xl font-bold mb-4 text-white">Why It Happens</h3>
              <p className="text-gray-400 mb-6">
                Most students don't fail because they aren't smart. They struggle because they don't know where to start. RECAP treats your time like money—we budget it wisely so you get the best return on your effort.
              </p>
              <div className="flex gap-4 items-end h-32 mt-8">
                {[40, 65, 30, 80, 55, 90, 45].map((h, i) => (
                  <div key={i} className="w-full bg-red-900/30 rounded-t-sm relative group-hover:bg-red-600/50 transition-colors duration-500" style={{ height: `${h}%` }}>
                    <div className="absolute bottom-0 w-full bg-red-600 h-1"></div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="glass-card p-8 rounded-2xl flex flex-col justify-between">
              <div>
                <h3 className="font-display text-5xl font-bold text-white mb-2">87<span className="text-red-500">%</span></h3>
                <p className="text-gray-500 text-sm uppercase tracking-wider">Improvement Rate</p>
              </div>
              <p className="text-gray-400 mt-6 text-sm">
                Students who follow a structured recovery plan are 87% more likely to pass their exams than those who just try to "study harder."
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="font-display text-4xl md:text-5xl font-bold mb-6">Simple Tools, Big Results</h2>
            <p className="text-gray-500 max-w-2xl mx-auto">
              We break down your scary mountain of work into small, easy steps.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="glass-panel p-8 rounded-xl hover:border-red-500/30 transition-all duration-300 hover:-translate-y-2 group"
              >
                <div className="mb-6 p-4 rounded-full bg-white/5 w-fit group-hover:bg-red-600/10 transition-colors">
                  {feature.icon}
                </div>
                <h3 className="font-display text-xl font-bold text-white mb-3">{feature.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-32 px-6 bg-gradient-to-b from-black to-neutral-900 border-y border-white/5">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="font-display text-4xl font-bold mb-8">Smart Features</h2>
              <div className="space-y-6">
                <div className="glass-panel p-6 rounded-lg border-l-4 border-l-red-600">
                  <h4 className="text-white font-bold mb-2 flex items-center gap-2"><Activity size={16}/> Workload Analysis</h4>
                  <p className="text-gray-400 text-sm">We see exactly how many hours of work you have left.</p>
                </div>
                <div className="glass-panel p-6 rounded-lg border-l-4 border-l-orange-600">
                  <h4 className="text-white font-bold mb-2 flex items-center gap-2"><Clock size={16}/> Deadline Awareness</h4>
                  <p className="text-gray-400 text-sm">We prioritize tasks based on how soon they are due.</p>
                </div>
                <div className="glass-panel p-6 rounded-lg border-l-4 border-l-green-600">
                  <h4 className="text-white font-bold mb-2 flex items-center gap-2"><CheckCircle size={16}/> Your Schedule</h4>
                  <p className="text-gray-400 text-sm">You get a clean, 7-day plan. Just follow it.</p>
                </div>
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="absolute inset-0 bg-red-600 blur-[100px] opacity-20"></div>
              <div className="glass-card p-8 rounded-2xl relative border border-white/10">
                 <div className="flex justify-between items-center mb-8">
                    <span className="text-xs font-mono text-gray-500">YOUR RESULTS</span>
                    <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                 </div>
                 <div className="space-y-4">
                    <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
                       <div className="h-full bg-red-600 w-[85%]"></div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-400 font-mono">
                      <span>STRESS LEVEL</span>
                      <span>HIGH</span>
                    </div>
                    
                    <div className="h-2 bg-neutral-800 rounded-full overflow-hidden mt-6">
                       <div className="h-full bg-white w-[45%]"></div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-400 font-mono">
                      <span>TIME LEFT</span>
                      <span>LIMITED</span>
                    </div>
                    
                    <div className="mt-8 p-4 bg-red-900/20 border border-red-500/20 rounded text-center">
                       <span className="text-red-400 font-display font-bold text-2xl tracking-widest">PLAN READY</span>
                    </div>
                 </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="py-40 px-6 text-center">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-display text-5xl font-bold mb-8">Don't let the backlog win.</h2>
          <p className="text-gray-400 text-lg mb-12">
            The semester is finite. Your potential doesn't have to be.
          </p>
          <Link to="/engine">
            <button className="px-10 py-5 bg-gradient-to-r from-red-700 to-red-900 rounded-full text-white font-bold text-lg hover:shadow-[0_0_50px_rgba(220,38,38,0.5)] transition-all transform hover:scale-105">
              Create My Study Plan
            </button>
          </Link>
        </div>
      </section>
      
    </div>
  );
};

export default Landing;