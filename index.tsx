import React, { useState, useMemo, useEffect, useCallback, useRef, useLayoutEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { localQuestions, Question, QuestionType } from './questions.ts';

type GameState = 'idle' | 'active' | 'finished';
type QuizMode = 'practice' | 'exam';

const EXAM_DURATION_MINUTES = 15;

const getQuestionTypeLabel = (type: QuestionType): string => {
    switch (type) {
        case 'single': return '单选';
        case 'multiple': return '多选';
        case 'boolean': return '判断';
        default: return '';
    }
};

const isCorrectUtil = (question: Question, userAnswer: string | string[] | null): boolean => {
    const correctAnswer = question.answer;
    if (correctAnswer === null || correctAnswer === undefined || userAnswer === null) return false;

    if (question.type === 'multiple') {
        if (!Array.isArray(userAnswer) || !Array.isArray(correctAnswer)) return false;
        const userAnswerSet = new Set(userAnswer);
        const correctAnswerSet = new Set(correctAnswer);
        return userAnswerSet.size === correctAnswerSet.size && [...userAnswerSet].every(item => correctAnswerSet.has(item));
    }
    return userAnswer === correctAnswer;
};

type AnswerSheetProps = {
    total: number;
    userAnswers: (string | string[] | null)[];
    correctAnswers: (string | string[])[];
    currentQuestionIndex: number;
    onSelectQuestion: ((index: number) => void) | null;
    isFinished: boolean;
    questions: Question[];
    quizMode: QuizMode;
    confirmedAnswers: boolean[];
    flaggedQuestions: Set<number>;
};

const AnswerSheet: React.FC<AnswerSheetProps> = ({ total, userAnswers, correctAnswers, currentQuestionIndex, onSelectQuestion, isFinished, questions, quizMode, confirmedAnswers, flaggedQuestions }) => {
    const [itemsPerPage, setItemsPerPage] = useState(18);
    const [currentPage, setCurrentPage] = useState(0);
    const [open, setOpen] = useState(true);
    const sheetRef = useRef<HTMLDivElement>(null);

    const calculateItemsPerPage = useCallback(() => {
        if (sheetRef.current) {
            const container = sheetRef.current;
            if (container) {
                const containerWidth = container.clientWidth;
                const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
                const itemWidth = 36;
                const gap = 0.75 * rem;

                if (containerWidth > 0) {
                    const numCols = Math.max(1, Math.floor((containerWidth + gap) / (itemWidth + gap)));
                    const numRows = 5;
                    const newItems = numCols * numRows;
                    if (newItems !== itemsPerPage) {
                        setItemsPerPage(newItems);
                    }
                }
            }
        }
    }, [itemsPerPage]);

    useLayoutEffect(() => {
        calculateItemsPerPage();
        window.addEventListener('resize', calculateItemsPerPage);
        return () => window.removeEventListener('resize', calculateItemsPerPage);
    }, [calculateItemsPerPage]);
    
    const totalPages = Math.ceil(total / itemsPerPage);

    useEffect(() => {
        setCurrentPage(prevPage => {
            const newPage = Math.floor(currentQuestionIndex / itemsPerPage);
            if (prevPage !== newPage) {
                return newPage;
            }
            return prevPage;
        });
    }, [currentQuestionIndex, itemsPerPage, setCurrentPage]);


    const isCorrect = (index: number) => {
        const question = questions[index];
        const userAnswer = userAnswers[index];
        return isCorrectUtil(question, userAnswer);
    };

    const handlePageChange = (direction: 'next' | 'prev') => {
        const newPage = direction === 'next' ? currentPage + 1 : currentPage - 1;
        if (newPage >= 0 && newPage < totalPages) {
            setCurrentPage(newPage);
        }
    };
    
    const startIndex = currentPage * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, total);

    return (
        <div className="answer-sheet-container">
            <div
                className={`answer-sheet-header${open ? ' open' : ''}`}
                onClick={() => setOpen(o => !o)}
                role="button"
                aria-expanded={open}
            >
                <h3>答题卡</h3>
                <span className="accordion-arrow">▲</span>
            </div>
            <div className={`answer-sheet-accordion${open ? ' open' : ''}`}>
                <div className="answer-sheet-content">
                    <div className="answer-sheet" ref={sheetRef}>
                    {[...Array(endIndex - startIndex)].map((_, i) => {
                        const index = startIndex + i;
                        let itemClass = 'answer-sheet-item';

                        if (flaggedQuestions.has(index)) {
                            itemClass += ' flagged';
                        }
                        
                        const userAnswer = userAnswers[index];
                        const isPracticeAndConfirmed = quizMode === 'practice' && confirmedAnswers[index];
                        
                        if (isFinished || isPracticeAndConfirmed) {
                            if (isCorrect(index)) {
                                itemClass += ' correct';
                            } else {
                                itemClass += ' incorrect';
                            }
                        } else {
                            const isAnswered = userAnswer !== null && (!Array.isArray(userAnswer) || userAnswer.length > 0);
                            if (isAnswered) {
                                itemClass += ' answered';
                            }
                        }
                        if (index === currentQuestionIndex) {
                            itemClass += ' current';
                        }


                        return (
                            <button key={index} className={itemClass} onClick={() => onSelectQuestion && onSelectQuestion(index)} aria-label={`Go to question ${index + 1}`} disabled={onSelectQuestion === null}>
                                {index + 1}
                            </button>
                        );
                    })}
                    </div>
                    {totalPages > 1 && (
                        <div className="answer-sheet-pagination">
                            <button onClick={() => handlePageChange('prev')} disabled={currentPage === 0}>&lt;</button>
                            <span>{currentPage + 1} / {totalPages}</span>
                            <button onClick={() => handlePageChange('next')} disabled={currentPage >= totalPages - 1}>&gt;</button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};


const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>('idle');
  const [quizMode, setQuizMode] = useState<QuizMode>('exam');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<(string | string[] | null)[]>([]);
  const [score, setScore] = useState(0);
  const [isCurrentConfirmed, setIsCurrentConfirmed] = useState(false);
  const [confirmedAnswers, setConfirmedAnswers] = useState<boolean[]>([]);
  const [isRapidMode, setIsRapidMode] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [reviewingWrongOnly, setReviewingWrongOnly] = useState(false);
  const [wrongQuestionIndices, setWrongQuestionIndices] = useState<number[]>([]);
  const [currentWrongQuestionDisplayIndex, setCurrentWrongQuestionDisplayIndex] = useState(0);
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<number>>(new Set());
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isAnalysisVisible, setIsAnalysisVisible] = useState(false);

  useEffect(() => {
    document.body.dataset.theme = isDarkMode ? 'dark' : 'light';
  }, [isDarkMode]);
  
  const typeOrder: Record<QuestionType, number> = {
    boolean: 0,
    single: 1,
    multiple: 2,
  };

  const hasWrongAnswers = useMemo(() => {
    if (gameState !== 'finished') return false;
    return userAnswers.some((ans, i) => !isCorrectUtil(questions[i], ans));
  }, [gameState, userAnswers, questions]);

  const scoreAnalysis = useMemo(() => {
    if (gameState !== 'finished') {
      return null;
    }

    const analysis = questions.reduce((acc, question, index) => {
      const type = question.type;
      if (!acc[type]) {
        acc[type] = { correct: 0, total: 0 };
      }

      acc[type].total++;
      if (isCorrectUtil(question, userAnswers[index])) {
        acc[type].correct++;
      }
      
      return acc;
    }, {} as Record<QuestionType, { correct: number, total: number }>);
    
    return (Object.keys(analysis) as QuestionType[])
      .sort((a, b) => typeOrder[a] - typeOrder[b])
      .map(type => ({
        type,
        ...analysis[type]
      }));

  }, [gameState, questions, userAnswers]);

  const maxCounts = useMemo(() => {
    return localQuestions.reduce((acc, q) => {
        acc[q.type] = (acc[q.type] || 0) + 1;
        return acc;
    }, {} as { [key in QuestionType]: number });
  }, []);

  const [questionCounts, setQuestionCounts] = useState<{ [key in QuestionType]: number }>({
    boolean: Math.min(30, maxCounts.boolean || 0),
    single: Math.min(30, maxCounts.single || 0),
    multiple: Math.min(40, maxCounts.multiple || 0),
  });
  const [shuffleOptions, setShuffleOptions] = useState(true);

  const handleModeChange = (newMode: QuizMode) => {
    setQuizMode(newMode);
    if (newMode === 'exam') {
        setQuestionCounts({
            boolean: Math.min(30, maxCounts.boolean || 0),
            single: Math.min(30, maxCounts.single || 0),
            multiple: Math.min(40, maxCounts.multiple || 0),
        });
    } else { // practice mode
        setQuestionCounts({
            boolean: maxCounts.boolean || 0,
            single: maxCounts.single || 0,
            multiple: maxCounts.multiple || 0,
        });
    }
  };

  const shuffleArray = <T,>(array: T[]): T[] => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  };

  const startQuiz = () => {
    const groupedQuestions = localQuestions.reduce((acc, q) => {
        if (!acc[q.type]) acc[q.type] = [];
        acc[q.type].push(q);
        return acc;
    }, {} as Record<QuestionType, Question[]>);

    let selectedQuestions: Question[] = [];
    (Object.keys(groupedQuestions) as QuestionType[]).forEach(type => {
        const count = Math.min(questionCounts[type], groupedQuestions[type]?.length || 0);
        const shuffledGroup = shuffleArray(groupedQuestions[type]);
        selectedQuestions.push(...shuffledGroup.slice(0, count));
    });

    if (shuffleOptions) {
        selectedQuestions = selectedQuestions.map(q => ({
            ...q,
            options: shuffleArray(q.options),
        }));
    }
    
    const questionData = selectedQuestions.sort((a, b) => typeOrder[a.type] - typeOrder[b.type]);
    
    setQuestions(questionData);
    setUserAnswers(new Array(questionData.length).fill(null));
    setCurrentQuestionIndex(0);
    setScore(0);
    setGameState('active');
    setIsCurrentConfirmed(false);
    setConfirmedAnswers(new Array(questionData.length).fill(false));
    setFlaggedQuestions(new Set());
    if (quizMode === 'exam') {
        setTimeLeft(EXAM_DURATION_MINUTES * 60);
    } else {
        setTimeLeft(null);
    }
  };

  const goToQuestion = (index: number) => {
    if (index >= 0 && index < questions.length) {
      setCurrentQuestionIndex(index);
      setIsCurrentConfirmed(quizMode === 'practice' && confirmedAnswers[index]);
    }
  };

  const handleConfirmAnswer = () => {
    setIsCurrentConfirmed(true);
    const newConfirmed = [...confirmedAnswers];
    newConfirmed[currentQuestionIndex] = true;
    setConfirmedAnswers(newConfirmed);
  };
  
  const finishQuiz = useCallback(() => {
    let finalScore = 0;
    questions.forEach((q, i) => {
        if (isCorrectUtil(q, userAnswers[i])) {
            finalScore++;
        }
    });
    setScore(finalScore);
    setGameState('finished');
    setTimeLeft(null);
  }, [questions, userAnswers]);
  
  // This effect handles finishing the quiz when time runs out.
  useEffect(() => {
    if (gameState === 'active' && quizMode === 'exam' && timeLeft !== null && timeLeft <= 0) {
      finishQuiz();
    }
  }, [gameState, quizMode, timeLeft, finishQuiz]);

  // This effect manages the countdown interval. It's designed to not reset on every tick,
  // which prevents the timer from stuttering during rapid UI updates (like switching questions).
  useEffect(() => {
    if (gameState === 'active' && quizMode === 'exam' && timeLeft !== null && timeLeft > 0) {
      const intervalId = setInterval(() => {
        setTimeLeft(prevTime => (prevTime !== null ? prevTime - 1 : null));
      }, 1000);

      return () => clearInterval(intervalId);
    }
  }, [gameState, quizMode, timeLeft !== null && timeLeft > 0]);


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
    } else { // 'single' or 'boolean'
        newAnswers[currentQuestionIndex] = option;
    }
    setUserAnswers(newAnswers);

    const isLastQuestion = currentQuestionIndex === questions.length - 1;

    if (isRapidMode && (questionType === 'single' || questionType === 'boolean')) {
        if (quizMode === 'practice') {
            handleConfirmAnswer();

            const isCorrect = isCorrectUtil(currentQuestion, option);

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

  const playAgain = () => {
    setGameState('idle');
    setQuestions([]);
    setUserAnswers([]);
    setConfirmedAnswers([]);
    setTimeLeft(null);
    setReviewingWrongOnly(false);
    setWrongQuestionIndices([]);
    setCurrentWrongQuestionDisplayIndex(0);
    setFlaggedQuestions(new Set());
    setIsAnalysisVisible(false);
  };

  const handleToggleFlag = useCallback(() => {
    if (gameState !== 'active') return;
    setFlaggedQuestions(prev => {
        const newSet = new Set(prev);
        if (newSet.has(currentQuestionIndex)) {
            newSet.delete(currentQuestionIndex);
        } else {
            newSet.add(currentQuestionIndex);
        }
        return newSet;
    });
  }, [currentQuestionIndex, gameState]);

  const handleReviewWrong = () => {
    const wrongIndices = questions.reduce<number[]>((acc, q, i) => {
        if (!isCorrectUtil(q, userAnswers[i])) {
            acc.push(i);
        }
        return acc;
    }, []);

    if (wrongIndices.length > 0) {
        setWrongQuestionIndices(wrongIndices);
        setCurrentWrongQuestionDisplayIndex(0);
        setCurrentQuestionIndex(wrongIndices[0]);
        setReviewingWrongOnly(true);
    }
  };

  const handleReviewAll = () => {
    setReviewingWrongOnly(false);
    setCurrentQuestionIndex(0);
  };

  const handleWrongReviewNav = (direction: 'prev' | 'next') => {
    const newDisplayIndex = direction === 'prev' ? currentWrongQuestionDisplayIndex - 1 : currentWrongQuestionDisplayIndex + 1;
    if (newDisplayIndex >= 0 && newDisplayIndex < wrongQuestionIndices.length) {
        setCurrentWrongQuestionDisplayIndex(newDisplayIndex);
        setCurrentQuestionIndex(wrongQuestionIndices[newDisplayIndex]);
    }
  };
  
  const getCorrectAnswerText = (question: Question): string => {
      if (Array.isArray(question.answer)) {
          return question.answer.join(', ');
      }
      return question.answer;
  };

  const formatTime = (seconds: number): string => {
    if (seconds < 0) return '00:00';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
  };
  
  const handleCountChange = (type: QuestionType, value: string) => {
    const numValue = parseInt(value, 10);
    const max = maxCounts[type] || 0;
    if (value === '') {
        setQuestionCounts(prev => ({...prev, [type]: 0}));
    } else if (!isNaN(numValue) && numValue >= 0 && numValue <= max) {
        setQuestionCounts(prev => ({ ...prev, [type]: numValue }));
    }
  };

  const renderContent = () => {
    switch (gameState) {
      case 'active':
      case 'finished':
        if (questions.length === 0) {
            return (
                <div className="welcome-container">
                    <h1>No Questions Selected</h1>
                    <p style={{ margin: '1rem 0 2rem' }}>Please go back and select at least one question to start the quiz.</p>
                    <button className="action-btn" onClick={playAgain}>
                        Back to Settings
                    </button>
                </div>
            );
        }
        const currentQuestion = questions[currentQuestionIndex];
        const isFinished = gameState === 'finished';
        const isExamMode = quizMode === 'exam';
        const isPracticeMode = quizMode === 'practice';
        const isPracticeAndConfirmed = isPracticeMode && confirmedAnswers[currentQuestionIndex];
        const shouldShowFeedback = isFinished || isPracticeAndConfirmed;
        const userAnswer = userAnswers[currentQuestionIndex];
        const isAnswered = userAnswer !== null && (!Array.isArray(userAnswer) || userAnswer.length > 0);
        const showNavButtons = !(isRapidMode && isExamMode && (currentQuestion.type === 'single' || currentQuestion.type === 'boolean'));
        
        return (
            <div className="quiz-layout">
                <div className="main-content">
                    {gameState === 'active' && flaggedQuestions.size > 0 && (
                        <p className="flagged-info">{flaggedQuestions.size}题答案待定</p>
                    )}
                    <div className="question-meta">
                        <p className="question-header">
                          {isFinished && reviewingWrongOnly
                            ? `错题 ${currentWrongQuestionDisplayIndex + 1} / ${wrongQuestionIndices.length}`
                            : `${isFinished ? '题' : '题'} ${currentQuestionIndex + 1} / ${questions.length}`
                          }
                        </p>
                        <div className="question-meta-right">
                             <button 
                                className={`flag-btn ${flaggedQuestions.has(currentQuestionIndex) ? 'active' : ''}`}
                                onClick={handleToggleFlag}
                                disabled={gameState === 'finished'}
                                aria-label="Flag question for review"
                             >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6h-5.6z" />
                                </svg>
                             </button>
                             {isExamMode && gameState === 'active' && timeLeft !== null && (
                                <div className="timer">{formatTime(timeLeft)}</div>
                             )}
                            <span className="question-type-tag">{getQuestionTypeLabel(currentQuestion.type)}</span>
                        </div>
                    </div>
                    <h2 className="question-text">{currentQuestion.question}</h2>
                    <div className="options-grid">
                      {currentQuestion.options.map((option, index) => {
                        let btnClass = `option-btn`;
                        let isSelected = false;
                        
                        if (currentQuestion.type === 'multiple') {
                            isSelected = (userAnswer as string[] | null)?.includes(option) ?? false;
                        } else {
                            isSelected = userAnswer === option;
                        }
                        
                        if (shouldShowFeedback) {
                           const isCorrect = Array.isArray(currentQuestion.answer) 
                                ? currentQuestion.answer.includes(option)
                                : currentQuestion.answer === option;

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
                            onClick={() => handleSelectAnswer(option)}
                            disabled={isFinished || isPracticeAndConfirmed}
                            aria-pressed={isSelected}
                          >
                            {option}
                          </button>
                        );
                      })}
                    </div>

                    {shouldShowFeedback && (
                        <div className="feedback-text">正确答案: {getCorrectAnswerText(currentQuestion)}</div>
                    )}

                    <div className="navigation-controls">
                      {reviewingWrongOnly ? (
                          <>
                              <button onClick={() => handleWrongReviewNav('prev')} disabled={currentWrongQuestionDisplayIndex === 0}>上一题</button>
                              <button onClick={() => handleWrongReviewNav('next')} disabled={currentWrongQuestionDisplayIndex === wrongQuestionIndices.length - 1}>下一题</button>
                          </>
                      ) : (
                        <>
                          <button onClick={() => goToQuestion(currentQuestionIndex - 1)} disabled={currentQuestionIndex === 0}>上一题</button>
                          {showNavButtons && (
                            <>
                              {isPracticeMode && !isFinished ? (
                                isPracticeAndConfirmed || confirmedAnswers[currentQuestionIndex] ? (
                                    <button onClick={() => goToQuestion(currentQuestionIndex + 1)} disabled={currentQuestionIndex === questions.length - 1}>下一题</button>
                                ) : (
                                    <button onClick={handleConfirmAnswer} disabled={!isAnswered}>确认答案</button>
                                )
                              ) : (
                                <button onClick={() => goToQuestion(currentQuestionIndex + 1)} disabled={currentQuestionIndex === questions.length - 1}>下一题</button>
                              )}
                            </>
                          )}
                        </>
                      )}
                    </div>

                     {isFinished ? (
                         <div className="final-score-active">
                            <h2>考试结束！得分：{score}/{questions.length}</h2>
                             {scoreAnalysis && scoreAnalysis.length > 0 && (
                                <div className="score-analysis-container">
                                    <h3 
                                        onClick={() => setIsAnalysisVisible(!isAnalysisVisible)}
                                        className={isAnalysisVisible ? 'expanded' : ''}
                                        aria-expanded={isAnalysisVisible}
                                        aria-controls="analysis-grid"
                                    >
                                        分数分析
                                    </h3>
                                    {isAnalysisVisible && (
                                        <div className="analysis-grid" id="analysis-grid">
                                            {scoreAnalysis.map(item => (
                                                item.total > 0 && (
                                                    <div className="analysis-item" key={item.type}>
                                                        <span>{getQuestionTypeLabel(item.type)}:</span>
                                                        <span>{item.correct} / {item.total}</span>
                                                        <span>({Math.round((item.correct / item.total) * 100)}%)</span>
                                                    </div>
                                                )
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                            <div className="final-score-actions">
                                <button className="action-btn" onClick={playAgain}>再来一次</button>
                                {hasWrongAnswers && !reviewingWrongOnly && (
                                    <button className="review-btn" onClick={handleReviewWrong}>
                                        错题回顾
                                    </button>
                                )}
                                {reviewingWrongOnly && (
                                    <button className="review-btn" onClick={handleReviewAll}>
                                        查看试卷
                                    </button>
                                )}
                            </div>
                         </div>
                    ) : (
                        <button className="finish-btn" onClick={finishQuiz}>
                          {isPracticeMode ? '结束练习' : '结束考试'}
                        </button>
                    )}
                </div>

                <div className="sidebar-content">
                    <AnswerSheet 
                        total={questions.length}
                        userAnswers={userAnswers}
                        correctAnswers={questions.map(q => q.answer)}
                        currentQuestionIndex={currentQuestionIndex}
                        onSelectQuestion={reviewingWrongOnly ? null : goToQuestion}
                        isFinished={isFinished}
                        questions={questions}
                        quizMode={quizMode}
                        confirmedAnswers={confirmedAnswers}
                        flaggedQuestions={flaggedQuestions}
                    />
                </div>
            </div>
        );
      case 'idle':
      default:
        const sortedTypes = (Object.keys(maxCounts) as QuestionType[]).sort((a, b) => typeOrder[a] - typeOrder[b]);

        return (
          <div className="welcome-container">
            <h1>Let's Practice!</h1>

            <div className="mode-selector-container">
                <button 
                    className={`mode-btn ${quizMode === 'exam' ? 'active' : ''}`}
                    onClick={() => handleModeChange('exam')}
                    aria-pressed={quizMode === 'exam'}
                >
                    考试模式
                </button>
                <button
                    className={`mode-btn ${quizMode === 'practice' ? 'active' : ''}`}
                    onClick={() => handleModeChange('practice')}
                    aria-pressed={quizMode === 'practice'}
                >
                    练习模式
                </button>
            </div>
            
            <p>自定义题型数量及模式，开始学习吧！</p>
            
            <div className="settings-container">

                <div className="settings-grid">
                    {sortedTypes.map(type => (
                        <div className="setting-item" key={type}>
                            <label htmlFor={`count-${type}`}>{getQuestionTypeLabel(type)}</label>
                            <input
                                type="number"
                                id={`count-${type}`}
                                value={questionCounts[type]}
                                onChange={e => handleCountChange(type, e.target.value)}
                                min="0"
                                max={maxCounts[type]}
                                aria-label={`Number of ${getQuestionTypeLabel(type)} questions`}
                            />
                            <span className="setting-max-text">(Max: {maxCounts[type]})</span>
                        </div>
                    ))}
                </div>
                 <div className="settings-checkbox-container">
                    <div className="setting-item-checkbox">
                        <input
                            type="checkbox"
                            id="shuffle"
                            checked={shuffleOptions}
                            onChange={(e) => setShuffleOptions(e.target.checked)}
                        />
                        <label htmlFor="shuffle">乱序选项</label>
                    </div>
                     <div className="setting-item-checkbox">
                        <input
                            type="checkbox"
                            id="rapid"
                            checked={isRapidMode}
                            onChange={(e) => setIsRapidMode(e.target.checked)}
                        />
                        <label htmlFor="rapid">极速模式</label>
                    </div>
                    <div className="setting-item-checkbox">
                        <input
                            type="checkbox"
                            id="dark-mode"
                            checked={isDarkMode}
                            onChange={(e) => setIsDarkMode(e.target.checked)}
                        />
                        <label htmlFor="dark-mode">深色模式</label>
                    </div>
                </div>
            </div>

            <button className="action-btn" onClick={startQuiz}>
              开始学习
            </button>
          </div>
        );
    }
  };

  return <div className="quiz-container">{renderContent()}</div>;
};

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(<App />);