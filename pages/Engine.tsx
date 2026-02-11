import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, RefreshCw, Calendar, Clock, AlertTriangle, Activity, BarChart2, Zap, Brain, Layers } from 'lucide-react';
import { ResponsiveContainer, RadialBarChart, RadialBar, Legend, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import { Subject, RecoveryPlan, CalculationStatus, LearningPace, DailySchedule, StudyBlock } from '../types';

const COLORS = ['#DC2626', '#EA580C', '#D97706', '#CA8A04', '#65A30D', '#059669', '#0891B2', '#2563EB'];

const Engine: React.FC = () => {
  // --- State Management ---
  const [subjects, setSubjects] = useState<Subject[]>([]);
  
  // Inputs
  const [newSubName, setNewSubName] = useState('');
  const [newSubUnits, setNewSubUnits] = useState(5);
  const [newSubDiff, setNewSubDiff] = useState(3);
  const [newSubDeadline, setNewSubDeadline] = useState('');

  // Global Config
  const [dailyHours, setDailyHours] = useState(4);
  const [stressLevel, setStressLevel] = useState(5);
  const [pace, setPace] = useState<LearningPace>('Medium');

  const [status, setStatus] = useState<CalculationStatus>(CalculationStatus.IDLE);
  const [plan, setPlan] = useState<RecoveryPlan | null>(null);

  // --- Persistence ---
  useEffect(() => {
    const savedSubjects = localStorage.getItem('recap_subjects_v2');
    if (savedSubjects) setSubjects(JSON.parse(savedSubjects));
    
    const savedPlan = localStorage.getItem('recap_plan_v2');
    if (savedPlan) setPlan(JSON.parse(savedPlan));
  }, []);

  const saveToStorage = (updatedSubjects: Subject[], updatedPlan?: RecoveryPlan) => {
    localStorage.setItem('recap_subjects_v2', JSON.stringify(updatedSubjects));
    if (updatedPlan) localStorage.setItem('recap_plan_v2', JSON.stringify(updatedPlan));
  };

  // --- Input Handlers ---
  const addSubject = () => {
    if (!newSubName || !newSubDeadline) return;
    
    const newSubject: Subject = {
      id: Math.random().toString(36).substr(2, 9),
      name: newSubName,
      units: newSubUnits,
      difficulty: newSubDiff,
      deadline: newSubDeadline,
      color: COLORS[subjects.length % COLORS.length]
    };

    const updated = [...subjects, newSubject];
    setSubjects(updated);
    saveToStorage(updated);
    
    // Reset inputs
    setNewSubName('');
    setNewSubUnits(5);
    setNewSubDiff(3);
  };

  const removeSubject = (id: string) => {
    const updated = subjects.filter(s => s.id !== id);
    setSubjects(updated);
    saveToStorage(updated);
  };

  // --- CORE ALGORITHM ---
  const generatePlan = () => {
    if (subjects.length === 0) return;
    setStatus(CalculationStatus.CALCULATING);

    // Simulate "thinking" time for UX
    setTimeout(() => {
      const today = new Date();
      let totalPressure = 0;
      const processedSubjects: Subject[] = [];

      // 1. Calculate Per-Subject Pressure
      subjects.forEach(sub => {
        const deadlineDate = new Date(sub.deadline);
        const diffTime = deadlineDate.getTime() - today.getTime();
        let daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (daysLeft < 1) daysLeft = 1; // Prevent division by zero

        // Formula Factors
        const backlogWeight = sub.units * sub.difficulty;
        const urgencyScore = 100 / daysLeft; // Higher as deadline approaches
        const stressMultiplier = 1 + (stressLevel / 20); // 1.05 to 1.5
        
        let paceMultiplier = 1;
        if (pace === 'Slow') paceMultiplier = 1.2; // Needs more time/effort perception
        if (pace === 'Fast') paceMultiplier = 0.8;

        // Final Score Calculation
        const pressureScore = (backlogWeight * urgencyScore * stressMultiplier * paceMultiplier) / 10;
        
        totalPressure += pressureScore;
        processedSubjects.push({ ...sub, pressureScore });
      });

      // 2. Normalize Overall Recovery Score (0-100)
      // Heuristic: If totalPressure > 500, it's critical.
      const rawRecoveryScore = Math.min((totalPressure / 5), 100);
      let label = "Manageable";
      if (rawRecoveryScore > 30) label = "Moderate Load";
      if (rawRecoveryScore > 60) label = "Heavy Load";
      if (rawRecoveryScore > 85) label = "Critical Status";

      // 3. Sort by Priority (Pressure Score Descending)
      processedSubjects.sort((a, b) => (b.pressureScore || 0) - (a.pressureScore || 0));

      // 4. Generate 7-Day Schedule
      const schedule: DailySchedule[] = [];
      const bufferRatio = 0.10; // 10% buffer
      const effectiveDailyHours = dailyHours * (1 - bufferRatio);
      
      for (let i = 0; i < 7; i++) {
        const currentDate = new Date();
        currentDate.setDate(today.getDate() + i);
        
        const blocks: StudyBlock[] = [];
        let timeAllocatedToday = 0;

        // Distribute time based on pressure ratio
        processedSubjects.forEach(sub => {
          if (!sub.pressureScore) return;
          
          const ratio = sub.pressureScore / totalPressure;
          let hoursForSubject = effectiveDailyHours * ratio;

          // Constraint: No subject > 50% of daily time (unless it's the only one)
          if (processedSubjects.length > 1 && hoursForSubject > (dailyHours * 0.5)) {
            hoursForSubject = dailyHours * 0.5;
          }

          // Round to nearest 0.25 (15 mins)
          hoursForSubject = Math.round(hoursForSubject * 4) / 4;

          if (hoursForSubject > 0.25) {
             // Heuristic task generation
             const taskStart = (i * (sub.units / 7)).toFixed(1);
             const taskEnd = ((i + 1) * (sub.units / 7)).toFixed(1);
             
             blocks.push({
               subjectId: sub.id,
               subjectName: sub.name,
               duration: hoursForSubject,
               focus: `Focus: Part ${taskStart}-${taskEnd}`
             });
             timeAllocatedToday += hoursForSubject;
          }
        });

        // Fill remaining time with buffer or review if under-allocated
        const actualBuffer = Math.max(0, dailyHours - timeAllocatedToday);

        schedule.push({
          day: i + 1,
          date: currentDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
          blocks,
          totalHours: Number(timeAllocatedToday.toFixed(2)),
          bufferHours: Number(actualBuffer.toFixed(2))
        });
      }

      // 5. Construct Final Plan
      const newPlan: RecoveryPlan = {
        subjects: processedSubjects,
        config: { dailyHours, stressLevel, pace },
        stats: {
          totalPressure,
          recoveryScore: Math.round(rawRecoveryScore),
          label,
          estimatedDays: Math.ceil(totalPressure / 10) // Rough heuristic estimate
        },
        schedule,
        generatedAt: new Date().toISOString()
      };

      setPlan(newPlan);
      saveToStorage(processedSubjects, newPlan);
      setStatus(CalculationStatus.COMPLETE);
    }, 1500);
  };

  // --- Render Helpers ---
  const getPaceColor = (p: LearningPace) => {
    if (p === 'Slow') return 'bg-blue-900/40 text-blue-400 border-blue-500/30';
    if (p === 'Medium') return 'bg-yellow-900/40 text-yellow-400 border-yellow-500/30';
    return 'bg-red-900/40 text-red-400 border-red-500/30';
  };

  const radialData = plan ? [{ name: 'Load', value: plan.stats.recoveryScore, fill: '#ef4444' }] : [];

  return (
    <div className="min-h-screen pt-28 pb-20 px-4 md:px-8 bg-black bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-neutral-900 via-black to-black">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* LEFT COLUMN: INPUTS */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="w-full lg:w-1/3 space-y-6"
          >
            <div className="glass-panel p-6 rounded-2xl border border-white/10 sticky top-28">
              <div className="flex items-center gap-3 mb-8 border-b border-white/5 pb-4">
                <div className="p-2 bg-red-500/10 rounded-lg">
                  <Brain className="text-red-500 w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-display font-bold text-lg text-white">Recovery Parameters</h2>
                  <p className="text-xs text-gray-500">Configure your academic context</p>
                </div>
              </div>
              
              <div className="space-y-6">
                {/* Global Settings */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] text-gray-400 uppercase font-mono mb-2 block tracking-wider">Daily Hours</label>
                    <div className="bg-white/5 rounded-lg p-2 flex items-center justify-between border border-white/5">
                      <input 
                        type="number" 
                        min="1" max="16"
                        value={dailyHours}
                        onChange={(e) => setDailyHours(parseInt(e.target.value))}
                        className="bg-transparent w-full text-white font-mono outline-none"
                      />
                      <span className="text-xs text-gray-500">hrs</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400 uppercase font-mono mb-2 block tracking-wider">Stress Level (1-10)</label>
                    <div className="bg-white/5 rounded-lg p-2 flex items-center justify-between border border-white/5">
                      <input 
                        type="number" 
                        min="1" max="10"
                        value={stressLevel}
                        onChange={(e) => setStressLevel(parseInt(e.target.value))}
                        className="bg-transparent w-full text-white font-mono outline-none"
                      />
                      <span className={`text-xs ${stressLevel > 7 ? 'text-red-500' : 'text-green-500'}`}>●</span>
                    </div>
                  </div>
                </div>

                <div>
                   <label className="text-[10px] text-gray-400 uppercase font-mono mb-2 block tracking-wider">Learning Pace</label>
                   <div className="flex gap-2">
                      {(['Slow', 'Medium', 'Fast'] as LearningPace[]).map((p) => (
                        <button
                          key={p}
                          onClick={() => setPace(p)}
                          className={`flex-1 py-2 text-xs font-medium rounded-lg border transition-all ${pace === p ? getPaceColor(p) : 'bg-white/5 border-white/5 text-gray-500 hover:bg-white/10'}`}
                        >
                          {p}
                        </button>
                      ))}
                   </div>
                </div>

                {/* Add Subject Form */}
                <div className="pt-6 border-t border-white/5">
                  <label className="text-[10px] text-gray-400 uppercase font-mono mb-3 block tracking-wider flex items-center gap-2">
                    <Layers size={12}/> Subject Breakdown
                  </label>
                  
                  <div className="space-y-3">
                    <input 
                      type="text" 
                      placeholder="Subject Name (e.g. Calculus)"
                      value={newSubName}
                      onChange={(e) => setNewSubName(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-red-500/50 transition-colors"
                    />
                    
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <label className="text-[10px] text-gray-500 mb-1 block">Units Left</label>
                        <input 
                          type="number" 
                          value={newSubUnits}
                          onChange={(e) => setNewSubUnits(parseInt(e.target.value))}
                          className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-red-500/50"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="text-[10px] text-gray-500 mb-1 block">Difficulty (1-5)</label>
                        <input 
                          type="number" 
                          min="1" max="5"
                          value={newSubDiff}
                          onChange={(e) => setNewSubDiff(parseInt(e.target.value))}
                          className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-red-500/50"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] text-gray-500 mb-1 block">Exam Date</label>
                      <input 
                        type="date"
                        value={newSubDeadline}
                        onChange={(e) => setNewSubDeadline(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-red-500/50"
                      />
                    </div>

                    <button 
                      onClick={addSubject}
                      className="w-full py-3 border border-dashed border-white/20 text-gray-400 hover:text-white hover:border-white/40 rounded-lg transition-all flex items-center justify-center gap-2 text-sm mt-2"
                    >
                      <Plus size={16} /> Add Subject to Stack
                    </button>
                  </div>
                </div>

                {/* Subject List */}
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                  <AnimatePresence>
                    {subjects.map((s) => (
                      <motion.div 
                        key={s.id}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="flex justify-between items-center bg-neutral-900/50 p-3 rounded-lg border border-white/5 group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }}></div>
                          <div>
                            <p className="text-sm font-medium text-gray-200">{s.name}</p>
                            <p className="text-[10px] text-gray-500 flex gap-2">
                              <span>{s.units} units</span>
                              <span>•</span>
                              <span>Lvl {s.difficulty}</span>
                            </p>
                          </div>
                        </div>
                        <button onClick={() => removeSubject(s.id)} className="text-gray-600 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                          <Trash2 size={14} />
                        </button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>

                <button 
                  onClick={generatePlan}
                  disabled={status === CalculationStatus.CALCULATING || subjects.length === 0}
                  className="w-full bg-gradient-to-r from-red-700 to-red-900 hover:from-red-600 hover:to-red-800 text-white font-bold py-4 rounded-xl shadow-lg shadow-red-900/20 transition-all flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02]"
                >
                  {status === CalculationStatus.CALCULATING ? (
                    <>
                      <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                      Optimizing Schedule...
                    </>
                  ) : (
                    <>
                      <Zap size={18} fill="currentColor" /> Generate Recovery Plan
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>

          {/* RIGHT COLUMN: RESULTS */}
          <div className="w-full lg:w-2/3">
            <AnimatePresence mode='wait'>
              {status === CalculationStatus.COMPLETE && plan ? (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  {/* Top Stats Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="glass-panel p-5 rounded-xl border border-white/10 relative overflow-hidden">
                       <div className="flex justify-between items-start mb-2">
                         <h3 className="text-gray-400 text-xs font-mono uppercase">Recovery Load</h3>
                         <Activity size={16} className="text-red-500" />
                       </div>
                       <div className="flex items-end gap-2">
                          <span className="text-4xl font-display font-bold text-white">{plan.stats.recoveryScore}</span>
                          <span className="text-sm text-gray-500 mb-1">/ 100</span>
                       </div>
                       <p className={`text-xs mt-2 font-medium ${plan.stats.recoveryScore > 60 ? 'text-red-400' : 'text-green-400'}`}>
                         {plan.stats.label}
                       </p>
                       <div className="absolute -right-4 -bottom-4 opacity-10">
                          <RadialBarChart width={100} height={100} innerRadius="80%" outerRadius="100%" data={radialData} startAngle={90} endAngle={-270}>
                            <RadialBar dataKey="value" cornerRadius={10} />
                          </RadialBarChart>
                       </div>
                    </div>

                    <div className="glass-panel p-5 rounded-xl border border-white/10">
                       <div className="flex justify-between items-start mb-2">
                         <h3 className="text-gray-400 text-xs font-mono uppercase">Est. Completion</h3>
                         <Calendar size={16} className="text-orange-500" />
                       </div>
                       <div className="flex items-end gap-2">
                          <span className="text-4xl font-display font-bold text-white">{plan.stats.estimatedDays}</span>
                          <span className="text-sm text-gray-500 mb-1">Days</span>
                       </div>
                       <p className="text-xs mt-2 text-gray-500">Based on {pace} pace</p>
                    </div>

                    <div className="glass-panel p-5 rounded-xl border border-white/10">
                       <div className="flex justify-between items-start mb-2">
                         <h3 className="text-gray-400 text-xs font-mono uppercase">Daily Commitment</h3>
                         <Clock size={16} className="text-blue-500" />
                       </div>
                       <div className="flex items-end gap-2">
                          <span className="text-4xl font-display font-bold text-white">{dailyHours}</span>
                          <span className="text-sm text-gray-500 mb-1">Hours</span>
                       </div>
                       <p className="text-xs mt-2 text-gray-500">Includes 10% buffer time</p>
                    </div>
                  </div>

                  {/* Prioritized Subject List */}
                  <div className="glass-panel p-6 rounded-xl border border-white/10">
                    <h3 className="font-display text-lg font-bold text-white mb-4">Prioritized Workload</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {plan.subjects.map((s, idx) => (
                        <div key={s.id} className="bg-white/5 p-4 rounded-lg border border-white/5 relative overflow-hidden">
                          <div className="absolute top-0 left-0 bottom-0 w-1" style={{ backgroundColor: s.color }}></div>
                          <div className="flex justify-between items-start mb-2">
                             <span className="text-xs font-mono text-gray-500">PRIORITY {idx + 1}</span>
                             {idx === 0 && <span className="text-[10px] bg-red-500/20 text-red-400 px-1.5 rounded">URGENT</span>}
                          </div>
                          <h4 className="text-white font-medium truncate">{s.name}</h4>
                          <div className="mt-3 flex justify-between items-center text-xs text-gray-400">
                             <span>Pressure Score</span>
                             <span className="font-mono text-white">{Math.round(s.pressureScore || 0)}</span>
                          </div>
                          <div className="w-full bg-gray-800 h-1 mt-2 rounded-full overflow-hidden">
                             <div 
                               className="h-full rounded-full transition-all duration-1000" 
                               style={{ width: `${Math.min(((s.pressureScore || 0) / 100) * 100, 100)}%`, backgroundColor: s.color }}
                             ></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 7-Day Schedule Grid */}
                  <div className="space-y-4">
                     <div className="flex justify-between items-end">
                       <h3 className="font-display text-2xl font-bold text-white">7-Day Execution Plan</h3>
                       <button onClick={generatePlan} className="text-xs flex items-center gap-1 text-gray-500 hover:text-white transition-colors">
                         <RefreshCw size={12}/> Regenerate
                       </button>
                     </div>
                     
                     <div className="grid grid-cols-1 gap-4">
                       {plan.schedule.map((day, idx) => (
                         <motion.div 
                           key={day.day}
                           initial={{ opacity: 0, y: 10 }}
                           animate={{ opacity: 1, y: 0 }}
                           transition={{ delay: idx * 0.05 }}
                           className="glass-panel border border-white/5 rounded-xl overflow-hidden hover:border-white/20 transition-colors"
                         >
                            <div className="flex flex-col md:flex-row">
                               {/* Date Column */}
                               <div className="p-4 bg-white/5 min-w-[120px] flex flex-row md:flex-col items-center justify-between md:justify-center text-center border-b md:border-b-0 md:border-r border-white/5">
                                  <span className="text-xs font-mono text-gray-500 uppercase">Day {day.day}</span>
                                  <span className="text-lg font-bold text-white md:my-1">{day.date.split(',')[0]}</span>
                                  <span className="text-xs text-gray-400">{day.date.split(',')[1]}</span>
                               </div>

                               {/* Blocks */}
                               <div className="p-4 flex-1">
                                  {day.blocks.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                      {day.blocks.map((block, bIdx) => {
                                        const subjectColor = subjects.find(s => s.id === block.subjectId)?.color || '#666';
                                        return (
                                          <div key={bIdx} className="bg-neutral-900 rounded-lg p-3 border border-white/5 flex items-start gap-3">
                                             <div className="w-1 h-8 rounded-full mt-1" style={{ backgroundColor: subjectColor }}></div>
                                             <div className="overflow-hidden">
                                                <h5 className="text-sm font-medium text-gray-200 truncate">{block.subjectName}</h5>
                                                <p className="text-xs text-gray-500 mt-0.5">{block.focus}</p>
                                                <div className="mt-2 text-[10px] font-mono text-gray-400 bg-white/5 inline-block px-1.5 rounded">
                                                   {block.duration} hrs
                                                </div>
                                             </div>
                                          </div>
                                        );
                                      })}
                                      {day.bufferHours > 0 && (
                                        <div className="bg-green-900/10 border border-green-500/20 rounded-lg p-3 flex flex-col justify-center items-center text-center">
                                           <span className="text-green-500 text-xs font-bold uppercase tracking-wider mb-1">Buffer Time</span>
                                           <span className="text-white text-sm font-mono">{day.bufferHours} hrs</span>
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="h-full flex items-center justify-center text-gray-600 text-sm italic">
                                      Rest Day or Review
                                    </div>
                                  )}
                               </div>
                            </div>
                         </motion.div>
                       ))}
                     </div>
                  </div>

                </motion.div>
              ) : (
                <div className="h-full min-h-[500px] flex flex-col items-center justify-center text-center p-8">
                  {status === CalculationStatus.CALCULATING ? (
                     <div className="flex flex-col items-center">
                       <div className="w-16 h-16 border-4 border-red-900 border-t-red-500 rounded-full animate-spin mb-6"></div>
                       <h3 className="text-xl font-bold text-white mb-2">Analyzing Workload</h3>
                       <p className="text-gray-500">Calculating pressure scores and optimizing timeline...</p>
                     </div>
                  ) : (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="max-w-md"
                    >
                      <div className="bg-white/5 p-8 rounded-full inline-block mb-8 shadow-2xl shadow-red-900/20">
                        <BarChart2 size={64} className="text-gray-600" />
                      </div>
                      <h2 className="text-3xl font-display font-bold text-white mb-4">Engine Standby</h2>
                      <p className="text-gray-400 leading-relaxed mb-8">
                        Configure your subjects and available hours on the left to initialize the recovery algorithm. We will generate a step-by-step plan to get you back on track.
                      </p>
                      <div className="flex gap-4 justify-center text-xs text-gray-600 font-mono uppercase tracking-widest">
                        <span>• Weighted Ranking</span>
                        <span>• Adaptive Pace</span>
                        <span>• Stress Buffers</span>
                      </div>
                    </motion.div>
                  )}
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Engine;