import React from 'react';
import { BaijiuSample, BaijiuUserAnswer } from '@/utils/types';
import { useRef } from 'react';
import ProgressManager from '@/components/ProgressManager';
import { clearProgress, saveProgress } from '@/utils/storage';

export type BlindTastingQuizProps = {
    currentSample: BaijiuSample;
    currentIndex: number;
    total: number;
    baijiuQuestions: BaijiuSample[];
    baijiuUserAnswer: BaijiuUserAnswer;
    isBaijiuAnswerConfirmed: boolean;
    activeBaijiuFields: Record<string, boolean>;
    baijiuOptions: Record<string, string[]>;
    onScoreAdjust: (direction: 'up' | 'down' | 'up1' | 'down1') => void;
    onSelectChange: (field: '香型' | '酒度', value: string) => void;
    onMultiSelectChange: (field: '设备' | '发酵剂', value: string) => void;
    onAction: () => void;
    onExit: () => void;
    setBaijiuQuestions: React.Dispatch<React.SetStateAction<BaijiuSample[]>>;
    setCurrentBaijiuIndex: React.Dispatch<React.SetStateAction<number>>;
    setBaijiuUserAnswer: React.Dispatch<React.SetStateAction<BaijiuUserAnswer>>;
    setIsBaijiuAnswerConfirmed: React.Dispatch<React.SetStateAction<boolean>>;
    setActiveBaijiuFields: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
    startBlindTasting: () => void;
};

const BlindTastingQuiz: React.FC<BlindTastingQuizProps> = ({
    currentSample,
    currentIndex,
    total,
    baijiuQuestions,
    baijiuUserAnswer,
    isBaijiuAnswerConfirmed,
    activeBaijiuFields,
    baijiuOptions,
    onScoreAdjust,
    onSelectChange,
    onMultiSelectChange,
    onAction,
    onExit,
    setBaijiuQuestions,
    setCurrentBaijiuIndex,
    setBaijiuUserAnswer,
    setIsBaijiuAnswerConfirmed,
    setActiveBaijiuFields,
    startBlindTasting
}) => {
    const checkAnswer = (field: keyof BaijiuUserAnswer): 'correct' | 'incorrect' | 'unanswered' => {
        if (!isBaijiuAnswerConfirmed) return 'unanswered';
        const userAnswer = baijiuUserAnswer[field];
        const correctAnswerRaw = currentSample[field as keyof BaijiuSample];
        if (field === '总分') {
            const userAnswerNum = parseFloat(userAnswer as string);
            if (isNaN(userAnswerNum)) return 'incorrect';
            const correctAnswerNum = correctAnswerRaw as number;
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

    const isFinished = currentIndex === total - 1 && isBaijiuAnswerConfirmed;

    const hasRestoredRef = useRef(false);

    if (isFinished) {
        clearProgress('blind');
    }

    const saveBlindProgress = () => {
        saveProgress('blind', {
            baijiuQuestions,
            currentBaijiuIndex: currentIndex,
            baijiuUserAnswer,
            isBaijiuAnswerConfirmed,
            activeBaijiuFields,
        });
    };

    const handleExit = () => {
        saveBlindProgress();
        onExit();
    };

    const handleAction = () => {
        onAction();
        saveBlindProgress();
    };

    return (
        <div className="blind-tasting-container">
            <ProgressManager
                quizMode={'blind'}
                gameState={'active'}
                hasRestoredRef={hasRestoredRef}
                onResume={(progress: any) => {
                    if (setBaijiuQuestions) setBaijiuQuestions(progress.baijiuQuestions ?? []);
                    if (setCurrentBaijiuIndex) setCurrentBaijiuIndex(progress.currentBaijiuIndex ?? 0);
                    if (setBaijiuUserAnswer) setBaijiuUserAnswer(progress.baijiuUserAnswer ?? {});
                    if (setIsBaijiuAnswerConfirmed) setIsBaijiuAnswerConfirmed(progress.isBaijiuAnswerConfirmed ?? false);
                    if (setActiveBaijiuFields && progress.activeBaijiuFields) setActiveBaijiuFields(progress.activeBaijiuFields);
                    hasRestoredRef.current = true;
                }}
                onRestart={() => {
                    hasRestoredRef.current = true;
                    if (startBlindTasting) startBlindTasting();
                }}
            />
            <div>
                <div className="question-meta">
                    <p className="question-header">
                        {currentIndex + 1}/{total}
                    </p>
                    <button className="navigation-controls-exit-btn" onClick={handleExit}>
                        退出
                    </button>
                </div>
                <h2 className="question-text">这一杯是"{currentSample.酒样名称}"</h2>
                <div className="blind-tasting-form">
                    {(Object.keys(baijiuUserAnswer) as Array<keyof BaijiuUserAnswer>).filter(field => activeBaijiuFields[field]).map(field => {
                        let inputControl;
                        if (field === '总分') {
                            inputControl = (
                                <div className="score-adjuster">
                                    <button onClick={() => onScoreAdjust('down1')} disabled={isBaijiuAnswerConfirmed}>--</button>
                                    <button onClick={() => onScoreAdjust('down')} disabled={isBaijiuAnswerConfirmed}>-</button>
                                    <span>{baijiuUserAnswer.总分}</span>
                                    <button onClick={() => onScoreAdjust('up')} disabled={isBaijiuAnswerConfirmed}>+</button>
                                    <button onClick={() => onScoreAdjust('up1')} disabled={isBaijiuAnswerConfirmed}>++</button>
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
                                                onClick={() => onMultiSelectChange(field, opt)}
                                                disabled={isBaijiuAnswerConfirmed}
                                            >
                                                {opt}
                                            </button>
                                        );
                                    })}
                                </div>
                            );
                        } else {
                            inputControl = (
                                <select
                                    id={field}
                                    value={baijiuUserAnswer[field as '香型' | '酒度']}
                                    disabled={isBaijiuAnswerConfirmed}
                                    onChange={e => onSelectChange(field as '香型' | '酒度', e.target.value)}
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
                        );
                    })}
                </div>
                <button className="action-btn" onClick={handleAction} style={{marginTop: '1rem'}}>
                    {isBaijiuAnswerConfirmed ? (isFinished ? '完成' : '下一题') : '确认答案'}
                </button>
            </div>
        </div>
    );
};

export default BlindTastingQuiz; 