import React from 'react';
import { QuestionType } from '../questions';

export type OptionsGridProps = {
  options: string[];
  selected: string | string[] | null;
  answer: string | string[];
  showFeedback: boolean;
  questionType: QuestionType;
  onSelect: (option: string) => void;
  disabled?: boolean;
};

const OptionsGrid: React.FC<OptionsGridProps> = ({
  options,
  selected,
  answer,
  showFeedback,
  questionType,
  onSelect,
  disabled
}) => {
  return (
    <div className="options-grid">
      {options.map((option, index) => {
        let btnClass = 'option-btn';
        let isSelected = false;
        if (questionType === 'multiple') {
          isSelected = (selected as string[] | null)?.includes(option) ?? false;
        } else {
          isSelected = selected === option;
        }
        if (showFeedback) {
          const isCorrect = Array.isArray(answer)
            ? answer.includes(option)
            : answer === option;
          if (isCorrect) {
            btnClass += ' correct';
          } else if (isSelected) {
            btnClass += ' incorrect';
          }
        } else if (isSelected) {
          btnClass += ' selected';
        }
        return (
          <button
            key={index}
            className={btnClass}
            onClick={() => onSelect(option)}
            disabled={disabled}
            aria-pressed={isSelected}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
};

export default OptionsGrid; 