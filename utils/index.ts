import { BAIJIU_OPTIONS } from '@/constants';

export const baijiuOptions = BAIJIU_OPTIONS;

// 题目唯一 key 生成
export function getQuestionKey(q: { question: string; options: string[] }) {
  return q.question + '||' + q.options.join('|');
}

// 时间格式化
export function formatTime(seconds: number): string {
  if (seconds < 0) return '00:00';
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
}

// 正确答案文本
export function getCorrectAnswerText(question: { answer: string | string[] }) {
  if (Array.isArray(question.answer)) {
    return question.answer.join(', ');
  }
  return question.answer;
} 