import React from 'react';
import { Activity, Twitter, Github, Linkedin, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';

const Footer: React.FC = () => {
  return (
    <footer className="bg-gradient-to-t from-black to-neutral-950 border-t border-white/5 pt-20 pb-10">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          <div className="col-span-1 md:col-span-1">
            <div className="flex items-center gap-2 mb-6">
              <Activity className="w-6 h-6 text-red-600" />
              <span className="font-display font-bold text-xl text-white">RECAP</span>
            </div>
            <p className="text-gray-500 text-sm leading-relaxed">
              Helping students get back on track, one day at a time. Simple, effective, and stress-free.
            </p>
          </div>
          
          <div>
            <h4 className="font-display font-semibold text-white mb-6">Explore</h4>
            <ul className="space-y-4 text-sm text-gray-500">
              <li><Link to="/engine" className="hover:text-red-500 transition-colors">Study Planner</Link></li>
              <li><Link to="/how-it-works" className="hover:text-red-500 transition-colors">How It Works</Link></li>
              <li><Link to="/about" className="hover:text-red-500 transition-colors">Our Story</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-display font-semibold text-white mb-6">Legal</h4>
            <ul className="space-y-4 text-sm text-gray-500">
              <li className="hover:text-red-500 transition-colors cursor-pointer">Privacy Policy</li>
              <li className="hover:text-red-500 transition-colors cursor-pointer">Terms of Service</li>
              <li className="hover:text-red-500 transition-colors cursor-pointer">Cookie Policy</li>
            </ul>
          </div>

          <div>
            <h4 className="font-display font-semibold text-white mb-6">Say Hello</h4>
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:bg-red-600 hover:text-white transition-all cursor-pointer">
                <Twitter size={18} />
              </div>
              <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:bg-red-600 hover:text-white transition-all cursor-pointer">
                <Github size={18} />
              </div>
              <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:bg-red-600 hover:text-white transition-all cursor-pointer">
                <Linkedin size={18} />
              </div>
              <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:bg-red-600 hover:text-white transition-all cursor-pointer">
                <Mail size={18} />
              </div>
            </div>
          </div>
        </div>
        
        <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-gray-600 text-xs">© 2026 RECAP Inc. All rights reserved.</p>
          <p className="text-gray-700 text-xs">Made with care for students everywhere.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;