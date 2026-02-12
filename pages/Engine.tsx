import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Calendar, Clock, BookOpen, AlertCircle, CheckCircle2, ArrowRight, Layers, Activity, Brain, AlertTriangle, TrendingUp, BarChart, Zap, Gauge, ListOrdered, Flag, Target, Star, PieChart, Hourglass, Coffee, RefreshCcw, Book, CalendarDays, RotateCcw, Save, Check } from 'lucide-react';
import { Subject, StudentProfile, DifficultyLevel, StressLevel, LearningPace, CalculationStatus, PressureCategory, RecoveryMetrics, PriorityTier, AllocationMetrics, WeeklyPlan, DayPlan, PlanTask, TaskType, EngineResults, RecoverySession } from '../types';

const Engine: React.FC = () => {
  // --- Centralized State ---
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [studentProfile, setStudentProfile] = useState<StudentProfile>({
    availableHoursPerDay: 4,
    learningPace: 'Moderate',
    stressLevel: 'Moderate'
  });
  
  // Results State (Persisted)
  const [results, setResults] = useState<EngineResults | null>(null);
  
  // UI State
  const [status, setStatus] = useState<CalculationStatus>(CalculationStatus.INVALID);
  const [isLoaded, setIsLoaded] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // --- Persistence Logic ---
  const SESSION_KEY = 'recap_recovery_session_v1';

  // Load Session
  useEffect(() => {
    const savedSession = localStorage.getItem(SESSION_KEY);
    if (savedSession) {
      try {
        const parsed: RecoverySession = JSON.parse(savedSession);
        if (parsed.subjects) setSubjects(parsed.subjects);
        if (parsed.profile) setStudentProfile(parsed.profile);
        if (parsed.results) setResults(parsed.results);
        setLastSaved(new Date().toLocaleTimeString());
      } catch (e) {
        console.error("Failed to load session", e);
      }
    }
    setIsLoaded(true);
  }, []);

  // Save Session (Debounced/Effect)
  useEffect(() => {
    if (!isLoaded) return;
    
    const session: RecoverySession = {
      subjects,
      profile: studentProfile,
      results
    };
    
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    setLastSaved(new Date().toLocaleTimeString());
  }, [subjects, studentProfile, results, isLoaded]);

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

  // --- Logic Functions (Pure-ish) ---
  
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

  const calculateRecoveryDifficulty = (enhancedSubjects: Subject[], profile: StudentProfile): RecoveryMetrics => {
    const totalPressure = enhancedSubjects.reduce((acc, curr) => acc + (curr.pressureScore || 0), 0);
    const weeklyCapacity = profile.availableHoursPerDay * 7;
    const loadRatio = totalPressure / weeklyCapacity;
    let difficultyScore = Math.round(loadRatio * 50);
    difficultyScore = Math.min(difficultyScore, 100);

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

  const prioritizeSubjects = (scoredSubjects: Subject[]): Subject[] => {
    const sorted = [...scoredSubjects].sort((a, b) => (b.pressureScore || 0) - (a.pressureScore || 0));
    const total = sorted.length;

    return sorted.map((sub, index) => {
      const rank = index + 1;
      const percentile = index / total;

      let tier: PriorityTier = 'Low Priority';
      if (percentile < 0.30) tier = 'Critical Priority';
      else if (percentile < 0.60) tier = 'High Priority';
      else if (percentile < 0.85) tier = 'Medium Priority';

      let explanation = "Maintain consistent study habits.";
      const urgencyHigh = (sub.urgencyScore || 0) >= 0.8;
      const urgencyLow = (sub.urgencyScore || 0) <= 0.2;
      const backlogHigh = sub.backlogChapters >= 8;
      const backlogLow = sub.backlogChapters <= 3;
      const diffHigh = sub.difficulty === 'High';

      if (tier === 'Critical Priority') {
        if (urgencyHigh && backlogHigh) explanation = "High deadline pressure with significant backlog.";
        else if (urgencyHigh) explanation = "Immediate deadline demanding urgent focus.";
        else if (diffHigh) explanation = "Complex material requires extra preparation time.";
        else explanation = "Critical combination of factors requires immediate attention.";
      } else if (tier === 'High Priority') {
        if (backlogHigh) explanation = "Large volume of work needs steady chipping away.";
        else if (urgencyHigh) explanation = "Deadline approaching; prioritize over lighter tasks.";
        else explanation = "Important subject requiring structured effort.";
      } else if (tier === 'Medium Priority') {
         explanation = "Moderate urgency; fit into schedule gaps.";
      } else {
         if (urgencyLow && backlogLow) explanation = "Low immediate pressure; manageable quickly.";
         else explanation = "Lower priority; schedule when energy is lower.";
      }

      return {
        ...sub,
        priorityRank: rank,
        priorityTier: tier,
        priorityExplanation: explanation
      };
    });
  };

  const allocateTime = (subjects: Subject[], profile: StudentProfile): { allocatedSubjects: Subject[], metrics: AllocationMetrics } => {
    let bufferRate = 0.10; 
    if (profile.stressLevel === 'High') bufferRate = 0.15;
    
    const bufferTime = Math.round((profile.availableHoursPerDay * bufferRate) * 100) / 100;
    const usableHours = profile.availableHoursPerDay - bufferTime;

    let minPerSubject = 0.5;
    if (profile.learningPace === 'Fast') minPerSubject = 0.25;
    if (profile.learningPace === 'Slow') minPerSubject = 0.75;

    const maxPerSubject = profile.availableHoursPerDay * 0.5;
    const totalPressure = subjects.reduce((acc, s) => acc + (s.pressureScore || 0), 0);
    
    let allocations = subjects.map(s => {
      const ratio = (s.pressureScore || 0) / totalPressure;
      let rawHours = ratio * usableHours;
      return { ...s, tempHours: rawHours };
    });

    allocations = allocations.map(s => {
      let h = s.tempHours;
      if (h < minPerSubject) h = minPerSubject;
      if (h > maxPerSubject) h = maxPerSubject;
      return { ...s, tempHours: h };
    });

    const currentTotal = allocations.reduce((acc, s) => acc + s.tempHours, 0);
    if (currentTotal > usableHours) {
       const scaleFactor = usableHours / currentTotal;
       allocations = allocations.map(s => ({
         ...s,
         tempHours: s.tempHours * scaleFactor
       }));
    }

    let finalAllocations = allocations.map(s => {
      let rounded = Math.round(s.tempHours * 4) / 4;
      if (rounded < 0.25 && s.tempHours > 0) rounded = 0.25; 
      return { ...s, allocatedHours: rounded };
    });

    finalAllocations.sort((a, b) => (a.priorityRank || 0) - (b.priorityRank || 0));

    let finalSum = finalAllocations.reduce((acc, s) => acc + (s.allocatedHours || 0), 0);
    let diff = finalSum - usableHours;

    if (diff > 0) {
       for (let i = finalAllocations.length - 1; i >= 0; i--) {
          if (diff <= 0.01) break;
          const sub = finalAllocations[i];
          if ((sub.allocatedHours || 0) >= 0.25) {
             sub.allocatedHours = (sub.allocatedHours || 0) - 0.25;
             diff -= 0.25;
          }
       }
    }

    finalSum = finalAllocations.reduce((acc, s) => acc + (s.allocatedHours || 0), 0);
    const remainingTime = Math.max(0, profile.availableHoursPerDay - finalSum - bufferTime);
    
    const resultSubjects = finalAllocations.map(s => ({
      ...s,
      allocationPercentage: Math.round(((s.allocatedHours || 0) / profile.availableHoursPerDay) * 100)
    }));

    const maxSubject = resultSubjects.reduce((prev, current) => 
      (prev.allocatedHours || 0) > (current.allocatedHours || 0) ? prev : current
    );

    let message = "Your schedule is optimized for efficiency.";
    if (profile.stressLevel === 'High') message = "Your workload has been adjusted to prevent burnout.";
    else if (remainingTime > 0.5) message = "You have extra free time today. Use it wisely!";

    return {
      allocatedSubjects: resultSubjects,
      metrics: {
        totalAllocated: parseFloat(finalSum.toFixed(2)),
        bufferTime: parseFloat(bufferTime.toFixed(2)),
        remainingTime: parseFloat(remainingTime.toFixed(2)),
        maxSubjectName: maxSubject.name,
        isBalanced: (maxSubject.allocatedHours || 0) <= profile.availableHoursPerDay * 0.4,
        message
      }
    };
  };

  const generateWeeklyPlan = (subjects: Subject[], profile: StudentProfile): WeeklyPlan => {
    const dayProfiles = [
      { id: 1, label: 'Mon', intensity: 'Moderate' as const, multiplier: 1.0 },
      { id: 2, label: 'Tue', intensity: 'Moderate' as const, multiplier: 1.0 },
      { id: 3, label: 'Wed', intensity: 'High' as const, multiplier: 1.1 },
      { id: 4, label: 'Thu', intensity: 'High' as const, multiplier: 1.1 },
      { id: 5, label: 'Fri', intensity: 'Moderate' as const, multiplier: 0.9 },
      { id: 6, label: 'Sat', intensity: 'Light' as const, multiplier: 0.7 },
      { id: 7, label: 'Sun', intensity: 'Recovery' as const, multiplier: 0.5 },
    ];

    const weeklyPlan: DayPlan[] = dayProfiles.map(p => ({
      dayNumber: p.id,
      label: p.label,
      intensity: p.intensity,
      tasks: [],
      totalMinutes: 0,
      bufferMinutes: 0
    }));

    const getFrequency = (tier?: PriorityTier) => {
      let freq = 3;
      if (tier === 'Critical Priority') freq = 6;
      else if (tier === 'High Priority') freq = 5;
      else if (tier === 'Medium Priority') freq = 4;
      else freq = 3;

      if (profile.stressLevel === 'High' && freq > 3) freq -= 1;
      return freq;
    };
    
    const getTargetDays = (freq: number) => {
      if (freq >= 7) return [0,1,2,3,4,5,6];
      if (freq === 6) return [0,1,2,3,4,5]; 
      if (freq === 5) return [0,1,2,3,4]; 
      if (freq === 4) return [0,1,2,3]; 
      if (freq === 3) return [0,2,4]; 
      if (freq === 2) return [1,3]; 
      return [0];
    };

    subjects.forEach(sub => {
      if (!sub.allocatedHours || sub.allocatedHours <= 0) return;

      const freq = getFrequency(sub.priorityTier);
      const totalWeeklyMinutes = sub.allocatedHours * 7 * 60;
      const targetDays = getTargetDays(freq);
      
      const minutesPerSession = Math.floor(totalWeeklyMinutes / freq);

      targetDays.forEach(dayIndex => {
        const day = weeklyPlan[dayIndex];
        
        if (minutesPerSession > 90) {
           const deepWork = Math.floor(minutesPerSession * 0.6);
           const revision = minutesPerSession - deepWork;
           
           day.tasks.push({
             id: crypto.randomUUID(),
             subjectId: sub.id,
             subjectName: sub.name,
             type: 'Deep Work',
             durationMinutes: deepWork,
             color: sub.urgencyColor || 'text-gray-500',
             isCompleted: false
           });
           
           day.tasks.push({
             id: crypto.randomUUID(),
             subjectId: sub.id,
             subjectName: sub.name,
             type: 'Revision',
             durationMinutes: revision,
             color: sub.urgencyColor || 'text-gray-500',
             isCompleted: false
           });
        } else {
           day.tasks.push({
             id: crypto.randomUUID(),
             subjectId: sub.id,
             subjectName: sub.name,
             type: minutesPerSession < 40 ? 'Practice' : 'Deep Work',
             durationMinutes: minutesPerSession,
             color: sub.urgencyColor || 'text-gray-500',
             isCompleted: false
           });
        }
        
        day.totalMinutes += minutesPerSession;
      });
    });

    weeklyPlan.forEach((day, index) => {
      const profile = dayProfiles[index];
      const dailyCapMinutes = studentProfile.availableHoursPerDay * 60 * profile.multiplier;
      
      const bufferMins = Math.max(15, dailyCapMinutes - day.totalMinutes);
      
      if (bufferMins > 20) {
        day.tasks.push({
          id: 'buffer-' + day.dayNumber,
          subjectId: 'system-buffer',
          subjectName: 'Flexible Recovery',
          type: 'Buffer',
          durationMinutes: Math.floor(bufferMins),
          color: 'text-gray-500',
          isCompleted: false
        });
        day.bufferMinutes = Math.floor(bufferMins);
        day.totalMinutes += Math.floor(bufferMins);
      }
    });

    const totalBacklog = subjects.reduce((acc, s) => acc + s.backlogChapters, 0);
    const weeklyHours = weeklyPlan.reduce((acc, d) => acc + d.totalMinutes, 0) / 60;
    const estimatedVelocity = weeklyHours * 0.6; 
    const estimatedRecoveryDays = Math.ceil((totalBacklog / estimatedVelocity) * 7);

    const highestDay = weeklyPlan.reduce((max, d) => d.totalMinutes > max ? d.totalMinutes : max, 0);

    return {
      days: weeklyPlan,
      totalWeeklyHours: parseFloat(weeklyHours.toFixed(1)),
      estimatedRecoveryDays,
      highestDay
    };
  };

  // --- Centralized Generation Function (Step 7) ---
  const runRecoveryEngine = useCallback(() => {
    setIsGenerating(true);
    
    // Simulate slight delay for "Processing" feel
    setTimeout(() => {
        // Pipeline
        const timeMetrics = calculateDeadlineMetrics(subjects);
        const pressureMetrics = calculatePressureMetrics(timeMetrics, studentProfile);
        
        let prioritized: Subject[] = [];
        let recovery: RecoveryMetrics | null = null;
        let allocation: { allocatedSubjects: Subject[], metrics: AllocationMetrics } | null = null;
        let plan: WeeklyPlan | null = null;

        if (subjects.length > 0) {
            prioritized = prioritizeSubjects(pressureMetrics);
            recovery = calculateRecoveryDifficulty(pressureMetrics, studentProfile);
            allocation = allocateTime(prioritized, studentProfile);
            if (allocation) {
                plan = generateWeeklyPlan(allocation.allocatedSubjects, studentProfile);
            }
        }

        if (prioritized && recovery && allocation && plan) {
            setResults({
                prioritizedSubjects: allocation.allocatedSubjects,
                recoveryMetrics: recovery,
                allocationData: allocation,
                weeklyPlan: plan,
                generatedAt: new Date().toISOString()
            });
            // Scroll to results
            window.scrollTo({ top: 800, behavior: 'smooth' });
        }
        
        setIsGenerating(false);
    }, 800);
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
    setResults(null); // Clear calculated outputs
  };

  const removeSubject = (id: string) => {
    setSubjects(subjects.filter(s => s.id !== id));
    setResults(null);
  };

  const updateSubjectField = (id: string, field: keyof Subject, value: any) => {
    setSubjects(subjects.map(sub => {
      if (sub.id === id) {
        if (field === 'backlogChapters' && value < 1) value = 1;
        return { ...sub, [field]: value };
      }
      return sub;
    }));
    setResults(null); // Clear calculated outputs
  };

  const updateStudentProfile = (field: keyof StudentProfile, value: any) => {
    if (field === 'availableHoursPerDay' && value < 1) value = 1;
    if (field === 'availableHoursPerDay' && value > 24) value = 24;
    setStudentProfile(prev => ({ ...prev, [field]: value }));
    setResults(null); // Clear calculated outputs
  };

  const resetSession = () => {
    if (confirm("Are you sure? This will clear all subjects and plans.")) {
        setSubjects([]);
        setStudentProfile({
            availableHoursPerDay: 4,
            learningPace: 'Moderate',
            stressLevel: 'Moderate'
        });
        setResults(null);
        localStorage.removeItem(SESSION_KEY);
        setStatus(CalculationStatus.INVALID);
    }
  };

  // Reactive analysis for input list only (Phase 2 & 3 visuals)
  const analyzedSubjects = useMemo(() => {
    const timeMetrics = calculateDeadlineMetrics(subjects);
    return calculatePressureMetrics(timeMetrics, studentProfile);
  }, [subjects, studentProfile]);

  // Helpers
  const difficultyOptions: DifficultyLevel[] = ['Low', 'Moderate', 'High'];
  const stressOptions: StressLevel[] = ['Low', 'Moderate', 'High'];
  const paceOptions: LearningPace[] = ['Slow', 'Moderate', 'Fast'];
  
  // Visual Helpers
  const CircularProgress = ({ score, color }: { score: number, color: string }) => {
    const radius = 50;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (score / 100) * circumference;
    const getColorHex = (c: string) => {
      if (c.includes('red')) return '#DC2626';
      if (c.includes('orange')) return '#F97316';
      if (c.includes('yellow')) return '#EAB308';
      return '#10B981';
    };
    return (
      <div className="relative w-40 h-40 flex items-center justify-center">
        <svg className="transform -rotate-90 w-full h-full">
          <circle cx="80" cy="80" r={radius} stroke="#1f2937" strokeWidth="8" fill="transparent" />
          <motion.circle initial={{ strokeDashoffset: circumference }} animate={{ strokeDashoffset }} transition={{ duration: 1, ease: "easeOut" }} cx="80" cy="80" r={radius} stroke={getColorHex(color)} strokeWidth="8" fill="transparent" strokeDasharray={circumference} strokeLinecap="round" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-display font-bold text-white">{score}</span>
          <span className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">Difficulty</span>
        </div>
      </div>
    );
  };

  const getTierStyles = (tier?: PriorityTier) => {
    switch (tier) {
      case 'Critical Priority': return 'border-red-500/50 bg-red-900/10 shadow-[0_0_15px_rgba(220,38,38,0.15)]';
      case 'High Priority': return 'border-orange-500/50 bg-orange-900/10';
      case 'Medium Priority': return 'border-yellow-500/50 bg-yellow-900/10';
      default: return 'border-white/10 bg-white/5';
    }
  };

  const getTierBadgeColor = (tier?: PriorityTier) => {
    switch (tier) {
      case 'Critical Priority': return 'bg-red-500 text-white';
      case 'High Priority': return 'bg-orange-500 text-white';
      case 'Medium Priority': return 'bg-yellow-500 text-black';
      default: return 'bg-gray-700 text-gray-300';
    }
  };

  const getTaskIcon = (type: TaskType) => {
    switch(type) {
      case 'Deep Work': return <Brain size={14} className="text-red-400" />;
      case 'Revision': return <RefreshCcw size={14} className="text-blue-400" />;
      case 'Practice': return <Book size={14} className="text-yellow-400" />;
      case 'Buffer': return <Coffee size={14} className="text-green-400" />;
      default: return <Activity size={14} />;
    }
  };

  return (
    <div className="min-h-screen pt-28 pb-32 px-4 md:px-8 bg-black bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-neutral-900 via-black to-black">
      <div className="max-w-6xl mx-auto space-y-12">
        
        {/* Header with Persistence Controls */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="text-center md:text-left space-y-2">
                <h1 className="font-display text-4xl md:text-5xl font-bold text-white tracking-tight">
                    Recovery <span className="text-gradient">Engine</span>
                </h1>
                <p className="text-gray-400 max-w-lg text-sm md:text-base">
                    Input your academic data. We analyze pressure, urgency, and capacity to determine your recovery difficulty.
                </p>
            </div>
            
            <div className="flex flex-col items-end gap-2">
                 <button 
                   onClick={resetSession} 
                   className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-xs font-medium text-gray-400 hover:text-red-500 hover:border-red-500/30 transition-all"
                 >
                    <RotateCcw size={14} /> Start Fresh
                 </button>
                 {lastSaved && (
                     <div className="flex items-center gap-1.5 text-[10px] text-gray-500 font-mono bg-black/40 px-3 py-1 rounded-full border border-white/5">
                        <Check size={10} className="text-emerald-500" />
                        SESSION SAVED {lastSaved}
                     </div>
                 )}
            </div>
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
        
        {/* Recalculate Indicator */}
        {subjects.length > 0 && !results && status === CalculationStatus.VALID && (
             <div className="bg-yellow-900/10 border border-yellow-500/30 rounded-lg p-4 flex items-center gap-3 text-yellow-500">
                <AlertTriangle size={18} />
                <span className="text-sm font-medium">Inputs modified. Recalculation required to update plan.</span>
             </div>
        )}

        {/* 2. RECOVERY DIFFICULTY DASHBOARD (Phase 4) */}
        {results?.recoveryMetrics && (
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
                <div className={`absolute top-0 right-0 p-32 rounded-full blur-3xl opacity-10 ${results.recoveryMetrics.color.replace('text-', 'bg-')}`}></div>
                
                <div className="relative z-10 shrink-0">
                  <CircularProgress score={results.recoveryMetrics.difficultyScore} color={results.recoveryMetrics.color} />
                </div>
                
                <div className="flex-1 text-center md:text-left relative z-10">
                  <h3 className={`font-display text-2xl font-bold mb-2 ${results.recoveryMetrics.color}`}>
                    {results.recoveryMetrics.recoveryCategory} Difficulty
                  </h3>
                  <p className="text-gray-300 text-lg leading-relaxed mb-4">
                    {results.recoveryMetrics.message}
                  </p>
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/5">
                    <Activity size={12} className="text-gray-500" />
                    <span className="text-xs text-gray-400 font-mono">
                      LOAD RATIO: {results.recoveryMetrics.loadRatio}
                    </span>
                  </div>
                </div>
              </div>

              {/* Insights Panel */}
              <div className="glass-panel p-6 rounded-xl border border-white/10 flex flex-col justify-center space-y-6">
                 <div>
                    <div className="flex justify-between items-center mb-1">
                       <span className="text-[10px] text-gray-500 uppercase font-mono tracking-wider">Total Pressure</span>
                       <span className="text-white font-bold">{results.recoveryMetrics.totalPressure}</span>
                    </div>
                    <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                       <motion.div 
                         initial={{ width: 0 }}
                         animate={{ width: `${Math.min(results.recoveryMetrics.totalPressure, 100)}%` }}
                         className="h-full bg-red-600" 
                       />
                    </div>
                 </div>

                 <div>
                    <div className="flex justify-between items-center mb-1">
                       <span className="text-[10px] text-gray-500 uppercase font-mono tracking-wider">Weekly Capacity</span>
                       <span className="text-white font-bold">{results.recoveryMetrics.weeklyCapacity} hrs</span>
                    </div>
                    <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                       <motion.div 
                         initial={{ width: 0 }}
                         animate={{ width: `${Math.min((results.recoveryMetrics.weeklyCapacity / 168) * 100, 100)}%` }} // 168 = total hours in week
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

        {/* 3. PRIORITY OVERVIEW (Phase 5) */}
        {results?.prioritizedSubjects.length && results.prioritizedSubjects.length > 0 && (
          <div className="space-y-6">
             <div className="flex items-end border-b border-white/10 pb-4">
              <h2 className="font-display text-lg font-bold text-white flex items-center gap-2">
                <ListOrdered className="text-red-500" size={18} />
                Priority Roadmap
              </h2>
            </div>

            {/* Mini Priority Analytics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-2">
               <div className="glass-panel p-4 rounded-lg border border-white/5 flex flex-col justify-center">
                  <span className="text-[10px] text-gray-500 uppercase font-mono tracking-wider mb-1">Top Priority</span>
                  <span className="text-white font-bold truncate">{results.prioritizedSubjects[0]?.name}</span>
               </div>
               <div className="glass-panel p-4 rounded-lg border border-white/5 flex flex-col justify-center">
                  <span className="text-[10px] text-gray-500 uppercase font-mono tracking-wider mb-1">Critical Subjects</span>
                  <span className="text-red-500 font-bold">{results.prioritizedSubjects.filter(s => s.priorityTier === 'Critical Priority').length}</span>
               </div>
               <div className="glass-panel p-4 rounded-lg border border-white/5 flex flex-col justify-center col-span-2 md:col-span-2">
                  <span className="text-[10px] text-gray-500 uppercase font-mono tracking-wider mb-1">Strategy</span>
                  <span className="text-gray-300 text-xs">
                    Focus 70% of effort on top {Math.ceil(results.prioritizedSubjects.length * 0.3)} subjects.
                  </span>
               </div>
            </div>

            <div className="space-y-3">
              <AnimatePresence>
                 {results.prioritizedSubjects.map((subject) => (
                    <motion.div 
                      key={subject.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`glass-panel rounded-xl border flex flex-col md:flex-row items-center gap-6 p-5 transition-all relative overflow-hidden ${getTierStyles(subject.priorityTier)} ${subject.priorityRank === 1 ? 'md:scale-[1.02] z-10' : ''}`}
                    >
                       {/* Rank Number */}
                       <div className="shrink-0 flex items-center justify-center w-12 h-12 rounded-full bg-black/40 border border-white/10 font-display font-bold text-xl text-white shadow-inner">
                          {subject.priorityRank}
                       </div>

                       <div className="flex-1 text-center md:text-left">
                          <div className="flex flex-col md:flex-row md:items-center gap-2 mb-1">
                             <h4 className="font-bold text-lg text-white">{subject.name}</h4>
                             <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider w-fit mx-auto md:mx-0 ${getTierBadgeColor(subject.priorityTier)}`}>
                               {subject.priorityTier}
                             </span>
                          </div>
                          <p className="text-sm text-gray-400 flex items-center justify-center md:justify-start gap-2">
                             <Target size={14} className="text-gray-500"/> {subject.priorityExplanation}
                          </p>
                       </div>

                       <div className="shrink-0 text-right">
                          <div className="flex flex-col items-center md:items-end">
                             <span className="text-2xl font-bold text-white leading-none">{subject.pressureScore}</span>
                             <span className="text-[10px] text-gray-500 uppercase font-mono">Pressure Score</span>
                          </div>
                       </div>
                    </motion.div>
                 ))}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* 4. WEEKLY RECOVERY PLAN (Phase 7) */}
        {results?.weeklyPlan && (
          <div className="space-y-6">
            <div className="flex items-end border-b border-white/10 pb-4">
              <h2 className="font-display text-lg font-bold text-white flex items-center gap-2">
                <CalendarDays className="text-red-500" size={18} />
                7-Day Recovery Plan
              </h2>
            </div>

            {/* Recovery Forecast Header */}
            <div className="glass-panel p-6 rounded-xl border border-white/10 bg-gradient-to-r from-red-900/20 to-black">
               <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                 <div>
                    <h3 className="text-xl font-bold text-white mb-2">Estimated Recovery Timeline</h3>
                    <p className="text-gray-400 text-sm">Based on your current backlog and allocated hours.</p>
                 </div>
                 <div className="flex items-center gap-6">
                    <div className="text-center">
                       <span className="block text-3xl font-display font-bold text-white">{results.weeklyPlan.estimatedRecoveryDays}</span>
                       <span className="text-xs text-gray-500 uppercase tracking-widest">Days to Clear</span>
                    </div>
                    <div className="w-px h-10 bg-white/10"></div>
                    <div className="text-center">
                       <span className="block text-3xl font-display font-bold text-white">{results.weeklyPlan.totalWeeklyHours}</span>
                       <span className="text-xs text-gray-500 uppercase tracking-widest">Weekly Hours</span>
                    </div>
                 </div>
               </div>
            </div>

            {/* Daily Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
               {results.weeklyPlan.days.map((day) => (
                 <motion.div
                   key={day.dayNumber}
                   initial={{ opacity: 0, scale: 0.95 }}
                   animate={{ opacity: 1, scale: 1 }}
                   transition={{ delay: day.dayNumber * 0.05 }}
                   className={`glass-panel p-4 rounded-xl border border-white/5 flex flex-col h-full ${day.intensity === 'Recovery' ? 'opacity-80' : ''}`}
                 >
                    <div className="flex justify-between items-center mb-4 pb-2 border-b border-white/5">
                       <div>
                          <span className="text-xs text-red-500 font-bold uppercase tracking-widest block">Day {day.dayNumber}</span>
                          <span className="text-lg font-bold text-white">{day.label}</span>
                       </div>
                       <div className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold border ${
                         day.intensity === 'High' ? 'border-red-500/30 text-red-400 bg-red-900/10' :
                         day.intensity === 'Recovery' ? 'border-emerald-500/30 text-emerald-400 bg-emerald-900/10' :
                         'border-gray-500/30 text-gray-400'
                       }`}>
                          {day.intensity}
                       </div>
                    </div>

                    <div className="space-y-2 flex-1">
                       {day.tasks.length === 0 ? (
                         <div className="h-full flex items-center justify-center text-gray-600 text-xs italic">
                           Rest Day
                         </div>
                       ) : (
                         day.tasks.map((task) => (
                           <div key={task.id} className="bg-white/5 rounded-lg p-2.5 hover:bg-white/10 transition-colors border-l-2" style={{ borderLeftColor: task.type === 'Buffer' ? '#10B981' : 'currentColor' }}>
                              <div className="flex justify-between items-start mb-1">
                                 <span className={`text-xs font-bold truncate max-w-[70%] ${task.type === 'Buffer' ? 'text-emerald-400' : 'text-gray-200'}`}>
                                   {task.subjectName}
                                 </span>
                                 <span className="text-[10px] text-gray-500 font-mono bg-black/30 px-1 rounded">
                                   {task.durationMinutes}m
                                 </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                 {getTaskIcon(task.type)}
                                 <span className="text-[10px] text-gray-500 uppercase tracking-wide">{task.type}</span>
                              </div>
                           </div>
                         ))
                       )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-white/5 flex justify-between items-center text-xs text-gray-500 font-mono">
                       <span>Total: {(day.totalMinutes / 60).toFixed(1)}h</span>
                       {day.bufferMinutes > 0 && <span className="text-emerald-500/80">Buffer: {day.bufferMinutes}m</span>}
                    </div>
                 </motion.div>
               ))}
            </div>
          </div>
        )}

        {/* 5. STUDENT PROFILE SECTION */}
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

        {/* 6. ACTION BAR */}
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
               onClick={runRecoveryEngine}
               disabled={status !== CalculationStatus.VALID || isGenerating}
               className={`px-6 py-3 rounded-lg font-bold text-xs uppercase tracking-widest transition-all flex items-center gap-2 ${
                 status === CalculationStatus.VALID 
                 ? 'bg-red-600 hover:bg-red-500 text-white shadow-[0_0_20px_rgba(220,38,38,0.4)]' 
                 : 'bg-white/5 text-gray-600 cursor-not-allowed border border-white/5'
               }`}
             >
               {isGenerating ? (
                  <RefreshCcw size={14} className="animate-spin" />
               ) : results ? (
                  <>Regenerate Plan <RefreshCcw size={14} /></>
               ) : (
                  <>Generate Plan <ArrowRight size={14} /></>
               )}
             </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Engine;