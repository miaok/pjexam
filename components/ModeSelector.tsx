import React from 'react';
import { useSettings } from '../context/SettingsContext';

const ModeSelector: React.FC = () => {
  const { quizMode, setQuizMode } = useSettings();
  return (
    <div className="mode-selector-container">
      <button
        className={`mode-btn ${quizMode === 'exam' ? 'active' : ''}`}
        onClick={() => setQuizMode('exam')}
        aria-pressed={quizMode === 'exam'}
      >
        考试
      </button>
      <button
        className={`mode-btn ${quizMode === 'practice' ? 'active' : ''}`}
        onClick={() => setQuizMode('practice')}
        aria-pressed={quizMode === 'practice'}
      >
        练习
      </button>
      <button
        className={`mode-btn ${quizMode === 'blind' ? 'active' : ''}`}
        onClick={() => setQuizMode('blind')}
        aria-pressed={quizMode === 'blind'}
      >
        品鉴
      </button>
      <button
        className={`mode-btn ${quizMode === 'stats' ? 'active' : ''}`}
        onClick={() => setQuizMode('stats')}
        aria-pressed={quizMode === 'stats'}
      >
        统计
      </button>
    </div>
  );
};

export default ModeSelector; 