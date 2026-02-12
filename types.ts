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

// Phase 7: Weekly Execution Plan
export type TaskType = 'Deep Work' | 'Revision' | 'Practice' | 'Buffer';

export interface PlanTask {
  id: string;
  subjectId: string;
  subjectName: string;
  type: TaskType;
  durationMinutes: number;
  color: string;
  isCompleted: boolean;
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

export enum CalculationStatus {
  IDLE = 'IDLE',
  VALID = 'VALID',
  INVALID = 'INVALID'
}

// Placeholder for future phases
export interface RecoveryPlan {
  subjects: Subject[];
  profile: StudentProfile;
  generatedAt: string;
  metrics: RecoveryMetrics;
  allocation: AllocationMetrics;
  weeklyPlan: WeeklyPlan;
}

export interface ContactForm {
  name: string;
  email: string;
  message: string;
}