import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Save, RotateCcw, Cpu, Calendar, Clock, AlertTriangle, Activity } from 'lucide-react';
import { ResponsiveContainer, RadialBarChart, RadialBar, Legend, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import { Subject, RecoveryPlan, DailySchedule, CalculationStatus } from '../types';

const Engine: React.FC = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [newSubject, setNewSubject] = useState('');
  const [chapters, setChapters] = useState(1);
  const [priority, setPriority] = useState(3);
  
  const [deadline, setDeadline] = useState('');
  const [dailyHours, setDailyHours] = useState(4);
  const [stressLevel, setStressLevel] = useState(5);
  
  const [status, setStatus] = useState<CalculationStatus>(CalculationStatus.IDLE);
  const [plan, setPlan] = useState<RecoveryPlan | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('recap_plan');
    if (saved) {
      setPlan(JSON.parse(saved));
    }
    const savedSubjects = localStorage.getItem('recap_subjects');
    if (savedSubjects) {
      setSubjects(JSON.parse(savedSubjects));
    }
  }, []);

  const addSubject = () => {
    if (!newSubject) return;
    const sub: Subject = {
      id: Math.random().toString(36).substr(2, 9),
      name: newSubject,
      chapters: chapters,
      priority: priority
    };
    const updated = [...subjects, sub];
    setSubjects(updated);
    setNewSubject('');
    setChapters(1);
    localStorage.setItem('recap_subjects', JSON.stringify(updated));
  };

  const removeSubject = (id: string) => {
    const updated = subjects.filter(s => s.id !== id);
    setSubjects(updated);
    localStorage.setItem('recap_subjects', JSON.stringify(updated));
  };

  const calculateRecovery = () => {
    if (subjects.length === 0 || !deadline) return;
    
    setStatus(CalculationStatus.CALCULATING);
    
    setTimeout(() => {
      const examDate = new Date(deadline);
      const today = new Date();
      const diffTime = Math.abs(examDate.getTime() - today.getTime());
      const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (daysLeft <= 0) {
        setStatus(CalculationStatus.IDLE);
        alert("Deadline must be in the future.");
        return;
      }

      const totalChapters = subjects.reduce((acc, s) => acc + s.chapters, 0);
      const totalHoursAvailable = daysLeft * dailyHours;
      const hoursNeeded = totalChapters * 2; 

      const pressureScore = Math.min((hoursNeeded / totalHoursAvailable) * 100, 100);
      const urgencyScore = Math.min((10 / daysLeft) * 100, 100);
      
      const rawScore = (pressureScore * 0.5) + (urgencyScore * 0.3) + (stressLevel * 2);
      const finalScore = Math.min(Math.round(rawScore), 100);
      
      let level: 'Low' | 'Moderate' | 'High' | 'Critical' = 'Low';
      if (finalScore > 30) level = 'Moderate';
      if (finalScore > 60) level = 'High';
      if (finalScore > 85) level = 'Critical';

      // Generate Schedule
      const schedule: DailySchedule[] = [];
      const sortedSubjects = [...subjects].sort((a, b) => b.priority - a.priority);
      
      let subjectIndex = 0;
      for (let i = 0; i < 7; i++) {
        if (i >= daysLeft) break;
        
        const daySubjects = [];
        let dayLoad = 0;
        
        while (dayLoad < 3 && subjectIndex < sortedSubjects.length) {
          daySubjects.push(sortedSubjects[subjectIndex].name);
          dayLoad++;
          subjectIndex = (subjectIndex + 1) % sortedSubjects.length; 
        }

        schedule.push({
          day: i + 1,
          tasks: daySubjects.length ? daySubjects : ["Review & Buffer"],
          focus: daySubjects.length ? "New Content" : "Revision",
          hours: dailyHours
        });
      }

      const generatedPlan: RecoveryPlan = {
        subjects,
        deadline,
        dailyHours,
        stressLevel,
        score: finalScore,
        level,
        generatedDate: new Date().toISOString(),
        dailySchedule: schedule
      };

      setPlan(generatedPlan);
      localStorage.setItem('recap_plan', JSON.stringify(generatedPlan));
      setStatus(CalculationStatus.COMPLETE);
    }, 2000);
  };

  const chartData = plan ? [
    { name: 'Recovery Score', value: plan.score, fill: '#dc2626' },
  ] : [];

  return (
    <div className="min-h-screen pt-24 pb-20 px-4 md:px-8 bg-black bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-neutral-900 to-black">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row gap-8">
          
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="w-full md:w-1/3 space-y-6"
          >
            <div className="glass-panel p-6 rounded-xl border border-white/10">
              <div className="flex items-center gap-2 mb-6">
                <Cpu className="text-red-500" />
                <h2 className="font-display font-bold text-xl text-white">Your Workload</h2>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-gray-500 uppercase font-mono mb-1 block">When is the deadline?</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-2.5 text-gray-500 w-4 h-4" />
                    <input 
                      type="date" 
                      value={deadline}
                      onChange={(e) => setDeadline(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-lg py-2 pl-10 pr-4 text-white focus:outline-none focus:border-red-500 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-gray-500 uppercase font-mono mb-1 block">Hours Available Per Day</label>
                  <div className="flex items-center gap-4">
                    <input 
                      type="range" 
                      min="1" max="12" 
                      value={dailyHours}
                      onChange={(e) => setDailyHours(parseInt(e.target.value))}
                      className="w-full accent-red-600 h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer"
                    />
                    <span className="text-white font-mono w-12 text-right">{dailyHours}h</span>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-gray-500 uppercase font-mono mb-1 block">Stress Level (1-10)</label>
                  <div className="flex items-center gap-4">
                    <input 
                      type="range" 
                      min="1" max="10" 
                      value={stressLevel}
                      onChange={(e) => setStressLevel(parseInt(e.target.value))}
                      className="w-full accent-red-600 h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer"
                    />
                    <span className="text-white font-mono w-12 text-right">{stressLevel}</span>
                  </div>
                </div>
              </div>

              <div className="mt-8 border-t border-white/5 pt-6">
                <h3 className="text-sm font-semibold text-white mb-4">Add Your Subjects</h3>
                <div className="flex gap-2 mb-4">
                  <input 
                    type="text" 
                    placeholder="Subject Name"
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 text-sm text-white focus:outline-none focus:border-red-500"
                  />
                  <input 
                    type="number" 
                    placeholder="Ch"
                    value={chapters}
                    onChange={(e) => setChapters(parseInt(e.target.value))}
                    className="w-16 bg-white/5 border border-white/10 rounded-lg px-2 text-sm text-white focus:outline-none focus:border-red-500"
                  />
                  <button 
                    onClick={addSubject}
                    className="bg-red-600/20 text-red-500 border border-red-500/50 p-2 rounded-lg hover:bg-red-600 hover:text-white transition-all"
                  >
                    <Plus size={18} />
                  </button>
                </div>
                
                <div className="max-h-48 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                  <AnimatePresence>
                    {subjects.map((s) => (
                      <motion.div 
                        key={s.id}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="flex justify-between items-center bg-white/5 p-3 rounded-lg border border-white/5 group"
                      >
                        <div>
                          <p className="text-sm font-medium text-gray-200">{s.name}</p>
                          <p className="text-xs text-gray-500">{s.chapters} Chapters</p>
                        </div>
                        <button onClick={() => removeSubject(s.id)} className="text-gray-600 hover:text-red-500 transition-colors">
                          <Trash2 size={16} />
                        </button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  {subjects.length === 0 && (
                    <p className="text-xs text-center text-gray-600 py-4">No subjects added yet.</p>
                  )}
                </div>
              </div>

              <button 
                onClick={calculateRecovery}
                disabled={status === CalculationStatus.CALCULATING}
                className="w-full mt-6 bg-red-700 hover:bg-red-600 text-white font-bold py-3 rounded-lg transition-all flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {status === CalculationStatus.CALCULATING ? (
                  <>
                    <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                    Thinking...
                  </>
                ) : (
                  <>
                    <Activity size={18} /> Generate My Plan
                  </>
                )}
              </button>
            </div>
          </motion.div>

          <div className="w-full md:w-2/3">
            <AnimatePresence mode='wait'>
              {status === CalculationStatus.COMPLETE && plan ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="space-y-6"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="glass-panel p-6 rounded-xl border border-white/10 flex flex-col items-center justify-center relative overflow-hidden">
                      <h3 className="absolute top-6 left-6 text-sm font-semibold text-gray-400">Challenge Level</h3>
                      <div className="h-64 w-full flex items-center justify-center relative">
                        <ResponsiveContainer width="100%" height="100%">
                          <RadialBarChart innerRadius="70%" outerRadius="100%" data={chartData} startAngle={180} endAngle={0}>
                            <RadialBar background dataKey="value" cornerRadius={30} />
                            <Legend iconSize={10} layout="vertical" verticalAlign="middle" />
                          </RadialBarChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pt-10">
                          <span className="text-5xl font-display font-bold text-white">{plan.score}</span>
                          <span className={`text-sm font-bold uppercase tracking-wider mt-2 ${plan.level === 'Critical' ? 'text-red-500' : plan.level === 'High' ? 'text-orange-500' : 'text-green-500'}`}>
                            {plan.level} Load
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="glass-panel p-6 rounded-xl border border-white/10">
                      <h3 className="text-sm font-semibold text-gray-400 mb-6">Workload Distribution</h3>
                      <div className="h-56">
                        <ResponsiveContainer width="100%" height="100%">
                           <BarChart data={subjects}>
                             <XAxis dataKey="name" stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                             <YAxis stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                             <Tooltip 
                               contentStyle={{ backgroundColor: '#000', border: '1px solid #333', borderRadius: '8px' }}
                               itemStyle={{ color: '#fff' }}
                             />
                             <Bar dataKey="chapters" fill="#991B1B" radius={[4, 4, 0, 0]}>
                               {subjects.map((entry, index) => (
                                 <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#DC2626' : '#991B1B'} />
                               ))}
                             </Bar>
                           </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>

                  <div className="glass-panel p-8 rounded-xl border border-white/10">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="font-display text-xl font-bold text-white">Your 7-Day Schedule</h3>
                      <span className="text-xs font-mono text-gray-500 bg-white/5 px-2 py-1 rounded">BUFFER INCLUDED</span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
                      {plan.dailySchedule.map((day) => (
                        <div key={day.day} className="bg-white/5 rounded-lg p-3 border border-white/5 hover:border-red-500/30 transition-colors">
                          <div className="text-xs text-gray-500 font-mono mb-2">DAY 0{day.day}</div>
                          <div className="space-y-1">
                            {day.tasks.map((task, i) => (
                              <div key={i} className="text-xs font-medium text-white truncate bg-red-900/20 px-1.5 py-0.5 rounded border border-red-500/10">
                                {task}
                              </div>
                            ))}
                          </div>
                          <div className="mt-3 text-[10px] text-gray-400 flex items-center gap-1">
                            <Clock size={10} /> {day.hours}h Focus
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                </motion.div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-12 glass-panel rounded-xl border border-white/5 border-dashed min-h-[500px]">
                  {status === CalculationStatus.CALCULATING ? (
                     <div className="flex flex-col items-center">
                       <span className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600 mb-4"></span>
                       <p className="text-gray-400 animate-pulse">Running the numbers...</p>
                     </div>
                  ) : (
                    <>
                      <div className="bg-white/5 p-6 rounded-full mb-6 text-gray-600">
                        <AlertTriangle size={48} />
                      </div>
                      <h3 className="text-xl font-bold text-white mb-2">Ready to Start?</h3>
                      <p className="text-gray-500 max-w-sm">
                        Enter your deadlines and subjects on the left. We'll generate a custom survival strategy for you.
                      </p>
                    </>
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