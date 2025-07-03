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

// baijiuOptions 常量
export const baijiuOptions = {
  香型: [
    '浓香型', '多粮浓香型', '清香型', '小曲清香型', '麸曲清香型', '大麸清香型',
    '酱香型', '米香型', '兼香型', '凤香型', '豉香型', '特香型', '芝麻香型',
    '董香型', '老白干型', '馥郁香型'
  ],
  酒度: ['30', '42', '45', '50', '52', '53', '54', '55'],
  设备: ['泥窖', '地缸', '石窖', '砖窖', '水泥窖', '瓷砖窖', '发酵罐', '陶罐'],
  发酵剂: ['大曲', '小曲', '麸曲', '酵母']
}; 