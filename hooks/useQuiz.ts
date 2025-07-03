import { useState, useEffect, useCallback, useMemo} from 'react';
import { localQuestions, Question, QuestionType } from '@/questions';
import { getStats, updateStats, addExamRecord } from '@/utils/storage';
import { getQuestionKey } from '@/utils';
import { QuizMode } from '@/utils/types';

const EXAM_DURATION_MINUTES = 10;

export default function useQuiz({
  quizMode,
  questionCounts,
  shuffleOptions,
  isRapidMode,
  typeOrder,
  onQuizFinish
}: {
  quizMode: QuizMode;
  questionCounts: { [key in QuestionType]: number };
  shuffleOptions: boolean;
  isRapidMode: boolean;
  maxCounts: { [key in QuestionType]: number };
  typeOrder: Record<QuestionType, number>;
  onQuizFinish?: (score: number, finished?: boolean) => void;
}) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [userAnswers, setUserAnswers] = useState<(string | string[] | null)[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [isCurrentConfirmed, setIsCurrentConfirmed] = useState(false);
  const [confirmedAnswers, setConfirmedAnswers] = useState<boolean[]>([]);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [examStartTimestamp, setExamStartTimestamp] = useState<number | null>(null);
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<number>>(new Set());
  const [reviewingWrongOnly, setReviewingWrongOnly] = useState(false);
  const [wrongQuestionIndices, setWrongQuestionIndices] = useState<number[]>([]);
  const [currentWrongQuestionDisplayIndex, setCurrentWrongQuestionDisplayIndex] = useState(0);

  // shuffleArray
  const shuffleArray = <T,>(array: T[]): T[] => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  };

  // startQuiz
  const startQuiz = useCallback(() => {
    const stats = getStats();
    const groupedQuestions = localQuestions.reduce((acc, q) => {
      if (!acc[q.type]) acc[q.type] = [];
      acc[q.type].push(q);
      return acc;
    }, {} as Record<QuestionType, Question[]>);
    let selectedQuestions: Question[] = [];
    (Object.keys(groupedQuestions) as QuestionType[]).forEach(type => {
      const count = Math.min(questionCounts[type], groupedQuestions[type]?.length || 0);
      let group = groupedQuestions[type].slice();
      group.sort((a, b) => {
        const ka = getQuestionKey(a);
        const kb = getQuestionKey(b);
        const sa = stats[ka] || { total: 0, wrong: 0 };
        const sb = stats[kb] || { total: 0, wrong: 0 };
        if (sb.wrong !== sa.wrong) return sb.wrong - sa.wrong;
        return Math.random() - 0.5;
      });
      let chosen = group.slice(0, count);
      if (shuffleOptions) {
        chosen = chosen.map(q => ({ ...q, options: shuffleArray(q.options) }));
      }
      selectedQuestions.push(...chosen);
    });
    const questionData = selectedQuestions.sort((a, b) => typeOrder[a.type] - typeOrder[b.type]);
    setQuestions(questionData);
    setUserAnswers(new Array(questionData.length).fill(null));
    setCurrentQuestionIndex(0);
    setScore(0);
    setIsCurrentConfirmed(false);
    setConfirmedAnswers(new Array(questionData.length).fill(false));
    setFlaggedQuestions(new Set());
    if (quizMode === 'exam') {
      setExamStartTimestamp(Date.now());
      setTimeLeft(EXAM_DURATION_MINUTES * 60);
    } else {
      setExamStartTimestamp(null);
      setTimeLeft(null);
    }
  }, [questionCounts, shuffleOptions, quizMode, typeOrder]);

  // goToQuestion
  const goToQuestion = (index: number) => {
    const safeIndex = Math.max(0, Math.min(index, questions.length - 1));
    setCurrentQuestionIndex(safeIndex);
    setIsCurrentConfirmed(quizMode === 'practice' && confirmedAnswers[safeIndex]);
  };

  // handleSelectAnswer
  const handleSelectAnswer = (option: string) => {
    const newAnswers = [...userAnswers];
    const currentQuestion = questions[currentQuestionIndex];
    const questionType = currentQuestion.type;
    if (questionType === 'multiple') {
      const currentSelection = (newAnswers[currentQuestionIndex] as string[] | null) || [];
      if (currentSelection.includes(option)) {
        newAnswers[currentQuestionIndex] = currentSelection.filter(item => item !== option);
      } else {
        newAnswers[currentQuestionIndex] = [...currentSelection, option];
      }
    } else {
      newAnswers[currentQuestionIndex] = option;
    }
    setUserAnswers(newAnswers);
    const isLastQuestion = currentQuestionIndex === questions.length - 1;
    if (isRapidMode && (questionType === 'single' || questionType === 'boolean')) {
      if (quizMode === 'practice') {
        handleConfirmAnswer();
        const isCorrect = (() => {
          const correctAnswer = currentQuestion.answer;
          if (Array.isArray(correctAnswer)) {
            return Array.isArray(option) && correctAnswer.length === option.length && correctAnswer.every((v, i) => v === option[i]);
          }
          return option === correctAnswer;
        })();
        if (isCorrect && !isLastQuestion) {
          setTimeout(() => {
            goToQuestion(currentQuestionIndex + 1);
          }, 800);
        }
      } else {
        if (!isLastQuestion) {
          setTimeout(() => goToQuestion(currentQuestionIndex + 1), 200);
        }
      }
    }
  };

  // handleConfirmAnswer
  const handleConfirmAnswer = () => {
    setIsCurrentConfirmed(true);
    const newConfirmed = [...confirmedAnswers];
    newConfirmed[currentQuestionIndex] = true;
    setConfirmedAnswers(newConfirmed);
    const q = questions[currentQuestionIndex];
    const userAns = userAnswers[currentQuestionIndex];
    const key = getQuestionKey(q);
    const isWrong = (() => {
      const correctAnswer = q.answer;
      if (q.type === 'multiple') {
        if (!Array.isArray(userAns) || !Array.isArray(correctAnswer)) return true;
        const userSet = new Set(userAns);
        const correctSet = new Set(correctAnswer);
        return userSet.size !== correctSet.size || [...userSet].some(x => !correctSet.has(x));
      }
      return userAns !== correctAnswer;
    })();
    updateStats(key, isWrong);
  };

  // finishQuiz
  const finishQuiz = useCallback(() => {
    let finalScore = 0;
    questions.forEach((q, i) => {
      const correctAnswer = q.answer;
      const userAns = userAnswers[i];
      let isCorrect = false;
      if (q.type === 'multiple') {
        if (Array.isArray(userAns) && Array.isArray(correctAnswer)) {
          const userSet = new Set(userAns);
          const correctSet = new Set(correctAnswer);
          isCorrect = userSet.size === correctSet.size && [...userSet].every(x => correctSet.has(x));
        }
      } else {
        isCorrect = userAns === correctAnswer;
      }
      if (isCorrect) finalScore++;
      const key = getQuestionKey(q);
      const isWrong = !isCorrect;
      updateStats(key, isWrong);
    });
    setScore(finalScore);
    setTimeLeft(null);
    if (quizMode === 'exam') {
      const used = (EXAM_DURATION_MINUTES * 60) - (timeLeft ?? 0);
      addExamRecord({
        score: finalScore,
        total: questions.length,
        duration: used,
        timestamp: Date.now(),
      });
    }
    if (onQuizFinish) onQuizFinish(finalScore, true);
  }, [questions, userAnswers, quizMode, timeLeft, onQuizFinish]);

  // handleToggleFlag
  const handleToggleFlag = useCallback(() => {
    setFlaggedQuestions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(currentQuestionIndex)) {
        newSet.delete(currentQuestionIndex);
      } else {
        newSet.add(currentQuestionIndex);
      }
      return newSet;
    });
  }, [currentQuestionIndex]);

  // handleToggleReviewingWrongOnly
  const handleToggleReviewingWrongOnly = () => {
    if (!reviewingWrongOnly) {
      const wrongs = questions.reduce<number[]>((acc, q, i) => {
        const correctAnswer = q.answer;
        const userAns = userAnswers[i];
        let isCorrect = false;
        if (q.type === 'multiple') {
          if (Array.isArray(userAns) && Array.isArray(correctAnswer)) {
            const userSet = new Set(userAns);
            const correctSet = new Set(correctAnswer);
            isCorrect = userSet.size === correctSet.size && [...userSet].every(x => correctSet.has(x));
          }
        } else {
          isCorrect = userAns === correctAnswer;
        }
        if (!isCorrect) acc.push(i);
        return acc;
      }, []);
      setWrongQuestionIndices(wrongs);
      setCurrentWrongQuestionDisplayIndex(0);
      if (wrongs.length > 0) setCurrentQuestionIndex(wrongs[0]);
    } else {
      setCurrentWrongQuestionDisplayIndex(0);
      setCurrentQuestionIndex(0);
    }
    setReviewingWrongOnly(v => !v);
  };

  // handleWrongReviewNav
  const handleWrongReviewNav = (direction: 'prev' | 'next') => {
    const newDisplayIndex = direction === 'prev' ? currentWrongQuestionDisplayIndex - 1 : currentWrongQuestionDisplayIndex + 1;
    if (newDisplayIndex >= 0 && newDisplayIndex < wrongQuestionIndices.length) {
      setCurrentWrongQuestionDisplayIndex(newDisplayIndex);
      setCurrentQuestionIndex(wrongQuestionIndices[newDisplayIndex]);
    }
  };

  // 考试倒计时 effect
  useEffect(() => {
    if (quizMode === 'exam' && examStartTimestamp) {
      const updateTime = () => {
        const now = Date.now();
        const elapsed = Math.floor((now - examStartTimestamp) / 1000);
        const left = EXAM_DURATION_MINUTES * 60 - elapsed;
        setTimeLeft(left > 0 ? left : 0);
        if (left <= 0) {
          finishQuiz();
        }
      };
      updateTime();
      const intervalId = setInterval(updateTime, 1000);
      return () => clearInterval(intervalId);
    }
  }, [quizMode, examStartTimestamp, finishQuiz]);

  // hasWrongAnswers 计算属性
  const hasWrongAnswers = useMemo(() => {
    return questions.some((q, i) => {
      const correctAnswer = q.answer;
      const userAns = userAnswers[i];
      if (q.type === 'multiple') {
        if (!Array.isArray(userAns) || !Array.isArray(correctAnswer)) return true;
        const userSet = new Set(userAns);
        const correctSet = new Set(correctAnswer);
        return userSet.size !== correctSet.size || [...userSet].some(x => !correctSet.has(x));
      }
      return userAns !== correctAnswer;
    });
  }, [questions, userAnswers]);

  return {
    questions,
    userAnswers,
    currentQuestionIndex,
    score,
    isCurrentConfirmed,
    confirmedAnswers,
    timeLeft,
    examStartTimestamp,
    flaggedQuestions,
    reviewingWrongOnly,
    wrongQuestionIndices,
    currentWrongQuestionDisplayIndex,
    setQuestions,
    setUserAnswers,
    setCurrentQuestionIndex,
    setScore,
    setIsCurrentConfirmed,
    setConfirmedAnswers,
    setTimeLeft,
    setExamStartTimestamp,
    setFlaggedQuestions,
    setReviewingWrongOnly,
    setWrongQuestionIndices,
    setCurrentWrongQuestionDisplayIndex,
    shuffleArray,
    startQuiz,
    goToQuestion,
    handleSelectAnswer,
    handleConfirmAnswer,
    finishQuiz,
    handleToggleFlag,
    handleToggleReviewingWrongOnly,
    handleWrongReviewNav,
    hasWrongAnswers,
  };
}

export type UseQuizReturn = ReturnType<typeof useQuiz>; 