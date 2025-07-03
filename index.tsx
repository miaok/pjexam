import React, { useState, useMemo, useEffect, useCallback, useRef, useLayoutEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { localQuestions, Question, QuestionType } from './questions.ts';
import { baijiuData, BaijiuSample } from './baijiu.ts';

type GameState = 'idle' | 'active' | 'finished';
type QuizMode = 'practice' | 'exam' | 'blind' | 'stats';

const EXAM_DURATION_MINUTES = 10;

type BaijiuUserAnswer = {
    香型: string;
    酒度: string;
    总分: string;
    设备: string[];
    发酵剂: string[];
};

const initialBaijiuAnswer: BaijiuUserAnswer = { 香型: '', 酒度: '', 总分: '92.0', 设备: [], 发酵剂: [] };


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
    const [open, setOpen] = useState(false);
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
  const [isRapidMode, setIsRapidMode] = useState(true);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [examStartTimestamp, setExamStartTimestamp] = useState<number | null>(null);
  const [reviewingWrongOnly, setReviewingWrongOnly] = useState(false);
  const [wrongQuestionIndices, setWrongQuestionIndices] = useState<number[]>([]);
  const [currentWrongQuestionDisplayIndex, setCurrentWrongQuestionDisplayIndex] = useState(0);
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<number>>(new Set());
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Blind Tasting Mode State
  const [baijiuQuestions, setBaijiuQuestions] = useState<BaijiuSample[]>([]);
  const [currentBaijiuIndex, setCurrentBaijiuIndex] = useState(0);
  const [baijiuUserAnswer, setBaijiuUserAnswer] = useState<BaijiuUserAnswer>(initialBaijiuAnswer);
  const [isBaijiuAnswerConfirmed, setIsBaijiuAnswerConfirmed] = useState(false);

  // 新增：品鉴模式可选项
  const [baijiuFields, setBaijiuFields] = useState({
    香型: true,
    酒度: true,
    总分: true,
    设备: true,
    发酵剂: true,
  });

  // 新增：品鉴流程字段控制
  const [activeBaijiuFields, setActiveBaijiuFields] = useState(baijiuFields);

  const baijiuOptions = useMemo(() => {
    // Hardcoded and sorted options as requested by the user
    const aromaOptions = [
        '浓香型', '多粮浓香型', '清香型', '小曲清香型', '麸曲清香型', '大麸清香型', 
        '酱香型', '米香型', '兼香型', '凤香型', '豉香型', '特香型', '芝麻香型', 
        '董香型', '老白干型', '馥郁香型'
    ];
    const alcoholLevels = ['30', '42', '45', '50', '52', '53', '54', '55'];
    const equipmentOptions = ['泥窖', '地缸', '石窖', '砖窖', '水泥窖', '瓷砖窖', '发酵罐', '陶罐'];
    const agentOptions = ['大曲', '小曲', '麸曲', '酵母'];

    return { 
        香型: aromaOptions, 
        酒度: alcoholLevels, 
        设备: equipmentOptions, 
        发酵剂: agentOptions 
    };
  }, []);

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
    } else if (newMode === 'practice') { // practice mode
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
    if (quizMode === 'blind') {
        const shuffledData = shuffleArray(baijiuData);
        setBaijiuQuestions(shuffledData);
        setCurrentBaijiuIndex(0);
        setBaijiuUserAnswer(initialBaijiuAnswer);
        setIsBaijiuAnswerConfirmed(false);
        setActiveBaijiuFields(baijiuFields); // 记录当前品鉴字段
        setGameState('active');
        return;
    }

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
        // 只按错题次数排序，错题多的优先，错题次数相同则随机
        group.sort((a, b) => {
            const ka = getQuestionKey(a);
            const kb = getQuestionKey(b);
            const sa = stats[ka] || { total: 0, wrong: 0 };
            const sb = stats[kb] || { total: 0, wrong: 0 };
            if (sb.wrong !== sa.wrong) return sb.wrong - sa.wrong;
            // 错题次数相同则随机
            return Math.random() - 0.5;
        });
        // 只取前count个
        let chosen = group.slice(0, count);
        // 乱序选项
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
    setGameState('active');
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
    // 统计：练习模式每次确认只更新当前题
    const q = questions[currentQuestionIndex];
    const userAns = userAnswers[currentQuestionIndex];
    const key = getQuestionKey(q);
    const isWrong = !isCorrectUtil(q, userAns);
    updateStats(key, isWrong);
  };
  
  const finishQuiz = useCallback(() => {
    let finalScore = 0;
    // 统计：考试模式结束时批量更新所有题
    questions.forEach((q, i) => {
        if (isCorrectUtil(q, userAnswers[i])) {
            finalScore++;
        }
        const key = getQuestionKey(q);
        const isWrong = !isCorrectUtil(q, userAnswers[i]);
        updateStats(key, isWrong);
    });
    setScore(finalScore);
    setGameState('finished');
    setTimeLeft(null);
    // 新增：写入考试记录
    if (quizMode === 'exam') {
      const used = (EXAM_DURATION_MINUTES * 60) - (timeLeft ?? 0);
      addExamRecord({
        score: finalScore,
        total: questions.length,
        duration: used,
        timestamp: Date.now(),
      });
    }
  }, [questions, userAnswers, quizMode, timeLeft]);
  
  useEffect(() => {
    if (gameState === 'active' && quizMode === 'exam' && examStartTimestamp) {
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
  }, [gameState, quizMode, examStartTimestamp, finishQuiz]);

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
    clearProgress();
    setGameState('idle');
    setQuestions([]);
    setUserAnswers([]);
    setConfirmedAnswers([]);
    setTimeLeft(null);
    setExamStartTimestamp(null);
    setReviewingWrongOnly(false);
    setWrongQuestionIndices([]);
    setCurrentWrongQuestionDisplayIndex(0);
    setFlaggedQuestions(new Set());
    setBaijiuQuestions([]);
    setCurrentBaijiuIndex(0);
    setBaijiuUserAnswer(initialBaijiuAnswer);
    setIsBaijiuAnswerConfirmed(false);
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

    const handleBaijiuSelectChange = (field: '香型' | '酒度', value: string) => {
        setBaijiuUserAnswer(prev => ({ ...prev, [field]: value }));
    };

    const handleBaijiuScoreAdjust = (direction: 'up' | 'down') => {
        setBaijiuUserAnswer(prev => {
            const currentScore = parseFloat(prev.总分);
            const newScore = direction === 'up' ? currentScore + 0.2 : currentScore - 0.2;
            return { ...prev, 总分: newScore.toFixed(1) };
        });
    };

    const handleBaijiuMultiSelectChange = (field: '设备' | '发酵剂', value: string) => {
        setBaijiuUserAnswer(prev => {
            const currentSelection = prev[field];
            const newSelection = currentSelection.includes(value)
                ? currentSelection.filter(item => item !== value)
                : [...currentSelection, value];
            return { ...prev, [field]: newSelection };
        });
    };

    const handleBaijiuAction = () => {
        if (isBaijiuAnswerConfirmed) { // "Next" button logic
            if (currentBaijiuIndex < baijiuQuestions.length - 1) {
                setCurrentBaijiuIndex(prev => prev + 1);
                setBaijiuUserAnswer(initialBaijiuAnswer);
                setIsBaijiuAnswerConfirmed(false);
            } else {
                playAgain();
            }
        } else { // "Confirm" button logic
            setIsBaijiuAnswerConfirmed(true);
            // 统计：品鉴题每次确认时更新统计
            const currentSample = baijiuQuestions[currentBaijiuIndex];
            const key = getQuestionKey({
                question: currentSample.酒样名称,
                options: [
                    baijiuUserAnswer.香型,
                    baijiuUserAnswer.酒度,
                    baijiuUserAnswer.总分,
                    baijiuUserAnswer.设备.join(','),
                    baijiuUserAnswer.发酵剂.join(',')
                ]
            });
            // 判断是否答错（任一字段错误即为错）
            let isWrong = false;
            if (baijiuUserAnswer.香型 !== currentSample.香型) isWrong = true;
            if (baijiuUserAnswer.酒度 !== currentSample.酒度.toString()) isWrong = true;
            // 总分容差0.4
            const userScore = parseFloat(baijiuUserAnswer.总分);
            const correctScore = parseFloat(currentSample.总分.toString());
            if (Math.abs(userScore - correctScore) > 0.4) isWrong = true;
            // 设备
            const userEquip = new Set(baijiuUserAnswer.设备);
            const correctEquip = new Set((currentSample.设备 as string).split(',').map(s => s.trim()));
            if (userEquip.size !== correctEquip.size || [...userEquip].some(x => !correctEquip.has(x))) isWrong = true;
            // 发酵剂
            const userAgent = new Set(baijiuUserAnswer.发酵剂);
            const correctAgent = new Set((currentSample.发酵剂 as string).split(',').map(s => s.trim()));
            if (userAgent.size !== correctAgent.size || [...userAgent].some(x => !correctAgent.has(x))) isWrong = true;
            updateStats(key, isWrong);
        }
    };
    
    const renderBlindTastingQuiz = () => {
        if (baijiuQuestions.length === 0) return null;
        const currentSample = baijiuQuestions[currentBaijiuIndex];
        const isFinished = currentBaijiuIndex === baijiuQuestions.length - 1 && isBaijiuAnswerConfirmed;
        if (Object.values(activeBaijiuFields).every(v => !v)) {
          return <div style={{textAlign: 'center', marginTop: '2rem', color: '#c00', fontSize: '1.2rem'}}>请至少选择一个品鉴项</div>;
        }
    
        const checkAnswer = (field: keyof BaijiuUserAnswer): 'correct' | 'incorrect' | 'unanswered' => {
            if (!isBaijiuAnswerConfirmed) return 'unanswered';
    
            const userAnswer = baijiuUserAnswer[field];
            const correctAnswerRaw = currentSample[field as keyof BaijiuSample];
    
            if (field === '总分') {
                const userAnswerNum = parseFloat(userAnswer as string);
                if (isNaN(userAnswerNum)) return 'incorrect';
                const correctAnswerNum = correctAnswerRaw as number;
                
                // To avoid floating point inaccuracies (e.g., 92.4 - 92.0 being 0.4000000000000057),
                // we convert the scores to integers by multiplying by 10 and rounding.
                const userAnswerInt = Math.round(userAnswerNum * 10);
                const correctAnswerInt = Math.round(correctAnswerNum * 10);
                const toleranceInt = 4; // 0.4 * 10

                return Math.abs(userAnswerInt - correctAnswerInt) <= toleranceInt ? 'correct' : 'incorrect';
            }
    
            if (field === '设备' || field === '发酵剂') {
                const userAnswerSet = new Set(userAnswer as string[]);
                const correctAnswerSet = new Set((correctAnswerRaw as string).split(',').map(s => s.trim()));
                if (userAnswerSet.size !== correctAnswerSet.size) return 'incorrect';
                for (const item of userAnswerSet) {
                    if (!correctAnswerSet.has(item)) return 'incorrect';
                }
                return 'correct';
            }
    
            return userAnswer === (correctAnswerRaw as any).toString() ? 'correct' : 'incorrect';
        };
    
        return (
            <div className="blind-tasting-container">
                <div className="question-meta">
                    <p className="question-header">
                        品鉴 {currentBaijiuIndex + 1} / {baijiuQuestions.length}
                    </p>
                     <button className="navigation-controls-exit-btn" onClick={playAgain}>
                        退出
                     </button>
                </div>
                
                <h2 className="question-text">这一杯是"{currentSample.酒样名称}"</h2>
                
                <div className="blind-tasting-form">
                    {(Object.keys(initialBaijiuAnswer) as Array<keyof BaijiuUserAnswer>).filter(field => activeBaijiuFields[field]).map(field => {
                        let inputControl;
                        if (field === '总分') {
                            inputControl = (
                                <div className="score-adjuster">
                                    <button onClick={() => handleBaijiuScoreAdjust('down')} disabled={isBaijiuAnswerConfirmed}>-</button>
                                    <span>{baijiuUserAnswer.总分}</span>
                                    <button onClick={() => handleBaijiuScoreAdjust('up')} disabled={isBaijiuAnswerConfirmed}>+</button>
                                </div>
                            );
                        } else if (field === '设备' || field === '发酵剂') {
                            inputControl = (
                                <div className="multi-select-container">
                                    {baijiuOptions[field].map(opt => {
                                        const isSelected = baijiuUserAnswer[field].includes(opt);
                                        return (
                                            <button 
                                                key={opt}
                                                className={`multi-select-option ${isSelected ? 'selected' : ''}`}
                                                onClick={() => handleBaijiuMultiSelectChange(field, opt)}
                                                disabled={isBaijiuAnswerConfirmed}
                                            >
                                                {opt}
                                            </button>
                                        )
                                    })}
                                </div>
                            );
                        } else {
                            inputControl = (
                                <select 
                                    id={field} 
                                    value={baijiuUserAnswer[field as '香型' | '酒度']} 
                                    disabled={isBaijiuAnswerConfirmed} 
                                    onChange={e => handleBaijiuSelectChange(field as '香型' | '酒度', e.target.value)}
                                >
                                    <option value="">请选择</option>
                                    {baijiuOptions[field as '香型' | '酒度'].map(opt => <option key={opt} value={opt}>{opt}{field === '酒度' ? '°' : ''}</option>)}
                                </select>
                            );
                        }

                        let shouldShowCorrectAnswer = false;
                        if (isBaijiuAnswerConfirmed) {
                            const isFieldCorrect = checkAnswer(field) === 'correct';
                            if (!isFieldCorrect) {
                                shouldShowCorrectAnswer = true;
                            } else if (field === '总分') {
                                // For score, also show answer if correct but not an exact match
                                const userAnswerNum = parseFloat(baijiuUserAnswer.总分);
                                const correctAnswerNum = currentSample.总分;
                                if (userAnswerNum !== correctAnswerNum) {
                                    shouldShowCorrectAnswer = true;
                                }
                            }
                        }

                        return (
                             <div className="form-row" key={field}>
                                <label htmlFor={field}>{field}</label>
                                <div className="input-wrapper">
                                    {inputControl}
                                    {isBaijiuAnswerConfirmed && <span className={`feedback-icon ${checkAnswer(field)}`}>{checkAnswer(field) === 'correct' ? '✔' : '✖'}</span>}
                                </div>
                                {shouldShowCorrectAnswer && <span className="correct-answer">答案: {currentSample[field as keyof BaijiuSample]}{field === '酒度' ? '°' : ''}</span>}
                            </div>
                        )
                    })}
                </div>
    
                <button className="action-btn" onClick={handleBaijiuAction} style={{marginTop: '1rem'}}>
                    {isBaijiuAnswerConfirmed ? (isFinished ? '完成' : '下一题') : '确认答案'}
                </button>
            </div>
        )
    }

  const handleToggleReviewingWrongOnly = () => {
    if (!reviewingWrongOnly) {
      // 切换到只看错题
      const wrongs = questions.reduce<number[]>((acc, q, i) => {
        if (!isCorrectUtil(q, userAnswers[i])) acc.push(i);
        return acc;
      }, []);
      setWrongQuestionIndices(wrongs);
      setCurrentWrongQuestionDisplayIndex(0);
      if (wrongs.length > 0) setCurrentQuestionIndex(wrongs[0]);
    } else {
      // 切回全部
      setCurrentWrongQuestionDisplayIndex(0);
      setCurrentQuestionIndex(0);
    }
    setReviewingWrongOnly(v => !v);
  };

  useEffect(() => {
    if (reviewingWrongOnly && wrongQuestionIndices.length > 0) {
      setCurrentQuestionIndex(wrongQuestionIndices[currentWrongQuestionDisplayIndex]);
    }
    // eslint-disable-next-line
  }, [reviewingWrongOnly, currentWrongQuestionDisplayIndex, wrongQuestionIndices]);

  const handleBackFromStats = () => {
    setQuizMode('exam');
    setGameState('idle');
    // 切换到考试模式时，重置题型数量为考试模式默认
    setQuestionCounts({
      boolean: Math.min(30, maxCounts.boolean || 0),
      single: Math.min(30, maxCounts.single || 0),
      multiple: Math.min(40, maxCounts.multiple || 0),
    });
  };

  const renderContent = () => {
    if (quizMode === 'stats') {
      return <StatsPage onBack={handleBackFromStats} />;
    }
    switch (gameState) {
      case 'active':
        if (quizMode === 'blind') {
            return renderBlindTastingQuiz();
        }
        // Fallthrough for original modes
      case 'finished':
        if (quizMode === 'blind') {
            // This state isn't really used for blind mode, redirect to start
            playAgain();
            return null;
        }
        if (questions.length === 0) {
            return (
                <div className="welcome-container">
                    <h1>这么玩是吧</h1>
                    <p style={{ margin: '1rem 0 2rem' }}>回去吧！</p>
                    <button className="action-btn" onClick={playAgain}>
                        返回首页
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
                            <span className="question-type-tag">{getQuestionTypeLabel(currentQuestion.type)}</span>
                            {isExamMode && gameState === 'active' && timeLeft !== null && (
                                <div className="timer">{formatTime(timeLeft)}</div>
                             )}
                            <button className="navigation-controls-exit-btn" onClick={playAgain}>
                                退出
                            </button>
                        </div>
                    </div>

                    {/* 新增：分数展示和回顾按钮 */}
                    {isFinished && (
                      <div className="final-score-active">
                        <button className="review-btn" disabled style={{pointerEvents: 'none'}}>{score} 分</button>
                        <div className="final-score-actions">
                          {hasWrongAnswers && (
                            <button
                              className="review-btn"
                              onClick={handleToggleReviewingWrongOnly}
                            >
                              {reviewingWrongOnly ? '回顾全部' : '只看错题'}
                            </button>
                          )}
                        </div>
                        {/* 新增再来一次按钮 */}
                        <button
                          className="review-btn"
                          onClick={() => {
                            clearProgress();
                            startQuiz();
                          }}
                        >
                          再来一次
                        </button>
                      </div>
                    )}

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
                          {/* 回顾全部模式下，考试结束后也始终显示"下一题"按钮 */}
                          {isFinished && (
                            <button onClick={() => goToQuestion(currentQuestionIndex + 1)} disabled={currentQuestionIndex === questions.length - 1}>下一题</button>
                          )}
                          {/* 其他情况保持原有逻辑 */}
                          {!isFinished && (
                            (isExamMode && isRapidMode ? (
                              <button onClick={() => goToQuestion(currentQuestionIndex + 1)} disabled={currentQuestionIndex === questions.length - 1}>下一题</button>
                            ) : (
                              showNavButtons && (
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
                              )
                            ))
                          )}
                        </>
                      )}
                    </div>
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
                    {/* 结束考试/练习按钮，未结束且在最后一题时显示 */}
                    {!isFinished && currentQuestionIndex === questions.length - 1 && (
                        <button className="finish-btn" onClick={finishQuiz}>
                          {isPracticeMode ? '结束练习' : '结束考试'}
                        </button>
                    )}
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
                    考试
                </button>
                <button
                    className={`mode-btn ${quizMode === 'practice' ? 'active' : ''}`}
                    onClick={() => handleModeChange('practice')}
                    aria-pressed={quizMode === 'practice'}
                >
                    练习
                </button>
                <button
                    className={`mode-btn ${quizMode === 'blind' ? 'active' : ''}`}
                    onClick={() => handleModeChange('blind')}
                    aria-pressed={quizMode === 'blind'}
                >
                    品鉴
                </button>
                <button
                    className={`mode-btn ${quizMode === 'stats' ? 'active' : ''}`}
                    onClick={() => handleModeChange('stats')}
                    aria-pressed={quizMode === 'stats'}
                >
                    统计
                </button>
            </div>
            
            {quizMode !== 'blind' ? (
                <>
                    <p>
                        {quizMode === 'exam' && '卷随机动，分由心定'}
                        {quizMode === 'practice' && '先立其大，后破其微'}
                    </p>
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
                               <label htmlFor="shuffle">选项乱序</label>
                           </div>
                            <div className="setting-item-checkbox">
                               <input
                                   type="checkbox"
                                   id="rapid"
                                   checked={isRapidMode}
                                   onChange={(e) => setIsRapidMode(e.target.checked)}
                               />
                               <label htmlFor="rapid">极速切题</label>
                           </div>
                       </div>
                    </div>
                </>
            ) : (
                <>
                  <p>品酒如诗，味觉如画</p>
                  <div className="settings-container">
                    <div className="settings-checkbox-container" style={{justifyContent: 'center', marginBottom: '1rem'}}>
                      {Object.entries(baijiuFields).map(([field, checked]) => (
                        <div className="setting-item-checkbox" key={field}>
                          <input
                            type="checkbox"
                            id={`baijiu-field-${field}`}
                            checked={checked}
                            onChange={e => setBaijiuFields(prev => ({ ...prev, [field]: e.target.checked }))}
                          />
                          <label htmlFor={`baijiu-field-${field}`}>{field}</label>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
            )}

            <div className="settings-checkbox-container" style={{justifyContent: 'center'}}>
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
            <button
              className="action-btn"
              style={{marginTop: '1rem'}}
              onClick={startQuiz}
              disabled={quizMode === 'blind' && Object.values(baijiuFields).every(v => !v)}
            >
              开始学习
            </button>
          </div>
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
      setQuizMode(saved.quizMode ?? 'exam');
      setQuestions(saved.questions ?? []);
      setCurrentQuestionIndex(saved.currentQuestionIndex ?? 0);
      setUserAnswers(saved.userAnswers ?? []);
      setScore(saved.score ?? 0);
      setIsCurrentConfirmed(saved.isCurrentConfirmed ?? false);
      setConfirmedAnswers(saved.confirmedAnswers ?? []);
      setIsRapidMode(saved.isRapidMode ?? true);
      setTimeLeft(saved.timeLeft ?? null);
      setExamStartTimestamp(saved.examStartTimestamp ?? null);
      setReviewingWrongOnly(saved.reviewingWrongOnly ?? false);
      setWrongQuestionIndices(saved.wrongQuestionIndices ?? []);
      setCurrentWrongQuestionDisplayIndex(saved.currentWrongQuestionDisplayIndex ?? 0);
      setFlaggedQuestions(saved.flaggedQuestions ?? new Set());
      setIsDarkMode(saved.isDarkMode ?? false);
      setBaijiuQuestions(saved.baijiuQuestions ?? []);
      setCurrentBaijiuIndex(saved.currentBaijiuIndex ?? 0);
      setBaijiuUserAnswer(saved.baijiuUserAnswer ?? initialBaijiuAnswer);
      setIsBaijiuAnswerConfirmed(saved.isBaijiuAnswerConfirmed ?? false);
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
      questions,
      currentQuestionIndex,
      userAnswers,
      score,
      isCurrentConfirmed,
      confirmedAnswers,
      isRapidMode,
      timeLeft,
      examStartTimestamp,
      reviewingWrongOnly,
      wrongQuestionIndices,
      currentWrongQuestionDisplayIndex,
      flaggedQuestions: Array.from(flaggedQuestions),
      isDarkMode,
      baijiuQuestions,
      currentBaijiuIndex,
      baijiuUserAnswer,
      isBaijiuAnswerConfirmed,
      questionCounts,
      shuffleOptions,
      baijiuFields,
    };
    saveProgress(progress);
  }, [gameState, quizMode, questions, currentQuestionIndex, userAnswers, score, isCurrentConfirmed, confirmedAnswers, isRapidMode, timeLeft, examStartTimestamp, reviewingWrongOnly, wrongQuestionIndices, currentWrongQuestionDisplayIndex, flaggedQuestions, isDarkMode, baijiuQuestions, currentBaijiuIndex, baijiuUserAnswer, isBaijiuAnswerConfirmed, questionCounts, shuffleOptions, baijiuFields]);

  return <div className="quiz-container">{renderContent()}</div>;
};

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(<App />);

// ========== 进度持久化工具 ==========
const STORAGE_KEY = 'pjexam-progress-v1';

function saveProgress(progress: any) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch (e) {
        // ignore
    }
}

function loadProgress(): any | null {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const data = JSON.parse(raw);
        // 反序列化 Set
        if (data.flaggedQuestions) {
            data.flaggedQuestions = new Set(data.flaggedQuestions);
        }
        return data;
    } catch (e) {
        return null;
    }
}

