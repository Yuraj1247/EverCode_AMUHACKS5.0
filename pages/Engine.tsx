import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Calendar, Clock, BookOpen, AlertCircle, CheckCircle2, ArrowRight, Layers, Activity, Brain, AlertTriangle, TrendingUp, BarChart, Zap, Gauge } from 'lucide-react';
import { Subject, StudentProfile, DifficultyLevel, StressLevel, LearningPace, CalculationStatus, PressureCategory, RecoveryMetrics } from '../types';

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
    if (subjects.length === 0) {
      setStatus(CalculationStatus.INVALID);
      return;
    }
    const allSubjectsValid = subjects.every(sub => 
      sub.name.trim().length > 0 && 
      sub.backlogChapters > 0 && 
      sub.deadline !== ''
    );
    if (!allSubjectsValid) {
      setStatus(CalculationStatus.INVALID);
      return;
    }
    if (studentProfile.availableHoursPerDay <= 0) {
      setStatus(CalculationStatus.INVALID);
      return;
    }
    setStatus(CalculationStatus.VALID);
  };

  // --- Phase 2: Metric Calculation Engine ---
  const calculateDeadlineMetrics = (rawSubjects: Subject[]): Subject[] => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return rawSubjects.map(sub => {
      let daysRemaining = 30; // Default
      let urgencyScore = 0.2;
      let urgencyLabel = 'Low';
      let urgencyColor = 'text-emerald-500 border-emerald-500/30 bg-emerald-500/5';

      if (sub.deadline) {
        const deadlineDate = new Date(sub.deadline);
        deadlineDate.setHours(0, 0, 0, 0);
        const diffTime = deadlineDate.getTime() - today.getTime();
        daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (daysRemaining < 0) daysRemaining = 0;
      }

      // Urgency Logic (Inverse Relationship)
      if (daysRemaining <= 3) {
        urgencyScore = 1.0;
        urgencyLabel = 'Critical';
        urgencyColor = 'text-red-500 border-red-500/50 bg-red-500/10';
      } else if (daysRemaining <= 7) {
        urgencyScore = 0.8;
        urgencyLabel = 'High';
        urgencyColor = 'text-orange-500 border-orange-500/50 bg-orange-500/10';
      } else if (daysRemaining <= 14) {
        urgencyScore = 0.5;
        urgencyLabel = 'Moderate';
        urgencyColor = 'text-yellow-500 border-yellow-500/50 bg-yellow-500/10';
      }

      return {
        ...sub,
        daysRemaining,
        urgencyScore,
        urgencyLabel,
        urgencyColor
      };
    });
  };

  // --- Phase 3: Pressure Scoring Engine ---
  const calculatePressureMetrics = (timedSubjects: Subject[], profile: StudentProfile): Subject[] => {
    const diffMap: Record<DifficultyLevel, number> = { 'Low': 1, 'Moderate': 1.5, 'High': 2 };
    const stressMap: Record<StressLevel, number> = { 'Low': 0.9, 'Moderate': 1.0, 'High': 1.2 };
    const paceMap: Record<LearningPace, number> = { 'Slow': 1.2, 'Moderate': 1.0, 'Fast': 0.85 };

    const stressMultiplier = stressMap[profile.stressLevel];
    const paceMultiplier = paceMap[profile.learningPace];

    const scoredSubjects = timedSubjects.map(sub => {
      const difficultyWeight = diffMap[sub.difficulty];
      const backlogWeight = sub.backlogChapters * difficultyWeight;
      const basePressure = backlogWeight * (sub.urgencyScore || 0.2);
      let pressureScore = basePressure * stressMultiplier * paceMultiplier;
      pressureScore = Math.max(1, parseFloat(pressureScore.toFixed(2)));

      return {
        ...sub,
        difficultyWeight,
        pressureScore
      };
    });

    // Determine Relative Categories
    const sortedScores = [...scoredSubjects].sort((a, b) => (b.pressureScore || 0) - (a.pressureScore || 0));
    
    return scoredSubjects.map(sub => {
      const rank = sortedScores.findIndex(s => s.id === sub.id);
      const percentile = rank / sortedScores.length;

      let category: PressureCategory = 'Low';
      let color = 'from-emerald-400 to-emerald-600';

      if (percentile < 0.25) {
        category = 'Critical';
        color = 'from-red-500 to-rose-700';
      } else if (percentile < 0.50) {
        category = 'High';
        color = 'from-orange-400 to-orange-600';
      } else if (percentile < 0.75) {
        category = 'Moderate';
        color = 'from-yellow-400 to-yellow-600';
      }

      return {
        ...sub,
        pressureCategory: category,
        pressureColor: color
      };
    });
  };

  // --- Phase 4: Overall Recovery Difficulty Engine ---
  const calculateRecoveryDifficulty = (enhancedSubjects: Subject[], profile: StudentProfile): RecoveryMetrics => {
    // 1. Calculate Total Pressure
    const totalPressure = enhancedSubjects.reduce((acc, curr) => acc + (curr.pressureScore || 0), 0);

    // 2. Calculate Time Capacity (Weekly effort)
    const weeklyCapacity = profile.availableHoursPerDay * 7;

    // 3. Compute Load Ratio
    // Total Pressure is an abstract score, but generally scales with hours needed x urgency.
    const loadRatio = totalPressure / weeklyCapacity;

    // 4. Normalize to 0-100 Scale
    // Scaling factor of 50 assumes a ratio of 2.0 (pressure is double capacity) is max difficulty.
    let difficultyScore = Math.round(loadRatio * 50);
    difficultyScore = Math.min(difficultyScore, 100);

    // 5. Categorize
    let recoveryCategory: 'Low' | 'Moderate' | 'High' | 'Critical' = 'Low';
    let message = "Your recovery is manageable with steady effort.";
    let color = "text-emerald-500";

    if (difficultyScore > 80) {
      recoveryCategory = 'Critical';
      message = "Immediate focus and aggressive prioritization required.";
      color = "text-red-600";
    } else if (difficultyScore > 60) {
      recoveryCategory = 'High';
      message = "Recovery requires disciplined execution.";
      color = "text-orange-500";
    } else if (difficultyScore > 30) {
      recoveryCategory = 'Moderate';
      message = "You need structured prioritization to stay on track.";
      color = "text-yellow-500";
    }

    return {
      totalPressure: parseFloat(totalPressure.toFixed(1)),
      weeklyCapacity,
      loadRatio: parseFloat(loadRatio.toFixed(2)),
      difficultyScore,
      recoveryCategory,
      message,
      color
    };
  };

  // --- Main Computation Chain ---
  const { analyzedSubjects, recoveryMetrics } = useMemo(() => {
    const timeMetrics = calculateDeadlineMetrics(subjects);
    const pressureMetrics = calculatePressureMetrics(timeMetrics, studentProfile);
    
    // Only calculate recovery if we have subjects
    const recovery = subjects.length > 0 
      ? calculateRecoveryDifficulty(pressureMetrics, studentProfile) 
      : null;

    return { analyzedSubjects: pressureMetrics, recoveryMetrics: recovery };
  }, [subjects, studentProfile]);

  // --- Actions ---
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

  const updateStudentProfile = (field: keyof StudentProfile, value: any) => {
    if (field === 'availableHoursPerDay' && value < 1) value = 1;
    if (field === 'availableHoursPerDay' && value > 24) value = 24;
    setStudentProfile(prev => ({ ...prev, [field]: value }));
  };

  // --- Helpers ---
  const difficultyOptions: DifficultyLevel[] = ['Low', 'Moderate', 'High'];
  const stressOptions: StressLevel[] = ['Low', 'Moderate', 'High'];
  const paceOptions: LearningPace[] = ['Slow', 'Moderate', 'Fast'];

  // Circular Progress Component
  const CircularProgress = ({ score, color }: { score: number, color: string }) => {
    const radius = 50;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (score / 100) * circumference;
    
    // Map Tailwind text color to hex for SVG stroke (approximate)
    const getColorHex = (c: string) => {
      if (c.includes('red')) return '#DC2626';
      if (c.includes('orange')) return '#F97316';
      if (c.includes('yellow')) return '#EAB308';
      return '#10B981';
    };

    return (
      <div className="relative w-40 h-40 flex items-center justify-center">
        <svg className="transform -rotate-90 w-full h-full">
          <circle
            cx="80"
            cy="80"
            r={radius}
            stroke="#1f2937"
            strokeWidth="8"
            fill="transparent"
          />
          <motion.circle
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1, ease: "easeOut" }}
            cx="80"
            cy="80"
            r={radius}
            stroke={getColorHex(color)}
            strokeWidth="8"
            fill="transparent"
            strokeDasharray={circumference}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-display font-bold text-white">{score}</span>
          <span className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">Difficulty</span>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen pt-28 pb-32 px-4 md:px-8 bg-black bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-neutral-900 via-black to-black">
      <div className="max-w-6xl mx-auto space-y-12">
        
        {/* Header */}
        <div className="text-center space-y-3">
          <h1 className="font-display text-4xl md:text-5xl font-bold text-white tracking-tight">
            Recovery <span className="text-gradient">Engine</span>
          </h1>
          <p className="text-gray-400 max-w-lg mx-auto text-sm md:text-base">
            Input your academic data. We analyze pressure, urgency, and capacity to determine your recovery difficulty.
          </p>
        </div>

        {/* 1. DYNAMIC SUBJECT SECTION */}
        <div className="space-y-6">
          <div className="flex justify-between items-end border-b border-white/10 pb-4">
            <h2 className="font-display text-lg font-bold text-white flex items-center gap-2">
              <Layers className="text-red-500" size={18} />
              Subject Workload
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
              {analyzedSubjects.map((subject) => (
                <motion.div
                  key={subject.id}
                  initial={{ opacity: 0, height: 0, y: 10 }}
                  animate={{ opacity: 1, height: 'auto', y: 0 }}
                  exit={{ opacity: 0, height: 0, scale: 0.95 }}
                  className={`glass-panel p-5 rounded-xl border relative group transition-all overflow-hidden ${subject.urgencyColor ? subject.urgencyColor.replace('text-', 'border-').split(' ')[1] : 'border-white/10'}`}
                >
                  <div className={`absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b ${subject.pressureColor}`}></div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start pl-3">
                    {/* Name */}
                    <div className="md:col-span-4 space-y-2">
                       <div className="flex justify-between items-center md:hidden">
                         <span className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded ${subject.urgencyColor?.split(' ')[2]} ${subject.urgencyColor?.split(' ')[0]}`}>
                           {subject.urgencyLabel}
                         </span>
                      </div>
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
                       <div className="hidden md:flex items-center gap-2 mt-1">
                         <span className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded border ${subject.urgencyColor?.split(' ')[2].replace('/10','/5')} ${subject.urgencyColor?.replace('bg-','border-').split(' ')[1]} ${subject.urgencyColor?.split(' ')[0]}`}>
                           {subject.urgencyLabel} Urgency
                         </span>
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
                        className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-red-500 transition-all text-center font-mono"
                      />
                    </div>

                    {/* Deadline */}
                    <div className="md:col-span-3 space-y-1.5">
                      <label className="text-[10px] uppercase font-mono text-gray-500 tracking-wider flex justify-between">
                        <span>Deadline</span>
                        {subject.deadline && (
                          <span className={subject.urgencyColor?.split(' ')[0]}>{subject.daysRemaining} Days</span>
                        )}
                      </label>
                      <input 
                        type="date" 
                        value={subject.deadline}
                        min={new Date().toISOString().split('T')[0]}
                        onChange={(e) => updateSubjectField(subject.id, 'deadline', e.target.value)}
                        className={`w-full bg-black/40 border rounded-lg p-2.5 text-sm text-white focus:outline-none focus:ring-1 transition-all font-mono ${subject.deadline ? 'border-white/10 focus:border-red-500' : 'border-red-500/30'}`}
                      />
                    </div>

                     {/* Difficulty & Pressure */}
                     <div className="md:col-span-3 flex gap-3">
                        <div className="flex-1 space-y-1.5">
                          <label className="text-[10px] uppercase font-mono text-gray-500 tracking-wider">Difficulty</label>
                          <select 
                            value={subject.difficulty}
                            onChange={(e) => updateSubjectField(subject.id, 'difficulty', e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-red-500 transition-all cursor-pointer"
                          >
                            {difficultyOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                          </select>
                        </div>
                        <div className="flex-1 space-y-1.5">
                          <label className="text-[10px] uppercase font-mono text-gray-500 tracking-wider text-right block">Pressure</label>
                          <div className={`w-full p-2.5 rounded-lg border border-white/5 bg-gradient-to-r ${subject.pressureColor} flex items-center justify-between shadow-lg`}>
                             <span className="text-white font-bold text-sm drop-shadow-md">{subject.pressureScore}</span>
                             <span className="text-[8px] text-white/90 font-mono uppercase bg-black/20 px-1.5 py-0.5 rounded">{subject.pressureCategory}</span>
                          </div>
                        </div>
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
                <p className="text-gray-600 text-xs max-w-[200px] mb-4">Initialize at least one subject to enable the engine.</p>
                <button onClick={addSubject} className="text-red-500 hover:text-red-400 text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                  <Plus size={12} /> Add First Module
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 2. RECOVERY DIFFICULTY DASHBOARD (Phase 4) */}
        {recoveryMetrics && (
          <div className="space-y-6">
             <div className="flex items-end border-b border-white/10 pb-4">
              <h2 className="font-display text-lg font-bold text-white flex items-center gap-2">
                <Gauge className="text-red-500" size={18} />
                Recovery Difficulty
              </h2>
            </div>

            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-6"
            >
              {/* Main Score Panel */}
              <div className="md:col-span-2 glass-panel p-6 rounded-xl border border-white/10 flex flex-col md:flex-row items-center gap-8 relative overflow-hidden">
                <div className={`absolute top-0 right-0 p-32 rounded-full blur-3xl opacity-10 ${recoveryMetrics.color.replace('text-', 'bg-')}`}></div>
                
                <div className="relative z-10 shrink-0">
                  <CircularProgress score={recoveryMetrics.difficultyScore} color={recoveryMetrics.color} />
                </div>
                
                <div className="flex-1 text-center md:text-left relative z-10">
                  <h3 className={`font-display text-2xl font-bold mb-2 ${recoveryMetrics.color}`}>
                    {recoveryMetrics.recoveryCategory} Difficulty
                  </h3>
                  <p className="text-gray-300 text-lg leading-relaxed mb-4">
                    {recoveryMetrics.message}
                  </p>
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/5">
                    <Activity size={12} className="text-gray-500" />
                    <span className="text-xs text-gray-400 font-mono">
                      LOAD RATIO: {recoveryMetrics.loadRatio}
                    </span>
                  </div>
                </div>
              </div>

              {/* Insights Panel */}
              <div className="glass-panel p-6 rounded-xl border border-white/10 flex flex-col justify-center space-y-6">
                 <div>
                    <div className="flex justify-between items-center mb-1">
                       <span className="text-[10px] text-gray-500 uppercase font-mono tracking-wider">Total Pressure</span>
                       <span className="text-white font-bold">{recoveryMetrics.totalPressure}</span>
                    </div>
                    <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                       <motion.div 
                         initial={{ width: 0 }}
                         animate={{ width: `${Math.min(recoveryMetrics.totalPressure, 100)}%` }}
                         className="h-full bg-red-600" 
                       />
                    </div>
                 </div>

                 <div>
                    <div className="flex justify-between items-center mb-1">
                       <span className="text-[10px] text-gray-500 uppercase font-mono tracking-wider">Weekly Capacity</span>
                       <span className="text-white font-bold">{recoveryMetrics.weeklyCapacity} hrs</span>
                    </div>
                    <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                       <motion.div 
                         initial={{ width: 0 }}
                         animate={{ width: `${Math.min((recoveryMetrics.weeklyCapacity / 168) * 100, 100)}%` }} // 168 = total hours in week
                         className="h-full bg-blue-500" 
                       />
                    </div>
                 </div>

                 <div className="flex items-center justify-between pt-2 border-t border-white/5">
                    <span className="text-[10px] text-gray-500 uppercase font-mono tracking-wider">Subjects</span>
                    <span className="text-white font-bold font-mono">{subjects.length} Active</span>
                 </div>
              </div>

            </motion.div>
          </div>
        )}

        {/* 3. STUDENT PROFILE SECTION */}
        <div className="space-y-6">
          <div className="flex items-end border-b border-white/10 pb-4">
            <h2 className="font-display text-lg font-bold text-white flex items-center gap-2">
              <Brain className="text-red-500" size={18} />
              Student Context
            </h2>
          </div>

          <div className="glass-panel p-6 rounded-xl border border-white/10">
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

               <div className="space-y-2">
                 <label className="text-[10px] uppercase font-mono text-gray-500 tracking-wider flex items-center gap-2">
                   <Zap size={12} /> Learning Pace
                 </label>
                 <select 
                    value={studentProfile.learningPace}
                    onChange={(e) => updateStudentProfile('learningPace', e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-red-500 transition-all cursor-pointer"
                  >
                    {paceOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
               </div>

               <div className="space-y-2">
                 <label className="text-[10px] uppercase font-mono text-gray-500 tracking-wider flex items-center gap-2">
                   <Activity size={12} /> Stress Level
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

        {/* 4. ACTION BAR */}
        <div className="fixed bottom-0 left-0 w-full bg-black/80 backdrop-blur-xl border-t border-white/10 p-6 z-40">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
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