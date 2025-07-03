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
  currentWrongQuestionDisplayIndex = 0,
  wrongQuestionIndicesLength = 0,
  onWrongReviewNav,
  currentQuestionIndex,
  questionsLength,
  goToQuestion,
  isFinished,
  isExamMode,
  isPracticeMode,
  isPracticeAndConfirmed,
  confirmedAnswers,
  handleConfirmAnswer,
  isAnswered,
  showNavButtons,
  finishQuiz
}) => {
  return (
    <div className="navigation-controls">
      {reviewingWrongOnly ? (
        <>
          <button onClick={() => onWrongReviewNav && onWrongReviewNav('prev')} disabled={currentWrongQuestionDisplayIndex === 0}>上一题</button>
          <button onClick={() => onWrongReviewNav && onWrongReviewNav('next')} disabled={currentWrongQuestionDisplayIndex === wrongQuestionIndicesLength - 1}>下一题</button>
        </>
      ) : (
        <>
          <button onClick={() => goToQuestion(currentQuestionIndex - 1)}>上一题</button>
          {/* 只要在最后一题就显示结束按钮，无论是否已答 */}
          {currentQuestionIndex === questionsLength - 1 ? (
            <button onClick={finishQuiz}>{isPracticeMode ? '结束练习' : '结束考试'}</button>
          ) : (
            isFinished ? (
              <button onClick={() => goToQuestion(currentQuestionIndex + 1)} disabled={currentQuestionIndex === questionsLength - 1}>下一题</button>
            ) : (
              isExamMode ? (
                <button onClick={() => goToQuestion(currentQuestionIndex + 1)}>下一题</button>
              ) : (
                showNavButtons && (
                  isPracticeMode ? (
                    isPracticeAndConfirmed || confirmedAnswers[currentQuestionIndex] ? (
                      <button onClick={() => goToQuestion(currentQuestionIndex + 1)}>下一题</button>
                    ) : (
                      <button onClick={handleConfirmAnswer} disabled={!isAnswered}>确认答案</button>
                    )
                  ) : (
                    <button onClick={() => goToQuestion(currentQuestionIndex + 1)}>下一题</button>
                  )
                )
              )
            )
          )}
        </>
      )}
    </div>
  );
};

export default NavigationControls;
