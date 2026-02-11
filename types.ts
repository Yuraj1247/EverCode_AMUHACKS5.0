export type DifficultyLevel = 'Low' | 'Moderate' | 'High';
export type StressLevel = 'Low' | 'Moderate' | 'High';
export type LearningPace = 'Slow' | 'Moderate' | 'Fast';

export interface Subject {
  id: string;
  name: string;
  backlogChapters: number;
  deadline: string; // ISO date string
  difficulty: DifficultyLevel;
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