import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Calendar, Clock, BookOpen, AlertCircle, CheckCircle2, ArrowRight, Layers, Activity, Brain, AlertTriangle, TrendingUp, BarChart as BarChartIcon, Zap, Gauge, ListOrdered, Flag, Target, Star, PieChart, Hourglass, Coffee, RefreshCcw, Book, CalendarDays, RotateCcw, Save, Check, XCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { Subject, StudentProfile, DifficultyLevel, StressLevel, LearningPace, CalculationStatus, PressureCategory, RecoveryMetrics, PriorityTier, AllocationMetrics, WeeklyPlan, DayPlan, PlanTask, TaskType, EngineResults, RecoverySession, TaskStatus, AdaptiveMetrics } from '../types';

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
  const [history, setHistory] = useState<{ completionRates: number[], stressLevels: StressLevel[] }>({ completionRates: [], stressLevels: [] });

  // UI State
  const [status, setStatus] = useState<CalculationStatus>(CalculationStatus.INVALID);
  const [isLoaded, setIsLoaded] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showRebalance, setShowRebalance] = useState(false);

  // --- Persistence Logic ---
  const SESSION_KEY = 'recap_recovery_session_v2';

  // Load Session
  useEffect(() => {
    const savedSession = localStorage.getItem(SESSION_KEY);
    if (savedSession) {
      try {
        const parsed: RecoverySession = JSON.parse(savedSession);
        if (parsed.subjects) setSubjects(parsed.subjects);
        if (parsed.profile) setStudentProfile(parsed.profile);
        if (parsed.results) setResults(parsed.results);
        if (parsed.history) setHistory(parsed.history);
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
      results,
      history
    };
    
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    setLastSaved(new Date().toLocaleTimeString());
  }, [subjects, studentProfile, results, history, isLoaded]);

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

  // --- Core Engine Logic Functions ---
  
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

      return { ...sub, daysRemaining, urgencyScore, urgencyLabel, urgencyColor };
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

      return { ...sub, difficultyWeight, pressureScore };
    });

    const sortedScores = [...scoredSubjects].sort((a, b) => (b.pressureScore || 0) - (a.pressureScore || 0));
    
    return scoredSubjects.map(sub => {
      const rank = sortedScores.findIndex(s => s.id === sub.id);
      const percentile = rank / sortedScores.length;
      let category: PressureCategory = 'Low';
      let color = 'from-emerald-400 to-emerald-600';

      if (percentile < 0.25) { category = 'Critical'; color = 'from-red-500 to-rose-700'; }
      else if (percentile < 0.50) { category = 'High'; color = 'from-orange-400 to-orange-600'; }
      else if (percentile < 0.75) { category = 'Moderate'; color = 'from-yellow-400 to-yellow-600'; }

      return { ...sub, pressureCategory: category, pressureColor: color };
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

    if (difficultyScore > 80) { recoveryCategory = 'Critical'; message = "Immediate focus and aggressive prioritization required."; color = "text-red-600"; }
    else if (difficultyScore > 60) { recoveryCategory = 'High'; message = "Recovery requires disciplined execution."; color = "text-orange-500"; }
    else if (difficultyScore > 30) { recoveryCategory = 'Moderate'; message = "You need structured prioritization to stay on track."; color = "text-yellow-500"; }

    return { totalPressure: parseFloat(totalPressure.toFixed(1)), weeklyCapacity, loadRatio: parseFloat(loadRatio.toFixed(2)), difficultyScore, recoveryCategory, message, color };
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
      const backlogHigh = sub.backlogChapters >= 8;

      if (tier === 'Critical Priority') {
        if (urgencyHigh && backlogHigh) explanation = "High deadline pressure with significant backlog.";
        else if (urgencyHigh) explanation = "Immediate deadline demanding urgent focus.";
        else explanation = "Critical combination of factors requires immediate attention.";
      } else if (tier === 'High Priority') {
        explanation = "Important subject requiring structured effort.";
      }

      return { ...sub, priorityRank: rank, priorityTier: tier, priorityExplanation: explanation };
    });
  };

  // Module 6: Dynamic Load Balancer Logic integrated into Allocation
  const allocateTime = (subjects: Subject[], profile: StudentProfile, loadAdjustmentFactor: number = 1.0): { allocatedSubjects: Subject[], metrics: AllocationMetrics } => {
    let bufferRate = 0.10; 
    if (profile.stressLevel === 'High') bufferRate = 0.15;
    
    // Apply Load Adjustment (Module 6)
    const adjustedCapacity = profile.availableHoursPerDay * loadAdjustmentFactor;
    
    const bufferTime = Math.round((adjustedCapacity * bufferRate) * 100) / 100;
    const usableHours = adjustedCapacity - bufferTime;

    let minPerSubject = 0.5;
    if (profile.learningPace === 'Fast') minPerSubject = 0.25;
    if (profile.learningPace === 'Slow') minPerSubject = 0.75;

    const maxPerSubject = adjustedCapacity * 0.5;
    const totalPressure = subjects.reduce((acc, s) => acc + (s.pressureScore || 0), 0);
    
    let allocations = subjects.map(s => {
      const ratio = (s.pressureScore || 0) / totalPressure;
      return { ...s, tempHours: ratio * usableHours };
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
       allocations = allocations.map(s => ({ ...s, tempHours: s.tempHours * scaleFactor }));
    }

    let finalAllocations = allocations.map(s => {
      let rounded = Math.round(s.tempHours * 4) / 4;
      if (rounded < 0.25 && s.tempHours > 0) rounded = 0.25; 
      return { ...s, allocatedHours: rounded };
    });

    finalAllocations.sort((a, b) => (a.priorityRank || 0) - (b.priorityRank || 0));

    let finalSum = finalAllocations.reduce((acc, s) => acc + (s.allocatedHours || 0), 0);
    const remainingTime = Math.max(0, adjustedCapacity - finalSum - bufferTime);
    
    const resultSubjects = finalAllocations.map(s => ({
      ...s,
      allocationPercentage: Math.round(((s.allocatedHours || 0) / profile.availableHoursPerDay) * 100)
    }));

    const maxSubject = resultSubjects.reduce((prev, current) => 
      (prev.allocatedHours || 0) > (current.allocatedHours || 0) ? prev : current
    );

    let message = "Schedule optimized for efficiency.";
    if (loadAdjustmentFactor < 1.0) message = "Workload reduced to prevent burnout (Adaptive Mode).";
    if (profile.stressLevel === 'High') message = "Workload adjusted for high stress levels.";

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
        
        const addTask = (type: TaskType, duration: number) => {
          day.tasks.push({
            id: crypto.randomUUID(),
            subjectId: sub.id,
            subjectName: sub.name,
            type,
            durationMinutes: duration,
            color: sub.urgencyColor || 'text-gray-500',
            status: 'Pending'
          });
        };

        if (minutesPerSession > 90) {
           const deepWork = Math.floor(minutesPerSession * 0.6);
           addTask('Deep Work', deepWork);
           addTask('Revision', minutesPerSession - deepWork);
        } else {
           addTask(minutesPerSession < 40 ? 'Practice' : 'Deep Work', minutesPerSession);
        }
        
        day.totalMinutes += minutesPerSession;
      });
    });

    // Add buffers
    weeklyPlan.forEach((day, index) => {
      const profileData = dayProfiles[index];
      const dailyCapMinutes = profile.availableHoursPerDay * 60 * profileData.multiplier;
      const bufferMins = Math.max(15, dailyCapMinutes - day.totalMinutes);
      
      if (bufferMins > 20) {
        day.tasks.push({
          id: 'buffer-' + day.dayNumber,
          subjectId: 'system-buffer',
          subjectName: 'Flexible Recovery',
          type: 'Buffer',
          durationMinutes: Math.floor(bufferMins),
          color: 'text-gray-500',
          status: 'Pending'
        });
        day.bufferMinutes = Math.floor(bufferMins);
        day.totalMinutes += Math.floor(bufferMins);
      }
    });

    // Simple Initial Forecast (will be updated by adaptive module)
    const totalBacklog = subjects.reduce((acc, s) => acc + s.backlogChapters, 0);
    const weeklyHours = weeklyPlan.reduce((acc, d) => acc + d.totalMinutes, 0) / 60;
    const estimatedVelocity = weeklyHours * 0.6; 
    const estimatedRecoveryDays = Math.ceil((totalBacklog / estimatedVelocity) * 7);
    const highestDay = weeklyPlan.reduce((max, d) => d.totalMinutes > max ? d.totalMinutes : max, 0);

    return { days: weeklyPlan, totalWeeklyHours: parseFloat(weeklyHours.toFixed(1)), estimatedRecoveryDays, highestDay };
  };

  // --- Adaptive Intelligence Modules (New) ---

  const calculateAdaptiveMetrics = (
    weeklyPlan: WeeklyPlan, 
    subjects: Subject[], 
    profile: StudentProfile,
    hist: { completionRates: number[], stressLevels: StressLevel[] }
  ): AdaptiveMetrics => {
    
    // Module 2: Daily Progress Tracking
    const allTasks = weeklyPlan.days.flatMap(d => d.tasks).filter(t => t.type !== 'Buffer');
    const completedTasks = allTasks.filter(t => t.status === 'Completed');
    const completionRate = allTasks.length > 0 ? (completedTasks.length / allTasks.length) * 100 : 0;

    // Module 3: Stress Trend Tracking
    const stressScore = { 'Low': 1, 'Moderate': 2, 'High': 3 };
    const currentStress = stressScore[profile.stressLevel];
    const prevStress = hist.stressLevels.length > 0 ? stressScore[hist.stressLevels[hist.stressLevels.length - 1]] : currentStress;
    let stressTrend: 'Increasing' | 'Stable' | 'Decreasing' = 'Stable';
    if (currentStress > prevStress) stressTrend = 'Increasing';
    if (currentStress < prevStress) stressTrend = 'Decreasing';

    // Module 4: Burnout Detection
    const difficultyMetric = calculateRecoveryDifficulty(calculatePressureMetrics(subjects, profile), profile); // Roughly check diff
    const burnoutRisk = (profile.stressLevel === 'High' && completionRate < 50 && difficultyMetric.difficultyScore > 70);

    // Module 5: Advanced Recovery Forecasting
    // effective output: hours completed / active days (simplified here)
    const completedHours = completedTasks.reduce((acc, t) => acc + t.durationMinutes, 0) / 60;
    const effectiveDailyOutput = completedHours > 0 ? completedHours / 1 : 0.5; // Fallback
    const totalBacklog = subjects.reduce((acc, s) => acc + s.backlogChapters, 0);
    // Assuming 1 chapter takes ~1.5 hours on average for calc
    const chaptersCleared = completedHours / 1.5; 
    const remainingBacklog = Math.max(0, totalBacklog - chaptersCleared);
    // Forecast days: (remaining backlog * 1.5 hours/chapter) / (daily capacity * completionRate)
    const capacityFactor = profile.availableHoursPerDay * (completionRate > 0 ? completionRate / 100 : 0.8);
    // Simple projection string
    const projectedRecoveryDate = new Date();
    projectedRecoveryDate.setDate(projectedRecoveryDate.getDate() + (remainingBacklog * 1.5 / (capacityFactor || 1)));
    
    // Module 6: Dynamic Load Balancer Factor
    let loadAdjustmentFactor = 1.0;
    if (completionRate > 90) loadAdjustmentFactor = 1.05;
    if (completionRate < 60) loadAdjustmentFactor = 0.90;
    if (burnoutRisk) loadAdjustmentFactor = 0.85;

    // Analytics
    const mostChallengingSubject = subjects.sort((a,b) => (b.pressureScore || 0) - (a.pressureScore || 0))[0]?.name || "None";

    return {
      completionRate: parseFloat(completionRate.toFixed(1)),
      stressTrend,
      burnoutRisk,
      effectiveDailyOutput: parseFloat(effectiveDailyOutput.toFixed(2)),
      projectedRecoveryDate: projectedRecoveryDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      loadAdjustmentFactor,
      mostChallengingSubject
    };
  };

  // --- Architecture Integration (Refactored Pipeline) ---
  const runRecoveryEngine = useCallback(() => {
    setIsGenerating(true);
    
    setTimeout(() => {
        // 1. Base Calculations
        const timeMetrics = calculateDeadlineMetrics(subjects);
        const pressureMetrics = calculatePressureMetrics(timeMetrics, studentProfile);
        
        if (subjects.length > 0) {
            const prioritized = prioritizeSubjects(pressureMetrics);
            const recovery = calculateRecoveryDifficulty(pressureMetrics, studentProfile);
            
            // 2. Adaptive Pre-calculation (Load Balancer)
            // Use history to determine initial load factor
            let initialLoadFactor = 1.0;
            if (history.completionRates.length > 0) {
                const avgCompletion = history.completionRates.slice(-3).reduce((a,b) => a+b, 0) / Math.min(3, history.completionRates.length);
                if (avgCompletion > 90) initialLoadFactor = 1.05;
                if (avgCompletion < 60) initialLoadFactor = 0.90;
            }

            // 3. Allocation & Planning
            const allocation = allocateTime(prioritized, studentProfile, initialLoadFactor);
            const plan = generateWeeklyPlan(allocation.allocatedSubjects, studentProfile);

            // 4. Initial Analytics
            const adaptive = calculateAdaptiveMetrics(plan, prioritized, studentProfile, history);

            setResults({
                prioritizedSubjects: allocation.allocatedSubjects,
                recoveryMetrics: recovery,
                allocationData: allocation,
                weeklyPlan: plan,
                adaptiveMetrics: adaptive,
                generatedAt: new Date().toISOString()
            });

            // Update history only on fresh generation if needed, or leave for weekly cycles
            window.scrollTo({ top: 800, behavior: 'smooth' });
        }
        
        setIsGenerating(false);
    }, 800);
  }, [subjects, studentProfile, history]);


  // --- Module 1: Adaptive Replanning Engine (Runtime) ---
  const toggleTaskStatus = (dayIndex: number, taskId: string) => {
    if (!results) return;

    const newPlan = { ...results.weeklyPlan };
    const task = newPlan.days[dayIndex].tasks.find(t => t.id === taskId);
    
    if (task) {
        // Toggle Logic: Pending -> Completed -> Missed -> Pending
        if (task.status === 'Pending') task.status = 'Completed';
        else if (task.status === 'Completed') task.status = 'Missed';
        else if (task.status === 'Missed') task.status = 'Partially Completed';
        else task.status = 'Pending';
        
        // Recalculate Analytics Live
        const newAdaptive = calculateAdaptiveMetrics(newPlan, results.prioritizedSubjects, studentProfile, history);
        
        setResults({
            ...results,
            weeklyPlan: newPlan,
            adaptiveMetrics: newAdaptive
        });

        // Trigger Rebalance Check if Missed
        if (task.status === 'Missed') {
            setShowRebalance(true);
        }
    }
  };

  const rebalanceSchedule = () => {
    if (!results) return;
    setIsGenerating(true);

    setTimeout(() => {
        const newPlan = { ...results.weeklyPlan };
        
        // Find all missed tasks
        const missedTasks: PlanTask[] = [];
        newPlan.days.forEach(day => {
            day.tasks.forEach(task => {
                if (task.status === 'Missed') {
                    missedTasks.push({ ...task, status: 'Pending', id: crypto.randomUUID() }); // Reset status for future
                }
            });
        });

        // Redistribute missed tasks to future days (simple round robin for demo)
        // Only redistribute to days that are NOT today (assuming day 0 is today for simplicity, or just distribute to all)
        // In a real app we know "today", here we just push to next available slots
        let dayIdx = 0;
        missedTasks.forEach(task => {
            // Find a day with capacity (simplified: just simple distribution)
            // Limit: max 110% of capacity. 
            // Demo logic: Just push to next days
            const targetDay = newPlan.days[(dayIdx % 6) + 1]; // Avoid day 0 if possible
            targetDay.tasks.splice(0, 0, { ...task, subjectName: `(Rescheduled) ${task.subjectName}`, color: 'text-orange-400' });
            targetDay.totalMinutes += task.durationMinutes;
            dayIdx++;
        });

        // Update analytics with rebalanced plan
        const newAdaptive = calculateAdaptiveMetrics(newPlan, results.prioritizedSubjects, studentProfile, history);

        setResults({
            ...results,
            weeklyPlan: newPlan,
            adaptiveMetrics: { ...newAdaptive, loadAdjustmentFactor: 0.95 } // Penalize load slightly
        });
        
        setShowRebalance(false);
        setIsGenerating(false);
    }, 600);
  };

  // --- Actions ---
  const addSubject = () => {
    setSubjects([...subjects, {
      id: crypto.randomUUID(),
      name: '',
      backlogChapters: 5,
      deadline: '',
      difficulty: 'Moderate'
    }]);
    setResults(null); 
  };

  const removeSubject = (id: string) => {
    setSubjects(subjects.filter(s => s.id !== id));
    setResults(null);
  };

  const updateSubjectField = (id: string, field: keyof Subject, value: any) => {
    setSubjects(subjects.map(sub => (sub.id === id ? { ...sub, [field]: value } : sub)));
    setResults(null);
  };

  const updateStudentProfile = (field: keyof StudentProfile, value: any) => {
    if (field === 'availableHoursPerDay' && (value < 1 || value > 24)) return;
    setStudentProfile(prev => ({ ...prev, [field]: value }));
    setResults(null);
  };

  const resetSession = () => {
    if (confirm("Clear all data?")) {
        setSubjects([]);
        setStudentProfile({ availableHoursPerDay: 4, learningPace: 'Moderate', stressLevel: 'Moderate' });
        setResults(null);
        setHistory({ completionRates: [], stressLevels: [] });
        localStorage.removeItem(SESSION_KEY);
        setStatus(CalculationStatus.INVALID);
    }
  };

  // Reactive Analysis (Visuals only)
  const analyzedSubjects = useMemo(() => {
    return calculatePressureMetrics(calculateDeadlineMetrics(subjects), studentProfile);
  }, [subjects, studentProfile]);

  // Helpers
  const getTaskIcon = (type: TaskType) => {
    switch(type) {
      case 'Deep Work': return <Brain size={14} className="text-red-400" />;
      case 'Revision': return <RefreshCcw size={14} className="text-blue-400" />;
      case 'Practice': return <Book size={14} className="text-yellow-400" />;
      case 'Buffer': return <Coffee size={14} className="text-green-400" />;
      default: return <Activity size={14} />;
    }
  };

  const getStatusColor = (status: TaskStatus) => {
    switch(status) {
        case 'Completed': return 'bg-emerald-500/20 text-emerald-500 border-emerald-500/50';
        case 'Missed': return 'bg-red-500/20 text-red-500 border-red-500/50';
        case 'Partially Completed': return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/50';
        default: return 'bg-white/5 text-gray-400 border-transparent';
    }
  };

  return (
    <div className="min-h-screen pt-28 pb-32 px-4 md:px-8 bg-black bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-neutral-900 via-black to-black">
      <div className="max-w-6xl mx-auto space-y-12">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="text-center md:text-left space-y-2">
                <h1 className="font-display text-4xl md:text-5xl font-bold text-white tracking-tight">
                    Adaptive <span className="text-gradient">Intelligence</span>
                </h1>
                <p className="text-gray-400 max-w-lg text-sm md:text-base">
                    Input your academic data. The system continuously adapts your recovery plan based on your progress and stress.
                </p>
            </div>
            
            <div className="flex flex-col items-end gap-2">
                 <button onClick={resetSession} className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-xs font-medium text-gray-400 hover:text-red-500 hover:border-red-500/30 transition-all">
                    <RotateCcw size={14} /> Start Fresh
                 </button>
                 {lastSaved && (
                     <div className="flex items-center gap-1.5 text-[10px] text-gray-500 font-mono bg-black/40 px-3 py-1 rounded-full border border-white/5">
                        <Check size={10} className="text-emerald-500" />
                        SYSTEM SYNCHRONIZED {lastSaved}
                     </div>
                 )}
            </div>
        </div>

        {/* 1. INPUT SECTION */}
        <div className="space-y-6">
          <div className="flex justify-between items-end border-b border-white/10 pb-4">
            <h2 className="font-display text-lg font-bold text-white flex items-center gap-2">
              <Layers className="text-red-500" size={18} />
              Academic Workload
            </h2>
            <button onClick={addSubject} className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-medium text-white transition-all flex items-center gap-2">
              <Plus size={14} /> Add Module
            </button>
          </div>

          <div className="space-y-4">
            <AnimatePresence initial={false}>
              {analyzedSubjects.map((subject) => (
                <motion.div
                  key={subject.id}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className={`glass-panel p-5 rounded-xl border relative group overflow-hidden ${subject.urgencyColor ? subject.urgencyColor.replace('text-', 'border-').split(' ')[1] : 'border-white/10'}`}
                >
                  <div className={`absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b ${subject.pressureColor}`}></div>
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start pl-3">
                    <div className="md:col-span-4 space-y-2">
                       <label className="text-[10px] uppercase font-mono text-gray-500 tracking-wider">Subject Name</label>
                       <div className="relative">
                        <BookOpen className="absolute left-3 top-3 text-gray-600" size={14} />
                        <input type="text" value={subject.name} placeholder="e.g. Organic Chemistry" onChange={(e) => updateSubjectField(subject.id, 'name', e.target.value)} className={`w-full bg-black/40 border rounded-lg py-2.5 pl-9 pr-3 text-sm text-white focus:outline-none focus:ring-1 transition-all ${subject.name ? 'border-white/10 focus:border-red-500' : 'border-red-500/30'}`} />
                      </div>
                    </div>
                    <div className="md:col-span-2 space-y-1.5">
                      <label className="text-[10px] uppercase font-mono text-gray-500 tracking-wider">Chapters</label>
                      <input type="number" min="1" value={subject.backlogChapters} onChange={(e) => updateSubjectField(subject.id, 'backlogChapters', parseInt(e.target.value) || 0)} className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-red-500 text-center font-mono" />
                    </div>
                    <div className="md:col-span-3 space-y-1.5">
                      <label className="text-[10px] uppercase font-mono text-gray-500 tracking-wider flex justify-between">
                        <span>Deadline</span>
                        {subject.deadline && <span className={subject.urgencyColor?.split(' ')[0]}>{subject.daysRemaining} Days</span>}
                      </label>
                      <input type="date" value={subject.deadline} min={new Date().toISOString().split('T')[0]} onChange={(e) => updateSubjectField(subject.id, 'deadline', e.target.value)} className={`w-full bg-black/40 border rounded-lg p-2.5 text-sm text-white focus:outline-none focus:ring-1 font-mono ${subject.deadline ? 'border-white/10 focus:border-red-500' : 'border-red-500/30'}`} />
                    </div>
                     <div className="md:col-span-3 flex gap-3">
                        <div className="flex-1 space-y-1.5">
                          <label className="text-[10px] uppercase font-mono text-gray-500 tracking-wider">Difficulty</label>
                          <select value={subject.difficulty} onChange={(e) => updateSubjectField(subject.id, 'difficulty', e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-red-500">
                            {['Low', 'Moderate', 'High'].map(opt => <option key={opt} value={opt}>{opt}</option>)}
                          </select>
                        </div>
                        <div className="flex-1 space-y-1.5">
                          <label className="text-[10px] uppercase font-mono text-gray-500 tracking-wider text-right block">Pressure</label>
                          <div className={`w-full p-2.5 rounded-lg border border-white/5 bg-gradient-to-r ${subject.pressureColor} flex items-center justify-between`}>
                             <span className="text-white font-bold text-sm">{subject.pressureScore}</span>
                             <span className="text-[8px] text-white/90 font-mono uppercase bg-black/20 px-1.5 py-0.5 rounded">{subject.pressureCategory}</span>
                          </div>
                        </div>
                    </div>
                  </div>
                  <button onClick={() => removeSubject(subject.id)} className="absolute top-2 right-2 text-gray-700 hover:text-red-500 transition-colors p-2 opacity-0 group-hover:opacity-100"><Trash2 size={14} /></button>
                </motion.div>
              ))}
            </AnimatePresence>
            {subjects.length === 0 && (
              <div className="border border-dashed border-white/10 rounded-xl p-10 flex flex-col items-center justify-center text-center bg-white/[0.02]">
                <Layers className="text-gray-600 mb-3" size={24} />
                <button onClick={addSubject} className="text-red-500 hover:text-red-400 text-xs font-bold uppercase tracking-widest flex items-center gap-2"><Plus size={12} /> Add First Module</button>
              </div>
            )}
          </div>
        </div>

        {/* 2. ADAPTIVE ANALYTICS DASHBOARD (Module 7) */}
        {results?.adaptiveMetrics && (
           <div className="space-y-6">
              <div className="flex items-end border-b border-white/10 pb-4">
                <h2 className="font-display text-lg font-bold text-white flex items-center gap-2">
                    <BarChartIcon className="text-red-500" size={18} />
                    Adaptive Analytics
                </h2>
              </div>

              {/* Module 4: Burnout Alert */}
              {results.adaptiveMetrics.burnoutRisk && (
                  <div className="bg-red-900/10 border border-red-500/30 p-4 rounded-xl flex items-center gap-4 animate-pulse-slow">
                     <AlertTriangle className="text-red-500" size={24} />
                     <div>
                        <h4 className="text-red-400 font-bold text-sm">Burnout Risk Detected</h4>
                        <p className="text-gray-400 text-xs">High stress coupled with low completion rate. Workload automatically reduced by 15%.</p>
                     </div>
                  </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                 {/* Progress Card (Module 2) */}
                 <div className="glass-panel p-6 rounded-xl border border-white/10 relative overflow-hidden">
                    <h3 className="text-xs text-gray-500 uppercase font-mono mb-2">Completion Rate</h3>
                    <div className="flex items-end gap-2 mb-2">
                        <span className="text-3xl font-bold text-white">{results.adaptiveMetrics.completionRate}%</span>
                        <span className="text-xs text-gray-500 mb-1">Weekly Avg</span>
                    </div>
                    <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-500 ${results.adaptiveMetrics.completionRate > 80 ? 'bg-emerald-500' : 'bg-red-500'}`} style={{ width: `${results.adaptiveMetrics.completionRate}%` }}></div>
                    </div>
                 </div>

                 {/* Stress Trend (Module 3) */}
                 <div className="glass-panel p-6 rounded-xl border border-white/10">
                    <h3 className="text-xs text-gray-500 uppercase font-mono mb-2">Stress Trend</h3>
                    <div className="flex items-center gap-2">
                        {results.adaptiveMetrics.stressTrend === 'Increasing' ? <TrendingUp className="text-red-500" size={24}/> : 
                         results.adaptiveMetrics.stressTrend === 'Decreasing' ? <TrendingUp className="text-emerald-500 transform rotate-180" size={24}/> :
                         <Activity className="text-blue-500" size={24}/>}
                        <span className="text-xl font-bold text-white">{results.adaptiveMetrics.stressTrend}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">Based on weekly workload impact.</p>
                 </div>

                 {/* Recovery Forecast (Module 5) */}
                 <div className="glass-panel p-6 rounded-xl border border-white/10 md:col-span-2">
                    <h3 className="text-xs text-gray-500 uppercase font-mono mb-2">Projected Recovery</h3>
                    <div className="flex justify-between items-end">
                       <div>
                          <span className="text-2xl font-bold text-white">{results.adaptiveMetrics.projectedRecoveryDate}</span>
                          <p className="text-xs text-gray-500">Estimated completion date</p>
                       </div>
                       <div className="text-right">
                          <span className={`text-sm font-bold ${results.adaptiveMetrics.loadAdjustmentFactor > 1 ? 'text-emerald-400' : 'text-orange-400'}`}>
                              {results.adaptiveMetrics.loadAdjustmentFactor > 1 ? 'Accelerating' : 'Adjusted Pace'}
                          </span>
                          <p className="text-xs text-gray-500">Load Factor: {(results.adaptiveMetrics.loadAdjustmentFactor * 100).toFixed(0)}%</p>
                       </div>
                    </div>
                 </div>
              </div>
           </div>
        )}

        {/* 3. PRIORITY OVERVIEW */}
        {results?.prioritizedSubjects.length && results.prioritizedSubjects.length > 0 && (
          <div className="space-y-6">
             <div className="flex items-end border-b border-white/10 pb-4">
              <h2 className="font-display text-lg font-bold text-white flex items-center gap-2">
                <ListOrdered className="text-red-500" size={18} />
                Priority Roadmap
              </h2>
            </div>
            <div className="space-y-3">
              <AnimatePresence>
                 {results.prioritizedSubjects.slice(0, 3).map((subject) => (
                    <motion.div 
                      key={subject.id}
                      className={`glass-panel rounded-xl border flex items-center gap-6 p-4 border-white/5 bg-white/[0.02]`}
                    >
                       <div className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-white/5 font-display font-bold text-sm text-white">{subject.priorityRank}</div>
                       <div className="flex-1"><h4 className="font-bold text-white">{subject.name}</h4></div>
                       <div className="shrink-0"><span className="text-xs text-gray-400">{subject.priorityTier}</span></div>
                    </motion.div>
                 ))}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* 4. WEEKLY RECOVERY PLAN */}
        {results?.weeklyPlan && (
          <div className="space-y-6">
            <div className="flex items-end justify-between border-b border-white/10 pb-4">
              <h2 className="font-display text-lg font-bold text-white flex items-center gap-2">
                <CalendarDays className="text-red-500" size={18} />
                Active Recovery Plan
              </h2>
              {/* Module 1: Rebalance Button */}
              {showRebalance && (
                <button onClick={rebalanceSchedule} className="px-3 py-1 bg-orange-600/20 text-orange-400 border border-orange-600/50 rounded-lg text-xs font-bold animate-pulse hover:bg-orange-600/30 transition-all flex items-center gap-2">
                   <RotateCcw size={12}/> Rebalance Missed Tasks
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
               {results.weeklyPlan.days.map((day, dIdx) => (
                 <motion.div
                   key={day.dayNumber}
                   initial={{ opacity: 0, scale: 0.95 }}
                   animate={{ opacity: 1, scale: 1 }}
                   transition={{ delay: day.dayNumber * 0.05 }}
                   className={`glass-panel p-4 rounded-xl border border-white/5 flex flex-col h-full`}
                 >
                    <div className="flex justify-between items-center mb-4 pb-2 border-b border-white/5">
                       <div>
                          <span className="text-xs text-red-500 font-bold uppercase tracking-widest block">Day {day.dayNumber}</span>
                          <span className="text-lg font-bold text-white">{day.label}</span>
                       </div>
                       <div className="px-2 py-0.5 rounded text-[10px] uppercase font-bold border border-white/10 text-gray-400">{day.intensity}</div>
                    </div>

                    <div className="space-y-2 flex-1">
                       {day.tasks.length === 0 ? <div className="h-full flex items-center justify-center text-gray-600 text-xs italic">Rest Day</div> : 
                         day.tasks.map((task) => (
                           // Task Interactive Card
                           <div key={task.id} 
                                onClick={() => toggleTaskStatus(dIdx, task.id)}
                                className={`rounded-lg p-2.5 transition-all cursor-pointer border-l-2 select-none group ${getStatusColor(task.status)}`}
                                style={{ borderLeftColor: task.type === 'Buffer' ? '#10B981' : task.status === 'Completed' ? '#10B981' : task.status === 'Missed' ? '#EF4444' : 'currentColor' }}
                           >
                              <div className="flex justify-between items-start mb-1">
                                 <span className={`text-xs font-bold truncate max-w-[70%] group-hover:underline ${task.status === 'Completed' ? 'line-through opacity-50' : ''}`}>
                                   {task.subjectName}
                                 </span>
                                 <span className="text-[10px] opacity-70 font-mono">{task.durationMinutes}m</span>
                              </div>
                              <div className="flex items-center justify-between">
                                 <div className="flex items-center gap-1.5 opacity-70">
                                     {getTaskIcon(task.type)}
                                     <span className="text-[10px] uppercase tracking-wide">{task.type}</span>
                                 </div>
                                 <span className="text-[9px] uppercase font-bold tracking-widest opacity-60">{task.status === 'Pending' ? '' : task.status}</span>
                              </div>
                           </div>
                         ))
                       }
                    </div>
                 </motion.div>
               ))}
            </div>
          </div>
        )}

        {/* 5. STUDENT PROFILE */}
        <div className="space-y-6">
          <div className="flex items-end border-b border-white/10 pb-4">
            <h2 className="font-display text-lg font-bold text-white flex items-center gap-2">
              <Brain className="text-red-500" size={18} />
              Adaptive Context
            </h2>
          </div>
          <div className="glass-panel p-6 rounded-xl border border-white/10">
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               <div className="space-y-2">
                 <label className="text-[10px] uppercase font-mono text-gray-500 tracking-wider flex items-center gap-2"><Clock size={12} /> Daily Capacity</label>
                 <input type="number" min="1" max="24" value={studentProfile.availableHoursPerDay} onChange={(e) => updateStudentProfile('availableHoursPerDay', parseInt(e.target.value) || 0)} className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-red-500 font-mono" />
               </div>
               <div className="space-y-2">
                 <label className="text-[10px] uppercase font-mono text-gray-500 tracking-wider flex items-center gap-2"><Zap size={12} /> Learning Pace</label>
                 <select value={studentProfile.learningPace} onChange={(e) => updateStudentProfile('learningPace', e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-red-500">
                    {['Slow', 'Moderate', 'Fast'].map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
               </div>
               <div className="space-y-2">
                 <label className="text-[10px] uppercase font-mono text-gray-500 tracking-wider flex items-center gap-2"><Activity size={12} /> Stress Level</label>
                 <select value={studentProfile.stressLevel} onChange={(e) => updateStudentProfile('stressLevel', e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-red-500">
                    {['Low', 'Moderate', 'High'].map(opt => <option key={opt} value={opt}>{opt}</option>)}
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
                <div><p className="text-xs font-mono text-gray-400 uppercase tracking-widest">{status === CalculationStatus.VALID ? 'SYSTEM READY' : 'AWAITING INPUT'}</p></div>
             </div>
             <button onClick={runRecoveryEngine} disabled={status !== CalculationStatus.VALID || isGenerating} className={`px-6 py-3 rounded-lg font-bold text-xs uppercase tracking-widest transition-all flex items-center gap-2 ${status === CalculationStatus.VALID ? 'bg-red-600 hover:bg-red-500 text-white shadow-[0_0_20px_rgba(220,38,38,0.4)]' : 'bg-white/5 text-gray-600 cursor-not-allowed border border-white/5'}`}>
               {isGenerating ? <RefreshCcw size={14} className="animate-spin" /> : results ? <>Regenerate Plan <RefreshCcw size={14} /></> : <>Generate Plan <ArrowRight size={14} /></>}
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Engine;