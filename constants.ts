// 存储相关常量
export const STORAGE_KEYS = {
  progress_exam: 'pjexam-progress-exam-v1',
  progress_practice: 'pjexam-progress-practice-v1',
  progress_blind: 'pjexam-progress-blind-v1',
  stats: 'pjexam-stats-v1',
  examRecords: 'pjexam-exam-records-v1',
};

// 白酒相关常量
export const BAIJIU_OPTIONS = {
  香型: [
    '浓香型', '多粮浓香型', '清香型', '小曲清香型', '麸曲清香型', '大麸清香型',
    '酱香型', '米香型', '兼香型', '凤香型', '豉香型', '特香型', '芝麻香型',
    '董香型', '老白干型', '馥郁香型'
  ],
  酒度: ['30', '42', '45', '50', '52', '53', '54', '55'],
  设备: ['泥窖', '地缸', '石窖', '砖窖', '水泥窖', '瓷砖窖', '发酵罐', '陶罐'],
  发酵剂: ['大曲', '小曲', '麸曲', '酵母']
};

// 默认值相关常量
export const DEFAULT_BAIJIU_ANSWER = {
  香型: '',
  酒度: '',
  总分: '92.0',
  设备: [],
  发酵剂: []
};

export const DEFAULT_BAIJIU_FIELDS = {
  香型: true,
  酒度: true,
  总分: true,
  设备: true,
  发酵剂: true
};

// 题目类型相关常量
export const QUESTION_TYPE_ORDER = {
  boolean: 0,
  single: 1,
  multiple: 2
};

export const QUESTION_TYPE_LABELS = {
  single: '单选',
  multiple: '多选',
  boolean: '判断'
};

// 考试模式默认题目数量
export const DEFAULT_EXAM_COUNTS = {
  boolean: 30,
  single: 30,
  multiple: 40
};

// 品酒相关常量
export const TASTING_CONSTANTS = {
  defaultScore: 92.0,
  optimalTemperature: {
    min: 20,
    max: 25
  },
  tastingTime: 10 // 秒
}; 