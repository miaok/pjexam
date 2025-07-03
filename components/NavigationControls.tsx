import React from 'react';

export type NavigationControlsProps = {
  reviewingWrongOnly: boolean;
  currentWrongQuestionDisplayIndex?: number;
  wrongQuestionIndicesLength?: number;
  onWrongReviewNav?: (direction: 'prev' | 'next') => void;
  currentQuestionIndex: number;
  questionsLength: number;
  goToQuestion: (index: number) => void;
  isFinished: boolean;
  isExamMode: boolean;
  isPracticeMode: boolean;
  isPracticeAndConfirmed: boolean;
  confirmedAnswers: boolean[];
  handleConfirmAnswer: () => void;
  isAnswered: boolean;
  showNavButtons: boolean;
  finishQuiz: () => void;
};

const NavigationControls: React.FC<NavigationControlsProps> = ({
  reviewingWrongOnly,
  onWrongReviewNav,
  currentQuestionIndex,
  questionsLength,
  goToQuestion,
  isPracticeMode,
  finishQuiz
}) => {
  return (
    <div className="navigation-controls">
      {reviewingWrongOnly ? (
        <>
          <button onClick={() => onWrongReviewNav && onWrongReviewNav('prev')}>上一题</button>
          <button onClick={() => onWrongReviewNav && onWrongReviewNav('next')}>下一题</button>
        </>
      ) : (
        <>
          <button onClick={() => goToQuestion(currentQuestionIndex - 1)}>上一题</button>
          {currentQuestionIndex === questionsLength - 1 ? (
            <button onClick={finishQuiz}>{isPracticeMode ? '结束练习' : '结束考试'}</button>
          ) : (
            <button onClick={() => goToQuestion(currentQuestionIndex + 1)}>下一题</button>
          )}
        </>
      )}
    </div>
  );
};

export default NavigationControls;
