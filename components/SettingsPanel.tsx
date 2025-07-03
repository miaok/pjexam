import React from 'react';
import { QuestionType } from '../questions';
import { useSettings } from '../context/SettingsContext';

import { QUESTION_TYPE_LABELS } from '../constants';

const getQuestionTypeLabel = (type: QuestionType): string => {
  return QUESTION_TYPE_LABELS[type] || '';
};

const SettingsPanel: React.FC = () => {
  const {
    questionCounts,
    maxCounts,
    shuffleOptions,
    isRapidMode,
    setQuestionCounts,
    setShuffleOptions,
    setIsRapidMode
  } = useSettings();
  const sortedTypes = (Object.keys(maxCounts) as QuestionType[]).sort((a, b) => {
    const order: Record<QuestionType, number> = { boolean: 0, single: 1, multiple: 2 };
    return order[a] - order[b];
  });
  return (
    <div className="settings-container">
      <div className="settings-grid">
        {sortedTypes.map(type => (
          <div className="setting-item" key={type}>
            <label htmlFor={`count-${type}`}>{getQuestionTypeLabel(type)}</label>
            <input
              type="number"
              id={`count-${type}`}
              value={questionCounts[type]}
              onChange={e => setQuestionCounts({ ...questionCounts, [type]: parseInt(e.target.value, 10) })}
              min="0"
              max={maxCounts[type]}
              aria-label={`Number of ${getQuestionTypeLabel(type)} questions`}
            />
          </div>
        ))}
      </div>
      <div className="settings-checkbox-container">
        <div className="setting-item-checkbox">
          <input
            type="checkbox"
            id="shuffle"
            checked={shuffleOptions}
            onChange={e => setShuffleOptions(e.target.checked)}
          />
          <label htmlFor="shuffle">选项乱序</label>
        </div>
        <div className="setting-item-checkbox">
          <input
            type="checkbox"
            id="rapid"
            checked={isRapidMode}
            onChange={e => setIsRapidMode(e.target.checked)}
          />
          <label htmlFor="rapid">极速切题</label>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel; 