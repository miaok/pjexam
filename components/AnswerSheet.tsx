import React, { useState, useCallback, useLayoutEffect, useRef, useEffect } from 'react';
import { Question} from '../questions';

// 判断答案是否正确
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
    quizMode: string;
    confirmedAnswers: boolean[];
    flaggedQuestions: Set<number>;
};

const AnswerSheet: React.FC<AnswerSheetProps> = ({ total, userAnswers, currentQuestionIndex, onSelectQuestion, isFinished, questions, quizMode, confirmedAnswers, flaggedQuestions }) => {
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

export default AnswerSheet; 