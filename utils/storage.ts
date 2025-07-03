// storage.ts

import { STORAGE_KEYS } from '@/constants';
import { ExamRecord } from '@/utils/types';

export function saveProgress(mode: 'exam' | 'practice' | 'blind', progress: any) {
  try {
    localStorage.setItem(STORAGE_KEYS[`progress_${mode}`], JSON.stringify(progress));
  } catch {}
}

export function loadProgress(mode: 'exam' | 'practice' | 'blind'): any | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS[`progress_${mode}`]);
    if (!raw) return null;
    const data = JSON.parse(raw);
    // 反序列化 Set
    if (data.flaggedQuestions) {
      data.flaggedQuestions = new Set(data.flaggedQuestions);
    }
    return data;
  } catch {
    return null;
  }
}

export function clearProgress(mode: 'exam' | 'practice' | 'blind') {
  try {
    localStorage.removeItem(STORAGE_KEYS[`progress_${mode}`]);
  } catch {}
}

export function getStats(): Record<string, { total: number; wrong: number }> {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.stats);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export function updateStats(key: string, isWrong: boolean) {
  const stats = getStats();
  if (!stats[key]) stats[key] = { total: 0, wrong: 0 };
  stats[key].total += 1;
  if (isWrong) stats[key].wrong += 1;
  localStorage.setItem(STORAGE_KEYS.stats, JSON.stringify(stats));
}

export function clearStats() {
  localStorage.removeItem(STORAGE_KEYS.stats);
}

export function getExamRecords(): ExamRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.examRecords);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function addExamRecord(record: ExamRecord) {
  const records = getExamRecords();
  records.unshift(record);
  if (records.length > 10) records.length = 10;
  localStorage.setItem(STORAGE_KEYS.examRecords, JSON.stringify(records));
}

export function getQuestionKey(q: { question: string; options: string[] }) {
  // 简单hash：题干+所有选项拼接
  return q.question + '||' + q.options.join('|');
}

export function clearAllQuizData() {
  try {
    localStorage.removeItem(STORAGE_KEYS.progress_exam);
    localStorage.removeItem(STORAGE_KEYS.progress_practice);
    localStorage.removeItem(STORAGE_KEYS.progress_blind);
    localStorage.removeItem(STORAGE_KEYS.stats);
    localStorage.removeItem(STORAGE_KEYS.examRecords);
  } catch {}
} 