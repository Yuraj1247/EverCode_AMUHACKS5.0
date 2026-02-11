import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Send, Check } from 'lucide-react';

const Contact: React.FC = () => {
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email) return;
    
    // Simulate API call and LocalStorage save
    const msgs = JSON.parse(localStorage.getItem('recap_messages') || '[]');
    msgs.push({ ...form, date: new Date().toISOString() });
    localStorage.setItem('recap_messages', JSON.stringify(msgs));
    
    setSent(true);
    setTimeout(() => setSent(false), 3000);
    setForm({ name: '', email: '', message: '' });
  };

  return (
    <div className="min-h-screen bg-black pt-32 px-6 flex items-center justify-center">
      <div className="w-full max-w-lg">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card p-8 md:p-12 rounded-2xl border border-white/10"
        >
          <h2 className="font-display text-3xl font-bold text-white mb-2">Get in Touch</h2>
          <p className="text-gray-500 mb-8">Have a question? Suggestion? Just want to say hi?</p>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-xs font-mono text-gray-500 mb-2">NAME</label>
              <input 
                type="text" 
                value={form.name}
                onChange={e => setForm({...form, name: e.target.value})}
                className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white focus:border-red-500 focus:outline-none transition-colors"
                placeholder="What should we call you?"
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-gray-500 mb-2">EMAIL</label>
              <input 
                type="email" 
                value={form.email}
                onChange={e => setForm({...form, email: e.target.value})}
                className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white focus:border-red-500 focus:outline-none transition-colors"
                placeholder="your@email.com"
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-gray-500 mb-2">MESSAGE</label>
              <textarea 
                rows={4}
                value={form.message}
                onChange={e => setForm({...form, message: e.target.value})}
                className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white focus:border-red-500 focus:outline-none transition-colors resize-none"
                placeholder="How can we help?"
              />
            </div>
            
            <button 
              type="submit"
              className="w-full bg-gradient-to-r from-red-700 to-red-900 text-white font-bold py-4 rounded-lg hover:shadow-[0_0_20px_rgba(220,38,38,0.4)] transition-all flex justify-center items-center gap-2"
            >
              {sent ? <><Check size={20}/> Message Sent</> : <><Send size={20}/> Send Message</>}
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
};

export default Contact;