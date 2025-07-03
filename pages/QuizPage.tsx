import React from 'react';
import OptionsGrid from '../components/OptionsGrid';
import NavigationControls from '../components/NavigationControls';
import AnswerSheet from '../components/AnswerSheet';
import FinalScorePanel from '../components/FinalScorePanel';
import { getCorrectAnswerText, formatTime } from '../utils';
import { GameState } from '../utils/types';
import { UseQuizReturn } from '../hooks/useQuiz';
import { useSettings } from '../context/SettingsContext';

const getQuestionTypeLabel = (type: any) => {
    switch (type) {
        case 'single': return '单选';
        case 'multiple': return '多选';
        case 'boolean': return '判断';
        default: return '';
    }
};

interface QuizPageProps {
  quiz: UseQuizReturn;
  score: number;
  gameState: GameState;
  handleExit: () => void;
  clearProgress: () => void;
  setGameState: (state: GameState) => void;
  setScore: (score: number) => void;
}

const QuizPage: React.FC<QuizPageProps> = ({
  quiz,
  score,
  gameState,
  handleExit,
  clearProgress,
  setGameState,
  setScore,
}) => {
  const { quizMode, isRapidMode } = useSettings();
  const currentQuestion = quiz.questions[quiz.currentQuestionIndex];
  const isFinished = gameState === 'finished';
  const isExamMode = quizMode === 'exam';
  const isPracticeMode = quizMode === 'practice';
  const isPracticeAndConfirmed = isPracticeMode && quiz.confirmedAnswers[quiz.currentQuestionIndex];
  const shouldShowFeedback = isFinished || isPracticeAndConfirmed;
  const userAnswer = quiz.userAnswers[quiz.currentQuestionIndex];
  const isAnswered = userAnswer !== null && (!Array.isArray(userAnswer) || userAnswer.length > 0);
  const showNavButtons = !(isRapidMode && isExamMode && (currentQuestion.type === 'single' || currentQuestion.type === 'boolean'));

  return (
    <div className="quiz-layout">
      <div className="main-content">
        {gameState === 'active' && quiz.flaggedQuestions.size > 0 && (
          <p className="flagged-info">{quiz.flaggedQuestions.size}题答案待定</p>
        )}
        <div className="question-meta">
          <p className="question-header">
            {isFinished && quiz.reviewingWrongOnly
              ? `错题 ${quiz.currentWrongQuestionDisplayIndex + 1} / ${quiz.wrongQuestionIndices.length}`
              : `题 ${quiz.currentQuestionIndex + 1} / ${quiz.questions.length}`
            }
          </p>
          <div className="question-meta-right">
            <button 
              className={`flag-btn ${quiz.flaggedQuestions.has(quiz.currentQuestionIndex) ? 'active' : ''}`}
              onClick={quiz.handleToggleFlag}
              disabled={gameState === 'finished'}
              aria-label="Flag question for review"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                <path d="M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6h-5.6z" />
              </svg>
            </button>
            <span className="question-type-tag">{getQuestionTypeLabel(currentQuestion.type)}</span>
            {isExamMode && gameState === 'active' && quiz.timeLeft !== null && (
              <div className="timer">{formatTime(quiz.timeLeft)}</div>
            )}
            <button className="navigation-controls-exit-btn" onClick={handleExit}>退出</button>
          </div>
        </div>

        {/* 新增：分数展示和回顾按钮 */}
        {isFinished && (
          <FinalScorePanel score={score} hasWrongAnswers={quiz.hasWrongAnswers} reviewingWrongOnly={quiz.reviewingWrongOnly} onToggleReviewingWrongOnly={quiz.handleToggleReviewingWrongOnly} onRestart={() => { clearProgress(); setScore(0); quiz.startQuiz(); setGameState('active'); }} />
        )}

        <h2 className="question-text">{currentQuestion.question}</h2>
        <OptionsGrid
          options={currentQuestion.options}
          selected={userAnswer}
          answer={currentQuestion.answer}
          showFeedback={shouldShowFeedback}
          questionType={currentQuestion.type}
          onSelect={quiz.handleSelectAnswer}
          disabled={isFinished || isPracticeAndConfirmed}
        />

        {shouldShowFeedback && (
          <div className="feedback-text">正确答案: {getCorrectAnswerText(currentQuestion)}</div>
        )}

        <NavigationControls
          reviewingWrongOnly={quiz.reviewingWrongOnly}
          currentWrongQuestionDisplayIndex={quiz.currentWrongQuestionDisplayIndex}
          wrongQuestionIndicesLength={quiz.wrongQuestionIndices.length}
          onWrongReviewNav={quiz.handleWrongReviewNav}
          currentQuestionIndex={quiz.currentQuestionIndex}
          questionsLength={quiz.questions.length}
          goToQuestion={quiz.goToQuestion}
          isFinished={isFinished}
          isExamMode={isExamMode}
          isPracticeMode={isPracticeMode}
          isPracticeAndConfirmed={isPracticeAndConfirmed}
          confirmedAnswers={quiz.confirmedAnswers}
          handleConfirmAnswer={quiz.handleConfirmAnswer}
          isAnswered={isAnswered}
          showNavButtons={showNavButtons}
          finishQuiz={quiz.finishQuiz}
        />
      </div>

      <div className="sidebar-content">
        <AnswerSheet 
          total={quiz.questions.length}
          userAnswers={quiz.userAnswers}
          correctAnswers={quiz.questions.map((q: any) => q.answer)}
          currentQuestionIndex={quiz.currentQuestionIndex}
          onSelectQuestion={quiz.goToQuestion}
          isFinished={isFinished}
          questions={quiz.questions}
          quizMode={quizMode}
          confirmedAnswers={quiz.confirmedAnswers}
          flaggedQuestions={quiz.flaggedQuestions}
        />
      </div>
    </div>
  );
};

export default QuizPage; 