export type DifficultyLevel = 'Low' | 'Moderate' | 'High';
export type StressLevel = 'Low' | 'Moderate' | 'High';
export type LearningPace = 'Slow' | 'Moderate' | 'Fast';

export type PressureCategory = 'Critical' | 'High' | 'Moderate' | 'Low';
export type PriorityTier = 'Critical Priority' | 'High Priority' | 'Medium Priority' | 'Low Priority';

export interface Subject {
  id: string;
  name: string;
  backlogChapters: number;
  deadline: string; // ISO date string
  difficulty: DifficultyLevel;
  
  // Phase 2: Dynamic Metrics
  daysRemaining?: number;
  urgencyScore?: number;
  urgencyLabel?: string;
  urgencyColor?: string; // Tailwind class string

  // Phase 3: Pressure Engine
  difficultyWeight?: number;
  pressureScore?: number;
  pressureCategory?: PressureCategory;
  pressureColor?: string; // Gradient class

  // Phase 5: Prioritization Engine
  priorityRank?: number;
  priorityTier?: PriorityTier;
  priorityExplanation?: string;

  // Phase 6: Time Allocation Engine
  allocatedHours?: number;
  allocationPercentage?: number;
}

export interface StudentProfile {
  availableHoursPerDay: number;
  learningPace: LearningPace;
  stressLevel: StressLevel;
}

// Phase 4: Recovery Engine Metrics
export interface RecoveryMetrics {
  totalPressure: number;
  weeklyCapacity: number;
  loadRatio: number;
  difficultyScore: number;
  recoveryCategory: 'Low' | 'Moderate' | 'High' | 'Critical';
  message: string;
  color: string; // Tailwind color class for UI
}

// Phase 6: Allocation Summary
export interface AllocationMetrics {
  totalAllocated: number;
  bufferTime: number;
  remainingTime: number;
  maxSubjectName: string;
  isBalanced: boolean;
  message: string;
}

// Phase 7 & Adaptive Modules
export type TaskType = 'Deep Work' | 'Revision' | 'Practice' | 'Buffer';
export type TaskStatus = 'Pending' | 'Completed' | 'Partially Completed' | 'Missed';

export interface PlanTask {
  id: string;
  subjectId: string;
  subjectName: string;
  type: TaskType;
  durationMinutes: number;
  color: string;
  status: TaskStatus; // New: Track status
}

export interface DayPlan {
  dayNumber: number;
  label: string;
  intensity: 'High' | 'Moderate' | 'Light' | 'Recovery';
  tasks: PlanTask[];
  totalMinutes: number;
  bufferMinutes: number;
}

export interface WeeklyPlan {
  days: DayPlan[];
  totalWeeklyHours: number;
  estimatedRecoveryDays: number;
  highestDay: number;
}

// New: Module 7 Analytics
export interface AdaptiveMetrics {
  completionRate: number;
  stressTrend: 'Increasing' | 'Stable' | 'Decreasing';
  burnoutRisk: boolean;
  effectiveDailyOutput: number; // hours per day
  projectedRecoveryDate: string;
  loadAdjustmentFactor: number;
  mostChallengingSubject: string;
}

export interface EngineResults {
  prioritizedSubjects: Subject[];
  recoveryMetrics: RecoveryMetrics;
  allocationData: { allocatedSubjects: Subject[], metrics: AllocationMetrics };
  weeklyPlan: WeeklyPlan;
  adaptiveMetrics?: AdaptiveMetrics; // New
  generatedAt: string;
}

export interface RecoverySession {
  subjects: Subject[];
  profile: StudentProfile;
  results: EngineResults | null;
  history: {
    completionRates: number[];
    stressLevels: StressLevel[];
  };
}

export enum CalculationStatus {
  IDLE = 'IDLE',
  VALID = 'VALID',
  INVALID = 'INVALID'
}

export interface ContactForm {
  name: string;
  email: string;
  message: string;
}