function clearProgress() {
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
        // ignore
    }
}

// ========== 题目唯一key和统计数据工具 ==========
const STATS_KEY = 'pjexam-stats-v1';

function getQuestionKey(q: { question: string; options: string[] }) {
    // 简单hash：题干+所有选项拼接
    return q.question + '||' + q.options.join('|');
}

function getStats(): Record<string, { total: number; wrong: number }> {
    try {
        const raw = localStorage.getItem(STATS_KEY);
        if (!raw) return {};
        return JSON.parse(raw);
    } catch {
        return {};
    }
}

function updateStats(key: string, isWrong: boolean) {
    const stats = getStats();
    if (!stats[key]) stats[key] = { total: 0, wrong: 0 };
    stats[key].total += 1;
    if (isWrong) stats[key].wrong += 1;
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
}

function clearStats() {
    localStorage.removeItem(STATS_KEY);
}

// ========== 考试记录本地存取 ==========
const EXAM_RECORDS_KEY = 'pjexam-exam-records-v1';

type ExamRecord = {
  score: number;
  total: number;
  duration: number; // 秒
  timestamp: number;
};

function getExamRecords(): ExamRecord[] {
  try {
    const raw = localStorage.getItem(EXAM_RECORDS_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function addExamRecord(record: ExamRecord) {
  const records = getExamRecords();
  records.unshift(record);
  if (records.length > 10) records.length = 10;
  localStorage.setItem(EXAM_RECORDS_KEY, JSON.stringify(records));
}

// ========== 统计页组件 ==========
type StatsPageProps = { onBack: () => void };
type StatQuestion = Question & { total: number; wrong: number };
const StatsPage: React.FC<StatsPageProps> = ({ onBack }) => {
  // 题目统计
  const stats = getStats();
  // 题型分组
  const single: StatQuestion[] = [];
  const multiple: StatQuestion[] = [];
  const boolean: StatQuestion[] = [];
  // 题库遍历
  localQuestions.forEach(q => {
    const key = getQuestionKey(q);
    const s = stats[key] || { total: 0, wrong: 0 };
    // 只统计考试模式下做过的题，且未做题（total为0）不计入
    if (s.total > 0) {
      if (q.type === 'single') single.push({ ...q, ...s });
      else if (q.type === 'multiple') multiple.push({ ...q, ...s });
      else if (q.type === 'boolean') boolean.push({ ...q, ...s });
    }
  });
  // 排序取前10
  const top10 = (arr: StatQuestion[]) => arr.filter(x => x.wrong > 0).sort((a, b) => b.wrong - a.wrong).slice(0, 10);
  // 考试记录
  const examRecords = getExamRecords();
  // 时间格式化
  const fmt = (t: number) => {
    const d = new Date(t);
    return d.toLocaleString();
  };
  const fmtSec = (s: number) => `${Math.floor(s/60)}分${s%60}秒`;

  // 手风琴展开状态
  const [openType, setOpenType] = React.useState<'single'|'multiple'|'boolean'|null>('single');
  const accordionList = [
    { type: 'single', label: '单选错题TOP10', data: top10(single) },
    { type: 'multiple', label: '多选错题TOP10', data: top10(multiple) },
    { type: 'boolean', label: '判断错题TOP10', data: top10(boolean) },
  ];

  return (
    <div className="stats-container">
      
      <button className="action-btn" style={{marginBottom: '0.75rem'}} onClick={onBack}>返回首页</button>
      <div className="stats-section">
        <h2>考试记录（最新10次）</h2>
        {examRecords.length === 0 ? <p>暂无数据</p> : (
          <table className="stats-table">
            <thead><tr><th>分数</th><th>总题数</th><th>用时</th><th>考试时间</th></tr></thead>
            <tbody>
              {examRecords.map((r, i) => (
                <tr key={i}>
                  <td>{r.score}</td>
                  <td>{r.total}</td>
                  <td>{fmtSec(r.duration)}</td>
                  <td>{fmt(r.timestamp)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div className="stats-section-grid" style={{flexDirection: 'column', gap: '1.5rem'}}>
        {accordionList.map(({type, label, data}) => (
          <div className="stats-section" key={type} style={{paddingBottom: 0}}>
            <div
              className={`accordion-header${openType === type ? ' open' : ''}`}
              style={{cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}
              onClick={() => setOpenType(openType === type ? null : type as typeof openType)}
            >
              <h2 style={{margin: 0, fontSize: '1.1rem'}}>{label}</h2>
              <span style={{fontSize: '1.5rem', transition: 'transform 0.2s', transform: openType === type ? 'rotate(90deg)' : 'rotate(0deg)'}}>▶</span>
            </div>
            <div className="accordion-content" style={{display: openType === type ? 'block' : 'none', marginTop: '0.5rem'}}>
              {data.length === 0 ? <p>暂无数据</p> : data.map((q, i) => (
                <div className="stats-card" key={i}>
                  <div className="stats-q">{q.question}</div>
                  <div className="stats-opts">{q.options?.join(' / ')}</div>
                  <div className="stats-ans">正确答案: {Array.isArray(q.answer) ? q.answer.join(',') : q.answer}</div>
                  <div className="stats-wrong">错题次数: {q.wrong} / 总做题: {q.total}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};