export type GameState = 'idle' | 'active' | 'finished';
export type QuizMode = 'exam' | 'practice' | 'blind' | 'stats';
export type QuestionType = 'single' | 'multiple' | 'boolean';

// 白酒品鉴答案类型
export type BaijiuUserAnswer = {
    香型: string;
    酒度: string;
    总分: string;
    设备: string[];
    发酵剂: string[];
};

// 白酒样品类型
export type BaijiuSample = {
    酒样名称: string;
    香型: string;
    酒度: number;
    总分: number;
    设备: string;
    发酵剂: string;
};

// 白酒品鉴字段配置类型
export type BaijiuFields = {
    香型: boolean;
    酒度: boolean;
    总分: boolean;
    设备: boolean;
    发酵剂: boolean;
};

// 统计页面属性类型
export type StatsPageProps = {
    onBack: () => void;
};

// 考试记录类型
export type ExamRecord = {
    score: number;
    total: number;
    duration: number;
    timestamp: number;
};

// 白酒字段选择器属性类型
export type BaijiuFieldsSelectorProps = {
    baijiuFields: Record<string, boolean>;
    onFieldChange: (field: string, checked: boolean) => void;
}; 