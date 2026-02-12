import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Calendar, Clock, BookOpen, AlertCircle, CheckCircle2, ArrowRight, Layers, Activity, Brain, AlertTriangle, TrendingUp, BarChart as BarChartIcon, Zap, Gauge, ListOrdered, Flag, Target, Star, PieChart, Hourglass, Coffee, RefreshCcw, Book, CalendarDays, RotateCcw, Save, Check, XCircle, ChevronDown, ChevronUp, FileText, Image as ImageIcon, Download, Upload, Play, Pause, Square, ChevronLeft, ChevronRight, Eye, Wind, Timer, StopCircle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, Cell, PieChart as RechartsPie, Pie, AreaChart, Area, CartesianGrid, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';
import { Subject, StudentProfile, DifficultyLevel, StressLevel, LearningPace, CalculationStatus, PressureCategory, RecoveryMetrics, PriorityTier, AllocationMetrics, WeeklyPlan, DayPlan, PlanTask, TaskType, EngineResults, RecoverySession, TaskStatus, AdaptiveMetrics, StudyMaterial } from '../types';

const Engine: React.FC = () => {
  type TabType = 'generator' | 'calendar' | 'materials' | 'tools' | 'analytics';
  const [activeTab, setActiveTab] = useState<TabType>('generator');

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
  const [materials, setMaterials] = useState<StudyMaterial[]>([]);

  // UI State
  const [status, setStatus] = useState<CalculationStatus>(CalculationStatus.INVALID);
  const [isLoaded, setIsLoaded] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showRebalance, setShowRebalance] = useState(false);

  // Calendar State
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(new Date().toISOString().split('T')[0]);

  // Materials State
  const [newMaterialTitle, setNewMaterialTitle] = useState('');
  const [tempFile, setTempFile] = useState<File | null>(null); // New state for selected file
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Tools State
  const [activeTool, setActiveTool] = useState<'pomodoro' | 'stopwatch' | 'breathing'>('pomodoro');
  
  // Pomodoro
  const [timerTime, setTimerTime] = useState(25 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerMode, setTimerMode] = useState<'Work' | 'Break'>('Work');

  // Stopwatch
  const [stopwatchTime, setStopwatchTime] = useState(0);
  const [isStopwatchRunning, setIsStopwatchRunning] = useState(false);

  // --- Persistence Logic ---
  const SESSION_KEY = 'recap_recovery_session_v3';

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
        if (parsed.materials) setMaterials(parsed.materials);
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
      materials,
      history
    };
    
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    setLastSaved(new Date().toLocaleTimeString());
  }, [subjects, studentProfile, results, history, materials, isLoaded]);

  // Pomodoro Timer Effect
  useEffect(() => {
    let interval: any = null;
    if (isTimerRunning && timerTime > 0) {
      interval = setInterval(() => {
        setTimerTime((prev) => prev - 1);
      }, 1000);
    } else if (timerTime === 0) {
      setIsTimerRunning(false);
      if (timerMode === 'Work') {
        setTimerMode('Break');
        setTimerTime(5 * 60);
      } else {
        setTimerMode('Work');
        setTimerTime(25 * 60);
      }
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timerTime, timerMode]);

  // Stopwatch Effect
  useEffect(() => {
    let interval: any = null;
    if (isStopwatchRunning) {
        interval = setInterval(() => {
            setStopwatchTime(prev => prev + 1);
        }, 1000);
    }
    return () => clearInterval(interval);
  }, [isStopwatchRunning]);

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

  // --- Helper: Time Formatting ---
  const formatDuration = (totalMinutes: number) => {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    
    if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h`;
    return `${minutes}m`;
  };

  const formatSeconds = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const formatStopwatch = (seconds: number) => {
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      const s = seconds % 60;
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // --- Core Engine Logic Functions ---
  // (Identical to previous logic, kept for functionality)
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
    // Dynamic Day Generation Starting Tomorrow
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + 1); // Tomorrow

    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    const getDayProfile = (date: Date) => {
        const day = date.getDay();
        // 0=Sun, 6=Sat
        if (day === 0) return { intensity: 'Recovery' as const, multiplier: 0.5 };
        if (day === 6) return { intensity: 'Light' as const, multiplier: 0.7 };
        if (day === 3 || day === 4) return { intensity: 'High' as const, multiplier: 1.1 }; // Wed, Thu
        return { intensity: 'Moderate' as const, multiplier: 1.0 }; // Mon, Tue, Fri
    };

    const weeklyPlan: DayPlan[] = [];
    const dailyMultipliers: number[] = [];
    const planDates: Date[] = [];

    // Generate 7 days
    for (let i = 0; i < 7; i++) {
        const d = new Date(startDate);
        d.setDate(startDate.getDate() + i);
        planDates.push(d);
        
        const { intensity, multiplier } = getDayProfile(d);
        dailyMultipliers.push(multiplier);
        
        const label = `${daysOfWeek[d.getDay()]}, ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
        
        weeklyPlan.push({
            dayNumber: i + 1,
            dateString: d.toISOString().split('T')[0], // Store ISO date
            label,
            intensity,
            tasks: [],
            totalMinutes: 0,
            bufferMinutes: 0
        });
    }

    const getFrequency = (tier?: PriorityTier) => {
      let freq = 3;
      if (tier === 'Critical Priority') freq = 6;
      else if (tier === 'High Priority') freq = 5;
      else if (tier === 'Medium Priority') freq = 4;
      if (profile.stressLevel === 'High' && freq > 3) freq -= 1;
      return freq;
    };
    
    const getTargetDays = (freq: number) => {
      // Return indices [0..6] based on frequency
      if (freq >= 7) return [0,1,2,3,4,5,6];
      if (freq === 6) return [0,1,2,3,4,5]; 
      if (freq === 5) return [0,1,2,3,4]; 
      if (freq === 4) return [0,1,2,3]; 
      if (freq === 3) return [0,2,4]; 
      if (freq === 2) return [1,3]; 
      return [0];
    };

    // Sort subjects by priority to ensure high value items get the slots first
    const sortedSubjects = [...subjects].sort((a, b) => (a.priorityRank || 99) - (b.priorityRank || 99));

    sortedSubjects.forEach(sub => {
      if (!sub.allocatedHours || sub.allocatedHours <= 0) return;

      const freq = getFrequency(sub.priorityTier);
      const totalWeeklyMinutes = sub.allocatedHours * 7 * 60;
      const targetDays = getTargetDays(freq);
      
      const minutesPerSession = Math.floor(totalWeeklyMinutes / freq);

      targetDays.forEach(dayIndex => {
        // Enforce Deadline: Do not schedule if day > deadline
        const sessionDate = planDates[dayIndex];
        const subDeadline = new Date(sub.deadline);
        subDeadline.setHours(23, 59, 59, 999);
        
        if (sessionDate > subDeadline) return;

        const day = weeklyPlan[dayIndex];
        
        // --- STRICT CAPACITY CHECK ---
        const dailyCap = profile.availableHoursPerDay * 60 * dailyMultipliers[dayIndex];
        const remainingMinutes = dailyCap - day.totalMinutes;
        
        if (remainingMinutes < 15) return; // Day is effectively full

        let actualDuration = minutesPerSession;
        if (actualDuration > remainingMinutes) {
            actualDuration = Math.floor(remainingMinutes);
        }
        
        if (actualDuration < 15) return; // Too short to be meaningful

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

        if (actualDuration > 90) {
           const deepWork = Math.floor(actualDuration * 0.6);
           addTask('Deep Work', deepWork);
           addTask('Revision', actualDuration - deepWork);
        } else {
           addTask(actualDuration < 40 ? 'Practice' : 'Deep Work', actualDuration);
        }
        
        day.totalMinutes += actualDuration;
      });
    });

    // Add buffers (Catch-up Time) if space allows
    weeklyPlan.forEach((day, index) => {
      const multiplier = dailyMultipliers[index];
      const dailyCapMinutes = profile.availableHoursPerDay * 60 * multiplier;
      
      const bufferMins = Math.floor(Math.max(0, dailyCapMinutes - day.totalMinutes));
      
      if (bufferMins > 20) {
        day.tasks.push({
          id: 'buffer-' + day.dayNumber,
          subjectId: 'system-buffer',
          subjectName: 'Catch-up Time',
          type: 'Buffer',
          durationMinutes: bufferMins,
          color: 'text-gray-500',
          status: 'Pending'
        });
        day.bufferMinutes = bufferMins;
        day.totalMinutes += bufferMins;
      }
    });

    // Simple Initial Forecast
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
        }
        
        setIsGenerating(false);
    }, 800);
  }, [subjects, studentProfile, history]);


  // --- Module 1: Adaptive Replanning Engine (Runtime) ---
  const toggleTaskStatus = (dayIndex: number, taskId: string) => {
    if (!results) return;

    const newPlan = { ...results.weeklyPlan };
    const day = newPlan.days.find(d => d.dayNumber === dayIndex || (d as any).originalIndex === dayIndex);
    if (!day) return;

    const task = day.tasks.find(t => t.id === taskId);
    
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
        let dayIdx = 0;
        missedTasks.forEach(task => {
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
        setMaterials([]);
        localStorage.removeItem(SESSION_KEY);
        setStatus(CalculationStatus.INVALID);
    }
  };

  // Handles just file selection, doesn't add yet
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        setTempFile(e.target.files[0]);
    }
  };

  // Explicit Add Material Action
  const addMaterial = () => {
      if (!newMaterialTitle || !tempFile) return;

      const type = tempFile.type.includes('image') ? 'Image' : tempFile.type.includes('pdf') ? 'PDF' : 'Note';
      const newMat: StudyMaterial = {
        id: crypto.randomUUID(),
        title: newMaterialTitle,
        type: type as any,
        fileName: tempFile.name,
        fileUrl: URL.createObjectURL(tempFile), // For demo only
        createdAt: new Date().toLocaleDateString()
      };

      setMaterials([...materials, newMat]);
      
      // Reset Inputs
      setNewMaterialTitle('');
      setTempFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const deleteMaterial = (id: string) => {
    setMaterials(materials.filter(m => m.id !== id));
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

  // --- Render Functions ---

  const renderTabs = () => (
    <div className="flex overflow-x-auto pb-2 gap-2 mb-8 border-b border-white/10 no-scrollbar">
      {[
        { id: 'generator', label: 'Plan Generator', icon: <Layers size={16} /> },
        { id: 'calendar', label: 'Calendar', icon: <Calendar size={16} /> },
        { id: 'materials', label: 'Study Materials', icon: <BookOpen size={16} /> },
        { id: 'tools', label: 'Focus Tools', icon: <Clock size={16} /> },
        { id: 'analytics', label: 'Analytics', icon: <BarChartIcon size={16} /> },
      ].map(tab => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id as TabType)}
          className={`flex items-center gap-2 px-4 py-2 rounded-t-lg text-sm font-medium transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-white/10 text-white border-b-2 border-red-500' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
        >
          {tab.icon} {tab.label}
        </button>
      ))}
    </div>
  );

  const renderGenerator = () => (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
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
                      <label className="text-[10px] uppercase font-mono text-gray-500 tracking-wider">Backlog Chapters</label>
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

          <div className="flex items-end border-b border-white/10 pb-4 mt-8">
            <h2 className="font-display text-lg font-bold text-white flex items-center gap-2">
              <Brain className="text-red-500" size={18} />
              Adaptive Context
            </h2>
          </div>
          <div className="glass-panel p-6 rounded-xl border border-white/10">
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               <div className="space-y-2">
                 <label className="text-[10px] uppercase font-mono text-gray-500 tracking-wider flex items-center gap-2"><Clock size={12} /> Daily Capacity (Study Hours)</label>
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
          
          <div className="flex justify-end pt-4">
             <button onClick={runRecoveryEngine} disabled={status !== CalculationStatus.VALID || isGenerating} className={`px-6 py-3 rounded-lg font-bold text-xs uppercase tracking-widest transition-all flex items-center gap-2 ${status === CalculationStatus.VALID ? 'bg-red-600 hover:bg-red-500 text-white shadow-[0_0_20px_rgba(220,38,38,0.4)]' : 'bg-white/5 text-gray-600 cursor-not-allowed border border-white/5'}`}>
               {isGenerating ? <RefreshCcw size={14} className="animate-spin" /> : <>Generate Plan <ArrowRight size={14} /></>}
             </button>
          </div>

          {results && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 mt-12 border-t border-white/10 pt-12">
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

              <div className="space-y-6">
                <div className="flex items-end justify-between border-b border-white/10 pb-4">
                  <h2 className="font-display text-lg font-bold text-white flex items-center gap-2">
                    <CalendarDays className="text-red-500" size={18} />
                    Active Recovery Plan
                  </h2>
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
                               <div key={task.id} 
                                    onClick={() => toggleTaskStatus(day.dayNumber, task.id)}
                                    className={`rounded-lg p-2.5 transition-all cursor-pointer border-l-2 select-none group ${getStatusColor(task.status)}`}
                                    style={{ borderLeftColor: task.type === 'Buffer' ? '#10B981' : task.status === 'Completed' ? '#10B981' : task.status === 'Missed' ? '#EF4444' : 'currentColor' }}
                               >
                                  <div className="flex justify-between items-start mb-1">
                                     <span className={`text-xs font-bold truncate max-w-[70%] group-hover:underline ${task.status === 'Completed' ? 'line-through opacity-50' : ''}`}>
                                       {task.subjectName}
                                     </span>
                                     <span className="text-[10px] opacity-70 font-mono">{formatDuration(task.durationMinutes)}</span>
                                  </div>
                                  <div className="flex items-center justify-between">
                                     <div className="flex items-center gap-1.5 opacity-70">
                                         {getTaskIcon(task.type)}
                                         <span className="text-[10px] uppercase tracking-wide">
                                           {task.type === 'Buffer' ? 'Extra' : task.type}
                                         </span>
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

            </motion.div>
          )}
    </motion.div>
  );

  const renderCalendar = () => {
    if (!results) return (
      <div className="text-center py-20 text-gray-500">
        <Calendar size={48} className="mx-auto mb-4 opacity-50" />
        <p>No plan generated yet. Go to the Generator to create your schedule.</p>
      </div>
    );

    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay(); 

    const days = [];
    for (let i = 0; i < startingDay; i++) {
        days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
        days.push(new Date(year, month, i));
    }

    const prevMonth = () => setCurrentMonth(new Date(year, month - 1, 1));
    const nextMonth = () => setCurrentMonth(new Date(year, month + 1, 1));
    
    // Find plan for selected date
    const selectedDateStr = selectedDate || new Date().toISOString().split('T')[0];
    const selectedDayPlan = results.weeklyPlan.days.find(d => d.dateString === selectedDateStr);

    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col lg:flex-row gap-8">
        <div className="flex-1">
            <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-display font-bold text-white">{currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h2>
            <div className="flex gap-2">
                <button onClick={prevMonth} className="p-2 hover:bg-white/10 rounded-lg"><ChevronLeft /></button>
                <button onClick={nextMonth} className="p-2 hover:bg-white/10 rounded-lg"><ChevronRight /></button>
            </div>
            </div>

            <div className="grid grid-cols-7 gap-px bg-white/10 rounded-xl overflow-hidden border border-white/10 shadow-2xl">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                <div key={d} className="bg-neutral-900 p-4 text-center text-xs font-bold text-gray-500 uppercase tracking-widest">{d}</div>
            ))}
            
            {days.map((date, idx) => {
                if (!date) return <div key={idx} className="bg-black min-h-[100px]"></div>;
                
                const dateStr = date.toISOString().split('T')[0];
                const dayPlan = results.weeklyPlan.days.find(d => d.dateString === dateStr);
                const isToday = new Date().toISOString().split('T')[0] === dateStr;
                const isSelected = selectedDate === dateStr;
                
                // Count tasks status
                const total = dayPlan?.tasks.length || 0;
                const completed = dayPlan?.tasks.filter(t => t.status === 'Completed').length || 0;
                const missed = dayPlan?.tasks.filter(t => t.status === 'Missed').length || 0;
                const hasTasks = total > 0;

                return (
                <div 
                    key={idx} 
                    onClick={() => setSelectedDate(dateStr)}
                    className={`bg-black min-h-[100px] p-3 border-t border-white/5 relative group cursor-pointer transition-all duration-200 
                        ${isSelected ? 'bg-white/[0.03] ring-1 ring-inset ring-red-500/50' : 'hover:bg-white/[0.02]'}
                        ${isToday ? 'bg-red-900/5' : ''}`}
                >
                    <div className="flex justify-between items-start mb-2">
                        <span className={`text-sm font-mono ${isToday ? 'text-red-500 font-bold' : 'text-gray-400'} ${isSelected ? 'text-white' : ''}`}>
                            {date.getDate()}
                        </span>
                        {hasTasks && (
                            <div className="flex gap-1">
                                {missed > 0 && <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>}
                                {completed === total ? <CheckCircle2 size={12} className="text-emerald-500" /> : <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>}
                            </div>
                        )}
                    </div>
                    
                    {hasTasks ? (
                        <div className="space-y-1">
                            {dayPlan?.tasks.slice(0, 3).map(task => (
                                <div key={task.id} className={`h-1.5 rounded-full w-full ${task.status === 'Completed' ? 'bg-emerald-500/30' : task.status === 'Missed' ? 'bg-red-500/30' : 'bg-white/10'}`}></div>
                            ))}
                            {dayPlan && dayPlan.tasks.length > 3 && <div className="text-[9px] text-gray-600 text-center">+{dayPlan.tasks.length - 3} more</div>}
                        </div>
                    ) : (
                        <div className="h-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                             <Plus size={12} className="text-gray-600" />
                        </div>
                    )}
                </div>
                );
            })}
            </div>
        </div>

        {/* Calendar Side Panel Detail View */}
        <AnimatePresence mode="wait">
            <motion.div 
                key={selectedDate}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="w-full lg:w-96 glass-panel border border-white/10 rounded-xl p-6 h-fit"
            >
                <div className="border-b border-white/10 pb-4 mb-4">
                    <h3 className="text-xl font-bold text-white mb-1">
                        {new Date(selectedDateStr).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric'})}
                    </h3>
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-gray-500 uppercase tracking-widest">
                            {selectedDayPlan ? `${selectedDayPlan.intensity} Intensity` : 'Free Day'}
                        </span>
                        {selectedDayPlan && (
                            <span className="px-2 py-0.5 rounded-full bg-white/5 text-[10px] text-gray-400">
                                {formatDuration(selectedDayPlan.totalMinutes)} Total
                            </span>
                        )}
                    </div>
                </div>

                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                    {!selectedDayPlan || selectedDayPlan.tasks.length === 0 ? (
                        <div className="text-center py-10 text-gray-600 italic">
                            No tasks scheduled for this day.
                        </div>
                    ) : (
                        selectedDayPlan.tasks.map(task => (
                            <div 
                                key={task.id}
                                onClick={() => toggleTaskStatus(selectedDayPlan.dayNumber, task.id)}
                                className={`p-3 rounded-lg border border-transparent hover:border-white/10 cursor-pointer transition-all group ${getStatusColor(task.status)} bg-black/40`}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <h4 className={`font-bold text-sm ${task.status === 'Completed' ? 'line-through opacity-50' : 'text-white'}`}>
                                        {task.subjectName}
                                    </h4>
                                    {task.status === 'Completed' && <CheckCircle2 size={16} className="text-emerald-500" />}
                                    {task.status === 'Missed' && <AlertCircle size={16} className="text-red-500" />}
                                </div>
                                <div className="flex justify-between items-end">
                                    <div className="flex items-center gap-2 text-xs text-gray-400">
                                        {getTaskIcon(task.type)}
                                        <span>{task.type}</span>
                                    </div>
                                    <span className="text-xs font-mono text-gray-500">{formatDuration(task.durationMinutes)}</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </motion.div>
        </AnimatePresence>
      </motion.div>
    );
  };

  const renderMaterials = () => (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
       <div className="glass-panel p-6 rounded-xl border border-white/10">
          <h3 className="font-bold text-white mb-4 flex items-center gap-2"><Upload size={18} /> Upload New Material</h3>
          <div className="flex flex-col md:flex-row gap-4 items-end">
             <div className="flex-1 space-y-2 w-full">
                <label className="text-xs text-gray-500 font-mono">TITLE</label>
                <input 
                  type="text" 
                  value={newMaterialTitle}
                  onChange={(e) => setNewMaterialTitle(e.target.value)}
                  placeholder="e.g. Chapter 4 Summary" 
                  className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-red-500 text-sm"
                />
             </div>
             <div className="flex-1 space-y-2 w-full">
                <label className="text-xs text-gray-500 font-mono">FILE</label>
                <div className="relative">
                    <input 
                    ref={fileInputRef}
                    type="file" 
                    onChange={handleFileSelect}
                    className="opacity-0 absolute inset-0 w-full h-full cursor-pointer z-10"
                    />
                    <div className={`bg-black/40 border rounded-lg p-3 text-sm flex items-center justify-between transition-colors ${tempFile ? 'border-red-500/50 text-white' : 'border-white/10 text-gray-400'}`}>
                        <span>{tempFile ? tempFile.name : "Choose file..."}</span>
                        <Upload size={14} className={tempFile ? 'text-red-500' : ''} />
                    </div>
                </div>
             </div>
             <button 
                onClick={addMaterial}
                disabled={!newMaterialTitle || !tempFile}
                className={`px-6 py-3 rounded-lg font-bold text-xs uppercase tracking-widest flex items-center gap-2 whitespace-nowrap transition-all ${(!newMaterialTitle || !tempFile) ? 'bg-white/5 text-gray-600 cursor-not-allowed' : 'bg-red-600 hover:bg-red-500 text-white shadow-lg'}`}
             >
                <Plus size={14} /> Add Material
             </button>
          </div>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {materials.length === 0 && <p className="text-gray-500 text-sm col-span-3 text-center py-10">No materials uploaded yet.</p>}
          {materials.map(mat => (
             <div key={mat.id} className="glass-panel p-4 rounded-xl border border-white/10 hover:border-red-500/30 transition-all group">
                <div className="flex justify-between items-start mb-4">
                   <div className="p-3 bg-white/5 rounded-lg text-red-500">
                      {mat.type === 'Image' ? <ImageIcon size={20} /> : <FileText size={20} />}
                   </div>
                   <button 
                    onClick={(e) => { e.stopPropagation(); deleteMaterial(mat.id); }} 
                    className="text-gray-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-white/5 rounded-lg"
                    title="Delete"
                   >
                       <Trash2 size={16}/>
                   </button>
                </div>
                <h4 className="font-bold text-white mb-1 truncate" title={mat.title}>{mat.title}</h4>
                <p className="text-xs text-gray-500 mb-4">{mat.fileName} • {mat.createdAt}</p>
                
                {mat.type === 'Image' && (
                    <div className="h-32 w-full bg-black/50 rounded mb-3 overflow-hidden border border-white/5">
                        <img src={mat.fileUrl} alt={mat.title} className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity" />
                    </div>
                )}
                
                <div className="flex gap-2 mt-4">
                    <a 
                        href={mat.fileUrl} 
                        target="_blank" 
                        rel="noreferrer"
                        className="flex-1 py-2 rounded bg-white/5 hover:bg-white/10 text-xs font-bold text-center text-gray-300 transition-colors flex items-center justify-center gap-2"
                    >
                        <Eye size={12} /> View
                    </a>
                    <a 
                        href={mat.fileUrl} 
                        download={mat.fileName} 
                        className="flex-1 py-2 rounded bg-red-600/10 hover:bg-red-600/20 border border-red-600/20 text-xs font-bold text-center text-red-400 transition-colors flex items-center justify-center gap-2"
                    >
                        <Download size={12} /> Download
                    </a>
                </div>
             </div>
          ))}
       </div>
    </motion.div>
  );

  const renderTools = () => (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-10">
       {/* Tool Selector */}
       <div className="flex justify-center gap-4">
           {[
               { id: 'pomodoro', label: 'Pomodoro', icon: <Timer size={18}/> },
               { id: 'stopwatch', label: 'Stopwatch', icon: <StopCircle size={18}/> },
               { id: 'breathing', label: 'Breathing', icon: <Wind size={18}/> }
           ].map(tool => (
               <button
                key={tool.id}
                onClick={() => setActiveTool(tool.id as any)}
                className={`px-6 py-3 rounded-full border flex items-center gap-2 transition-all ${activeTool === tool.id ? 'bg-red-600 border-red-500 text-white shadow-[0_0_15px_rgba(220,38,38,0.5)]' : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'}`}
               >
                   {tool.icon} {tool.label}
               </button>
           ))}
       </div>

       {/* POMODORO VIEW */}
       {activeTool === 'pomodoro' && (
           <div className="max-w-xl mx-auto text-center space-y-12 py-10">
                <div className="relative">
                    <div className="w-64 h-64 mx-auto rounded-full border-4 border-white/5 flex items-center justify-center relative">
                        <div className="absolute inset-0 rounded-full border-4 border-red-500 border-t-transparent animate-spin duration-[3000ms]" style={{ animationPlayState: isTimerRunning ? 'running' : 'paused' }}></div>
                        <div className="text-center z-10">
                            <span className="block text-6xl font-display font-bold text-white tracking-tighter tabular-nums">{formatSeconds(timerTime)}</span>
                            <span className={`text-sm font-mono uppercase tracking-widest mt-2 block ${timerMode === 'Work' ? 'text-red-500' : 'text-emerald-500'}`}>{timerMode} Mode</span>
                        </div>
                    </div>
                </div>
                <div className="flex justify-center gap-6">
                    <button onClick={() => setIsTimerRunning(!isTimerRunning)} className="w-16 h-16 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all hover:scale-110">
                        {isTimerRunning ? <Pause size={24} fill="white" /> : <Play size={24} fill="white" className="ml-1" />}
                    </button>
                    <button onClick={() => { setIsTimerRunning(false); setTimerTime(25*60); setTimerMode('Work'); }} className="w-16 h-16 rounded-full bg-white/5 hover:bg-red-500/20 hover:text-red-500 border border-white/10 flex items-center justify-center text-gray-400 transition-all hover:scale-110">
                        <Square size={20} />
                    </button>
                </div>
                <div className="glass-panel p-6 rounded-xl border border-white/10 text-left">
                    <h4 className="font-bold text-white mb-2 flex items-center gap-2"><Clock size={16} className="text-red-500"/> The Pomodoro Technique</h4>
                    <p className="text-sm text-gray-400">Work for 25 minutes, then take a 5 minute break. After 4 cycles, take a longer 15-30 minute break.</p>
                </div>
           </div>
       )}

       {/* STOPWATCH VIEW */}
       {activeTool === 'stopwatch' && (
           <div className="max-w-xl mx-auto text-center space-y-12 py-10">
                <div className="relative">
                    <div className="w-64 h-64 mx-auto rounded-full border-4 border-white/5 flex items-center justify-center relative bg-white/[0.02]">
                        <div className="text-center z-10">
                            <span className="block text-5xl font-display font-bold text-white tracking-widest tabular-nums">{formatStopwatch(stopwatchTime)}</span>
                            <span className="text-xs font-mono uppercase tracking-widest mt-4 block text-blue-500">Elapsed Time</span>
                        </div>
                    </div>
                </div>
                <div className="flex justify-center gap-6">
                    <button onClick={() => setIsStopwatchRunning(!isStopwatchRunning)} className="w-16 h-16 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all hover:scale-110">
                        {isStopwatchRunning ? <Pause size={24} fill="white" /> : <Play size={24} fill="white" className="ml-1" />}
                    </button>
                    <button onClick={() => { setIsStopwatchRunning(false); setStopwatchTime(0); }} className="w-16 h-16 rounded-full bg-white/5 hover:bg-red-500/20 hover:text-red-500 border border-white/10 flex items-center justify-center text-gray-400 transition-all hover:scale-110">
                        <RotateCcw size={20} />
                    </button>
                </div>
           </div>
       )}

       {/* BREATHING VIEW */}
       {activeTool === 'breathing' && (
           <div className="max-w-xl mx-auto text-center space-y-12 py-10">
                <div className="relative flex justify-center py-10">
                   <div className="w-48 h-48 bg-emerald-500/20 rounded-full flex items-center justify-center animate-pulse-slow relative">
                       <div className="absolute inset-0 bg-emerald-500/10 rounded-full animate-ping"></div>
                       <Wind size={64} className="text-emerald-400" />
                   </div>
                </div>
                <div className="glass-panel p-6 rounded-xl border border-white/10 text-center">
                    <h4 className="font-bold text-white mb-2">Box Breathing</h4>
                    <p className="text-sm text-gray-400">Inhale for 4 seconds, hold for 4, exhale for 4, hold for 4. Use this to reduce exam anxiety immediately.</p>
                </div>
           </div>
       )}
    </motion.div>
  );

  const renderAnalytics = () => {
    if (!results) return <div className="text-center text-gray-500 py-20">Generate a plan to see analytics.</div>;

    const taskDistribution = results.weeklyPlan.days.flatMap(d => d.tasks).reduce((acc: any, task) => {
       acc[task.subjectName] = (acc[task.subjectName] || 0) + 1;
       return acc;
    }, {});
    
    // Data for Pie Chart
    const pieData = Object.keys(taskDistribution).map(key => ({ name: key, value: taskDistribution[key] }));
    const COLORS = ['#DC2626', '#EA580C', '#D97706', '#059669', '#2563EB'];

    // Data for Bar Chart
    const completionData = [
       { name: 'Completed', value: results.weeklyPlan.days.flatMap(d => d.tasks).filter(t => t.status === 'Completed').length },
       { name: 'Missed', value: results.weeklyPlan.days.flatMap(d => d.tasks).filter(t => t.status === 'Missed').length },
       { name: 'Pending', value: results.weeklyPlan.days.flatMap(d => d.tasks).filter(t => t.status === 'Pending').length },
    ];

    // Data for Area Chart (Daily Effort Trend)
    const areaData = results.weeklyPlan.days.map(d => ({
        name: `Day ${d.dayNumber}`,
        minutes: d.totalMinutes
    }));

    // Data for Radar Chart (Subject Difficulty/Load)
    const radarData = subjects.map(s => ({
        subject: s.name,
        A: s.pressureScore || 50,
        fullMark: 100
    }));

    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
         {/* Top Stats Row */}
         <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
             <div className="glass-panel p-4 rounded-xl border border-white/10">
                 <h4 className="text-xs text-gray-500 font-mono">TOTAL HOURS</h4>
                 <p className="text-2xl font-bold text-white mt-1">{results.weeklyPlan.totalWeeklyHours}</p>
             </div>
             <div className="glass-panel p-4 rounded-xl border border-white/10">
                 <h4 className="text-xs text-gray-500 font-mono">TASKS</h4>
                 <p className="text-2xl font-bold text-white mt-1">{results.weeklyPlan.days.reduce((acc, d) => acc + d.tasks.length, 0)}</p>
             </div>
             <div className="glass-panel p-4 rounded-xl border border-white/10">
                 <h4 className="text-xs text-gray-500 font-mono">DAYS ACTIVE</h4>
                 <p className="text-2xl font-bold text-white mt-1">7</p>
             </div>
             <div className="glass-panel p-4 rounded-xl border border-white/10">
                 <h4 className="text-xs text-gray-500 font-mono">AVG/DAY</h4>
                 <p className="text-2xl font-bold text-white mt-1">{(results.weeklyPlan.totalWeeklyHours / 7).toFixed(1)}h</p>
             </div>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Daily Effort Trend - Area Chart */}
            <div className="glass-panel p-6 rounded-xl border border-white/10">
               <h3 className="text-sm font-bold text-white mb-6 uppercase tracking-wider flex items-center gap-2"><Activity size={16} className="text-red-500"/> Daily Workload Trend</h3>
               <div className="h-64">
                 <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={areaData}>
                        <defs>
                            <linearGradient id="colorMinutes" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#DC2626" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#DC2626" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                        <XAxis dataKey="name" stroke="#666" fontSize={10} />
                        <YAxis stroke="#666" fontSize={10} />
                        <RechartsTooltip contentStyle={{backgroundColor: '#111', border: '1px solid #333'}} />
                        <Area type="monotone" dataKey="minutes" stroke="#DC2626" fillOpacity={1} fill="url(#colorMinutes)" />
                    </AreaChart>
                 </ResponsiveContainer>
               </div>
            </div>

            {/* Subject Balance - Radar Chart */}
            <div className="glass-panel p-6 rounded-xl border border-white/10">
               <h3 className="text-sm font-bold text-white mb-6 uppercase tracking-wider flex items-center gap-2"><Target size={16} className="text-blue-500"/> Subject Pressure Map</h3>
               <div className="h-64">
                 <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                        <PolarGrid stroke="#333" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#888', fontSize: 10 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 150]} tick={false} />
                        <Radar name="Pressure" dataKey="A" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.6} />
                        <RechartsTooltip contentStyle={{backgroundColor: '#111', border: '1px solid #333'}} />
                    </RadarChart>
                 </ResponsiveContainer>
               </div>
            </div>

            {/* Completion Bar Chart */}
            <div className="glass-panel p-6 rounded-xl border border-white/10">
               <h3 className="text-sm font-bold text-white mb-6 uppercase tracking-wider flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-500"/> Task Completion</h3>
               <div className="h-64">
                 <ResponsiveContainer width="100%" height="100%">
                   <BarChart data={completionData}>
                     <XAxis dataKey="name" stroke="#555" tick={{fill: '#888', fontSize: 10}} />
                     <YAxis stroke="#555" tick={{fill: '#888', fontSize: 10}} />
                     <RechartsTooltip contentStyle={{backgroundColor: '#111', border: '1px solid #333'}} />
                     <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                       {completionData.map((entry, index) => (
                         <Cell key={`cell-${index}`} fill={index === 0 ? '#10B981' : index === 1 ? '#EF4444' : '#6B7280'} />
                       ))}
                     </Bar>
                   </BarChart>
                 </ResponsiveContainer>
               </div>
            </div>

            {/* Distribution Pie Chart */}
            <div className="glass-panel p-6 rounded-xl border border-white/10">
               <h3 className="text-sm font-bold text-white mb-6 uppercase tracking-wider flex items-center gap-2"><PieChart size={16} className="text-orange-500"/> Subject Distribution</h3>
               <div className="h-64">
                 <ResponsiveContainer width="100%" height="100%">
                    <RechartsPie>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip contentStyle={{backgroundColor: '#111', border: '1px solid #333'}} />
                    </RechartsPie>
                 </ResponsiveContainer>
               </div>
            </div>
         </div>

         <div className="glass-panel p-6 rounded-xl border border-white/10 bg-gradient-to-r from-red-900/10 to-transparent">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><Zap size={20} className="text-yellow-500" /> AI Insights</h3>
            <ul className="space-y-3 text-gray-400 text-sm">
               {results.adaptiveMetrics?.completionRate && results.adaptiveMetrics.completionRate < 60 ? (
                  <li className="flex items-start gap-2"><ArrowRight size={16} className="text-red-500 mt-0.5" /> Your completion rate is low. Try reducing your daily capacity in settings to make the plan more realistic.</li>
               ) : (
                  <li className="flex items-start gap-2"><ArrowRight size={16} className="text-emerald-500 mt-0.5" /> Great job keeping up! Consider increasing difficulty on your next module.</li>
               )}
               <li className="flex items-start gap-2"><ArrowRight size={16} className="text-blue-500 mt-0.5" /> You have a high workload on {results.weeklyPlan.days.reduce((max, d) => d.totalMinutes > max.totalMinutes ? d : max).label}. Use the Pomodoro timer to stay focused.</li>
               <li className="flex items-start gap-2"><ArrowRight size={16} className="text-orange-500 mt-0.5" /> Check the Calendar daily. Marking tasks as "Missed" helps the engine rebalance your schedule accurately.</li>
            </ul>
         </div>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen pt-28 pb-32 px-4 md:px-8 bg-black bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-neutral-900 via-black to-black">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="text-center md:text-left space-y-2">
                <h1 className="font-display text-4xl md:text-5xl font-bold text-white tracking-tight">
                    Study <span className="text-gradient">Engine</span>
                </h1>
            </div>
            
            <div className="flex flex-col items-end gap-2">
                 <button onClick={resetSession} className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-xs font-medium text-gray-400 hover:text-red-500 hover:border-red-500/30 transition-all">
                    <RotateCcw size={14} /> Reset Data
                 </button>
                 {lastSaved && (
                     <div className="flex items-center gap-1.5 text-[10px] text-gray-500 font-mono bg-black/40 px-3 py-1 rounded-full border border-white/5">
                        <Check size={10} className="text-emerald-500" />
                        SAVED {lastSaved}
                     </div>
                 )}
            </div>
        </div>

        {/* Tab Navigation */}
        {renderTabs()}

        {/* Tab Content */}
        <div className="min-h-[500px]">
          {activeTab === 'generator' && renderGenerator()}
          {activeTab === 'calendar' && renderCalendar()}
          {activeTab === 'materials' && renderMaterials()}
          {activeTab === 'tools' && renderTools()}
          {activeTab === 'analytics' && renderAnalytics()}
        </div>

        {/* Action Bar (Only for Generator Tab or when Actions needed) */}
        {activeTab === 'generator' && (
          <div className="fixed bottom-0 left-0 w-full bg-black/80 backdrop-blur-xl border-t border-white/10 p-6 z-40">
            <div className="max-w-6xl mx-auto flex items-center justify-between">
              <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${status === CalculationStatus.VALID ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                  <div><p className="text-xs font-mono text-gray-400 uppercase tracking-widest">{status === CalculationStatus.VALID ? 'SYSTEM READY' : 'AWAITING INPUT'}</p></div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default Engine;