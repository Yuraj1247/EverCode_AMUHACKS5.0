export interface Subject {
  id: string;
  name: string;
  chapters: number;
  priority: number; 
}

export interface RecoveryPlan {
  subjects: Subject[];
  deadline: string;
  dailyHours: number;
  stressLevel: number;
  score: number;
  level: 'Low' | 'Moderate' | 'High' | 'Critical';
  generatedDate: string;
  dailySchedule: DailySchedule[];
}

export interface DailySchedule {
  day: number;
  tasks: string[];
  focus: string;
  hours: number;
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