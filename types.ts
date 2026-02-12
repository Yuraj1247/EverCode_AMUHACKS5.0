export type DifficultyLevel = 'Low' | 'Moderate' | 'High';
export type StressLevel = 'Low' | 'Moderate' | 'High';
export type LearningPace = 'Slow' | 'Moderate' | 'Fast';

export type PressureCategory = 'Critical' | 'High' | 'Moderate' | 'Low';

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
}

export interface StudentProfile {
  availableHoursPerDay: number;
  learningPace: LearningPace;
  stressLevel: StressLevel;
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
}

export interface ContactForm {
  name: string;
  email: string;
  message: string;
}