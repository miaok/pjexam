import React, { useState, useMemo, useEffect, useRef} from 'react';
import { createRoot } from 'react-dom/client';
import { localQuestions} from './questions.ts';
import {
  saveProgress,
  loadProgress,
  clearProgress,
} from './storage';
import useQuiz from './hooks/useQuiz';
import useBlindTasting from './hooks/useBlindTasting';
import { baijiuOptions } from './utils';
import StatsPage from './pages/StatsPage';
import BlindTastingQuiz from './pages/BlindTastingQuiz.tsx';
import QuizPage from './pages/QuizPage';
import WelcomePage from './pages/WelcomePage';
import { SettingsProvider, useSettings } from './context/SettingsContext';

type GameState = 'idle' | 'active' | 'finished';

type BaijiuUserAnswer = {
    香型: string;
    酒度: string;
    总分: string;
    设备: string[];
    发酵剂: string[];
};

const initialBaijiuAnswer: BaijiuUserAnswer = { 香型: '', 酒度: '', 总分: '92.0', 设备: [], 发酵剂: [] };

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>('idle');
  const [score, setScore] = useState(0);
  const maxCounts = useMemo(() => {
    return localQuestions.reduce((acc, q) => {
      acc[q.type] = (acc[q.type] || 0) + 1;
      return acc;
    }, {} as { boolean: number; single: number; multiple: number });
  }, []);

  // 从 context 获取全局设置
  const {
    quizMode,
    isRapidMode,
    questionCounts,
    shuffleOptions,
    baijiuFields,
    setIsRapidMode,
    setIsDarkMode,
    setQuestionCounts,
    setShuffleOptions,
    setBaijiuFields,
    isDarkMode,
    setQuizMode
  } = useSettings();

  const typeOrder = { boolean: 0, single: 1, multiple: 2 };

  // hooks
  const quiz = useQuiz({
    quizMode,
    questionCounts,
    shuffleOptions,
    isRapidMode,
    maxCounts,
    typeOrder,
    onQuizFinish: (score, finished) => {
      setScore(score);
      if (finished) setGameState('finished');
    },
  });
  const blind = useBlindTasting({ baijiuFields });

  // 退出/返回首页
  const handleExit = () => {
    setGameState('idle');
    setScore(0);
    quiz.startQuiz(); // 重置 quiz 状态
    blind.playAgain(); // 重置品鉴状态
  };

  // 开始学习
  const handleStart = () => {
    setGameState('active');
    setScore(0);
    if (quizMode === 'blind') {
      blind.startBlindTasting();
    } else {
      quiz.startQuiz();
    }
  };

  // 返回首页（统计页专用）
  const handleBackFromStats = () => {
    setQuizMode('exam');
    setGameState('idle');
    quiz.startQuiz();
  };

  const renderContent = () => {
    if (quizMode === 'stats') {
      return <StatsPage onBack={handleBackFromStats} />;
    }
    switch (gameState) {
      case 'active':
      case 'finished':
        if (quizMode === 'blind') {
          if (gameState === 'finished') {
            blind.playAgain();
            return null;
          }
          return <BlindTastingQuiz
            currentSample={blind.baijiuQuestions[blind.currentBaijiuIndex]}
            currentIndex={blind.currentBaijiuIndex}
            total={blind.baijiuQuestions.length}
            baijiuUserAnswer={blind.baijiuUserAnswer}
            isBaijiuAnswerConfirmed={blind.isBaijiuAnswerConfirmed}
            activeBaijiuFields={blind.activeBaijiuFields}
            baijiuOptions={baijiuOptions}
            onScoreAdjust={blind.handleBaijiuScoreAdjust}
            onSelectChange={blind.handleBaijiuSelectChange}
            onMultiSelectChange={blind.handleBaijiuMultiSelectChange}
            onAction={blind.handleBaijiuAction}
            onExit={handleExit}
          />;
        }
        return (
          <QuizPage
            quiz={quiz}
            score={score}
            gameState={gameState}
            handleExit={handleExit}
            clearProgress={clearProgress}
            setGameState={setGameState}
            setScore={setScore}
          />
        );
      default:
        return (
          <WelcomePage handleStart={handleStart} />
        );
    }
  };

  const hasRestoredRef = useRef(false);

  // 首次加载自动恢复进度
  useEffect(() => {
    if (hasRestoredRef.current) return;
    const saved = loadProgress();
    if (saved) {
      setGameState(saved.gameState ?? 'idle');
      quiz.setQuestions(saved.questions ?? []);
      quiz.setCurrentQuestionIndex(saved.currentQuestionIndex ?? 0);
      quiz.setUserAnswers(saved.userAnswers ?? []);
      setScore(saved.score ?? 0);
      quiz.setIsCurrentConfirmed(saved.isCurrentConfirmed ?? false);
      quiz.setConfirmedAnswers(saved.confirmedAnswers ?? []);
      setIsRapidMode(saved.isRapidMode ?? true);
      quiz.setTimeLeft(saved.timeLeft ?? null);
      quiz.setExamStartTimestamp(saved.examStartTimestamp ?? null);
      quiz.setReviewingWrongOnly(saved.reviewingWrongOnly ?? false);
      quiz.setWrongQuestionIndices(saved.wrongQuestionIndices ?? []);
      quiz.setCurrentWrongQuestionDisplayIndex(saved.currentWrongQuestionDisplayIndex ?? 0);
      quiz.setFlaggedQuestions(saved.flaggedQuestions ?? new Set());
      setIsDarkMode(saved.isDarkMode ?? false);
      blind.setBaijiuQuestions(saved.baijiuQuestions ?? []);
      blind.setCurrentBaijiuIndex(saved.currentBaijiuIndex ?? 0);
      blind.setBaijiuUserAnswer(saved.baijiuUserAnswer ?? initialBaijiuAnswer);
      blind.setIsBaijiuAnswerConfirmed(saved.isBaijiuAnswerConfirmed ?? false);
      setQuestionCounts(saved.questionCounts ?? {
        boolean: Math.min(30, maxCounts.boolean || 0),
        single: Math.min(30, maxCounts.single || 0),
        multiple: Math.min(40, maxCounts.multiple || 0),
      });
      setShuffleOptions(saved.shuffleOptions ?? true);
      setBaijiuFields(saved.baijiuFields ?? {
        香型: true,
        酒度: true,
        总分: true,
        设备: true,
        发酵剂: true,
      });
    }
    hasRestoredRef.current = true;
  }, []);

  // 自动保存进度
  useEffect(() => {
    if (!hasRestoredRef.current) return;
    const progress = {
      gameState,
      quizMode,
      questions: quiz.questions,
      currentQuestionIndex: quiz.currentQuestionIndex,
      userAnswers: quiz.userAnswers,
      score,
      isCurrentConfirmed: quiz.isCurrentConfirmed,
      confirmedAnswers: quiz.confirmedAnswers,
      isRapidMode,
      timeLeft: quiz.timeLeft,
      examStartTimestamp: quiz.examStartTimestamp,
      reviewingWrongOnly: quiz.reviewingWrongOnly,
      wrongQuestionIndices: quiz.wrongQuestionIndices,
      currentWrongQuestionDisplayIndex: quiz.currentWrongQuestionDisplayIndex,
      flaggedQuestions: Array.from(quiz.flaggedQuestions),
      isDarkMode,
      baijiuQuestions: blind.baijiuQuestions,
      currentBaijiuIndex: blind.currentBaijiuIndex,
      baijiuUserAnswer: blind.baijiuUserAnswer,
      isBaijiuAnswerConfirmed: blind.isBaijiuAnswerConfirmed,
      questionCounts,
      shuffleOptions,
      baijiuFields,
    };
    saveProgress(progress);
  }, [gameState, quizMode, quiz.questions, quiz.currentQuestionIndex, quiz.userAnswers, score, quiz.isCurrentConfirmed, quiz.confirmedAnswers, isRapidMode, quiz.timeLeft, quiz.examStartTimestamp, quiz.reviewingWrongOnly, quiz.wrongQuestionIndices, quiz.currentWrongQuestionDisplayIndex, quiz.flaggedQuestions, isDarkMode, blind.baijiuQuestions, blind.currentBaijiuIndex, blind.baijiuUserAnswer, blind.isBaijiuAnswerConfirmed, questionCounts, shuffleOptions, baijiuFields]);

  useEffect(() => {
    document.body.dataset.theme = isDarkMode ? 'dark' : 'light';
  }, [isDarkMode]);

  return <div className="quiz-container">{renderContent()}</div>;
};

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(
  <SettingsProvider initial={{
    quizMode: 'exam',
    questionCounts: { boolean: 30, single: 30, multiple: 40 },
    maxCounts: (localQuestions as any[]).reduce((acc, q) => {
      acc[q.type] = (acc[q.type] || 0) + 1;
      return acc;
    }, { boolean: 0, single: 0, multiple: 0 }),
    shuffleOptions: true,
    isRapidMode: true,
    isDarkMode: false,
    baijiuFields: { 香型: true, 酒度: true, 总分: true, 设备: true, 发酵剂: true }
  }}>
    <App />
  </SettingsProvider>
);