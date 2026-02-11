import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Calendar, Clock, BookOpen, AlertCircle, CheckCircle2, ArrowRight, Layers, Activity, Brain } from 'lucide-react';
import { Subject, StudentProfile, DifficultyLevel, StressLevel, LearningPace, CalculationStatus } from '../types';

const Engine: React.FC = () => {
  // --- Centralized State ---
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [studentProfile, setStudentProfile] = useState<StudentProfile>({
    availableHoursPerDay: 4,
    learningPace: 'Moderate',
    stressLevel: 'Moderate'
  });
  const [status, setStatus] = useState<CalculationStatus>(CalculationStatus.INVALID);

  // --- Validation Logic ---
  useEffect(() => {
    validateInputs();
  }, [subjects, studentProfile]);

  const validateInputs = () => {
    // Rule 1: At least one subject
    if (subjects.length === 0) {
      setStatus(CalculationStatus.INVALID);
      return;
    }

    // Rule 2: Subject Data Integrity
    const allSubjectsValid = subjects.every(sub => 
      sub.name.trim().length > 0 && 
      sub.backlogChapters > 0 && 
      sub.deadline !== ''
    );

    if (!allSubjectsValid) {
      setStatus(CalculationStatus.INVALID);
      return;
    }

    // Rule 3: Profile Integrity
    if (studentProfile.availableHoursPerDay <= 0) {
      setStatus(CalculationStatus.INVALID);
      return;
    }

    setStatus(CalculationStatus.VALID);
  };

  // --- Subject Actions ---
  const addSubject = () => {
    const newSubject: Subject = {
      id: crypto.randomUUID(),
      name: '',
      backlogChapters: 5,
      deadline: '',
      difficulty: 'Moderate'
    };
    setSubjects([...subjects, newSubject]);
  };

  const removeSubject = (id: string) => {
    setSubjects(subjects.filter(s => s.id !== id));
  };

  const updateSubjectField = (id: string, field: keyof Subject, value: any) => {
    setSubjects(subjects.map(sub => {
      if (sub.id === id) {
        if (field === 'backlogChapters' && value < 1) value = 1;
        return { ...sub, [field]: value };
      }
      return sub;
    }));
  };

  // --- Profile Actions ---
  const updateStudentProfile = (field: keyof StudentProfile, value: any) => {
    if (field === 'availableHoursPerDay' && value < 1) value = 1;
    if (field === 'availableHoursPerDay' && value > 24) value = 24;
    setStudentProfile(prev => ({ ...prev, [field]: value }));
  };

  // --- UI Helpers ---
  const difficultyOptions: DifficultyLevel[] = ['Low', 'Moderate', 'High'];
  const stressOptions: StressLevel[] = ['Low', 'Moderate', 'High'];
  const paceOptions: LearningPace[] = ['Slow', 'Moderate', 'Fast'];

  return (
    <div className="min-h-screen pt-28 pb-32 px-4 md:px-8 bg-black bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-neutral-900 via-black to-black">
      <div className="max-w-3xl mx-auto space-y-12">
        
        {/* Header */}
        <div className="text-center space-y-3">
          <h1 className="font-display text-4xl md:text-5xl font-bold text-white tracking-tight">
            Academic <span className="text-gradient">Input System</span>
          </h1>
          <p className="text-gray-400 max-w-lg mx-auto text-sm md:text-base">
            Configure your academic context. This data will serve as the foundation for your recovery strategy.
          </p>
        </div>

        {/* 1. DYNAMIC SUBJECT SECTION */}
        <div className="space-y-6">
          <div className="flex justify-between items-end border-b border-white/10 pb-4">
            <h2 className="font-display text-lg font-bold text-white flex items-center gap-2">
              <Layers className="text-red-500" size={18} />
              Subject Modules
            </h2>
            <button 
              onClick={addSubject}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-lg text-xs font-medium text-white transition-all flex items-center gap-2"
            >
              <Plus size={14} /> Add Module
            </button>
          </div>

          <div className="space-y-4">
            <AnimatePresence initial={false}>
              {subjects.map((subject) => (
                <motion.div
                  key={subject.id}
                  initial={{ opacity: 0, height: 0, y: 10 }}
                  animate={{ opacity: 1, height: 'auto', y: 0 }}
                  exit={{ opacity: 0, height: 0, scale: 0.95 }}
                  className="glass-panel p-5 rounded-xl border border-white/10 relative group hover:border-red-500/20 transition-all overflow-hidden"
                >
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                    
                    {/* Name */}
                    <div className="md:col-span-5 space-y-1.5">
                      <label className="text-[10px] uppercase font-mono text-gray-500 tracking-wider">Subject Name</label>
                      <div className="relative">
                        <BookOpen className="absolute left-3 top-3 text-gray-600" size={14} />
                        <input 
                          type="text" 
                          value={subject.name}
                          placeholder="e.g. Organic Chemistry"
                          onChange={(e) => updateSubjectField(subject.id, 'name', e.target.value)}
                          className={`w-full bg-black/40 border rounded-lg py-2.5 pl-9 pr-3 text-sm text-white placeholder-gray-700 focus:outline-none focus:ring-1 transition-all ${subject.name ? 'border-white/10 focus:border-red-500' : 'border-red-500/30'}`}
                        />
                      </div>
                    </div>

                    {/* Backlog */}
                    <div className="md:col-span-2 space-y-1.5">
                      <label className="text-[10px] uppercase font-mono text-gray-500 tracking-wider">Chapters</label>
                      <input 
                        type="number" 
                        min="1"
                        value={subject.backlogChapters}
                        onChange={(e) => updateSubjectField(subject.id, 'backlogChapters', parseInt(e.target.value) || 0)}
                        className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-red-500 transition-all text-center"
                      />
                    </div>

                    {/* Deadline */}
                    <div className="md:col-span-3 space-y-1.5">
                      <label className="text-[10px] uppercase font-mono text-gray-500 tracking-wider">Deadline</label>
                      <input 
                        type="date" 
                        value={subject.deadline}
                        min={new Date().toISOString().split('T')[0]}
                        onChange={(e) => updateSubjectField(subject.id, 'deadline', e.target.value)}
                        className={`w-full bg-black/40 border rounded-lg p-2.5 text-sm text-white focus:outline-none focus:ring-1 transition-all ${subject.deadline ? 'border-white/10 focus:border-red-500' : 'border-red-500/30'}`}
                      />
                    </div>

                     {/* Difficulty */}
                     <div className="md:col-span-2 space-y-1.5">
                      <label className="text-[10px] uppercase font-mono text-gray-500 tracking-wider">Difficulty</label>
                      <select 
                        value={subject.difficulty}
                        onChange={(e) => updateSubjectField(subject.id, 'difficulty', e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-red-500 transition-all cursor-pointer"
                      >
                        {difficultyOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    </div>
                  </div>

                  <button 
                    onClick={() => removeSubject(subject.id)}
                    className="absolute top-2 right-2 text-gray-700 hover:text-red-500 transition-colors p-2 opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={14} />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>

            {subjects.length === 0 && (
              <div className="border border-dashed border-white/10 rounded-xl p-10 flex flex-col items-center justify-center text-center bg-white/[0.02]">
                <div className="bg-white/5 p-3 rounded-full mb-3">
                  <Layers className="text-gray-600" size={24} />
                </div>
                <h3 className="text-white text-sm font-medium mb-1">No Modules Active</h3>
                <p className="text-gray-600 text-xs max-w-[200px] mb-4">Initialize at least one subject to enable the recovery engine.</p>
                <button onClick={addSubject} className="text-red-500 hover:text-red-400 text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                  <Plus size={12} /> Add First Module
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 2. STUDENT PROFILE SECTION */}
        <div className="space-y-6">
          <div className="flex items-end border-b border-white/10 pb-4">
            <h2 className="font-display text-lg font-bold text-white flex items-center gap-2">
              <Brain className="text-red-500" size={18} />
              Student Profile
            </h2>
          </div>

          <div className="glass-panel p-6 rounded-xl border border-white/10">
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               
               {/* Available Hours */}
               <div className="space-y-2">
                 <label className="text-[10px] uppercase font-mono text-gray-500 tracking-wider flex items-center gap-2">
                   <Clock size={12} /> Daily Capacity
                 </label>
                 <div className="relative">
                    <input 
                      type="number"
                      min="1"
                      max="24"
                      value={studentProfile.availableHoursPerDay}
                      onChange={(e) => updateStudentProfile('availableHoursPerDay', parseInt(e.target.value) || 0)}
                      className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-red-500 transition-all font-mono"
                    />
                    <span className="absolute right-3 top-3.5 text-xs text-gray-600">HRS/DAY</span>
                 </div>
               </div>

               {/* Learning Pace */}
               <div className="space-y-2">
                 <label className="text-[10px] uppercase font-mono text-gray-500 tracking-wider flex items-center gap-2">
                   <Activity size={12} /> Learning Pace
                 </label>
                 <select 
                    value={studentProfile.learningPace}
                    onChange={(e) => updateStudentProfile('learningPace', e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-red-500 transition-all cursor-pointer"
                  >
                    {paceOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
               </div>

               {/* Stress Level */}
               <div className="space-y-2">
                 <label className="text-[10px] uppercase font-mono text-gray-500 tracking-wider flex items-center gap-2">
                   <AlertCircle size={12} /> Stress Level
                 </label>
                 <select 
                    value={studentProfile.stressLevel}
                    onChange={(e) => updateStudentProfile('stressLevel', e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-red-500 transition-all cursor-pointer"
                  >
                    {stressOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
               </div>

             </div>
          </div>
        </div>

        {/* 3. ACTION BAR (VALIDATION STATE) */}
        <div className="fixed bottom-0 left-0 w-full bg-black/80 backdrop-blur-xl border-t border-white/10 p-6 z-40">
          <div className="max-w-3xl mx-auto flex items-center justify-between">
             <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${status === CalculationStatus.VALID ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                <div>
                   <p className="text-xs font-mono text-gray-400 uppercase tracking-widest">
                     {status === CalculationStatus.VALID ? 'SYSTEM READY' : 'AWAITING INPUT'}
                   </p>
                </div>
             </div>

             <button 
               disabled={status !== CalculationStatus.VALID}
               className={`px-6 py-3 rounded-lg font-bold text-xs uppercase tracking-widest transition-all flex items-center gap-2 ${
                 status === CalculationStatus.VALID 
                 ? 'bg-red-600 hover:bg-red-500 text-white shadow-[0_0_20px_rgba(220,38,38,0.4)]' 
                 : 'bg-white/5 text-gray-600 cursor-not-allowed border border-white/5'
               }`}
             >
               Generate Plan <ArrowRight size={14} />
             </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Engine;