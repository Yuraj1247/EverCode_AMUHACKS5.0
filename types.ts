export type LearningPace = 'Slow' | 'Medium' | 'Fast';

export interface Subject {
  id: string;
  name: string;
  units: number; // Chapters or topics
  difficulty: number; // 1-5
  deadline: string;
  color?: string;
  pressureScore?: number; // Calculated
}

export interface RecoveryPlan {
  subjects: Subject[];
  config: {
    dailyHours: number;
    stressLevel: number;
    pace: LearningPace;
  };
  stats: {
    totalPressure: number;
    recoveryScore: number; // 0-100
    label: string;
    estimatedDays: number;
  };
  schedule: DailySchedule[];
  generatedAt: string;
}

export interface DailySchedule {
  day: number;
  date: string; // ISO string
  blocks: StudyBlock[];
  totalHours: number;
  bufferHours: number;
}

export interface StudyBlock {
  subjectId: string;
  subjectName: string;
  duration: number; // in hours
  focus: string; // "Chapters 1-2" etc.
}

export interface ContactForm {
  name: string;
  email: string;
  message: string;
}

export enum CalculationStatus {
  IDLE = 'IDLE',
  CALCULATING = 'CALCULATING',
  COMPLETE = 'COMPLETE'
}