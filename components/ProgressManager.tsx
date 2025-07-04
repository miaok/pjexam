import React, { useState, useEffect } from 'react';
import { loadProgress, clearProgress } from '@/utils/storage';
import { GameState, QuizMode } from '@/utils/types';

interface ProgressManagerProps {
  quizMode: QuizMode;
  gameState: GameState;
  hasRestoredRef: React.RefObject<boolean>;
  onResume: (progress: any) => void;
  onRestart: () => void;
}

const ProgressManager: React.FC<ProgressManagerProps> = ({
  quizMode,
  gameState,
  hasRestoredRef,
  onResume,
  onRestart,
}) => {
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [pendingRestore, setPendingRestore] = useState<any>(null);

  useEffect(() => {
    if (gameState !== 'active') return;
    if (!hasRestoredRef.current && (quizMode === 'exam' || quizMode === 'practice' || quizMode === 'blind')) {
      const saved = loadProgress(quizMode);
      const hasValidProgress =
        saved &&
        saved.gameState !== 'finished' &&
        (
          (Array.isArray(saved.userAnswers) && saved.userAnswers.some((ans: any) => ans !== null && ans !== undefined && (Array.isArray(ans) ? ans.length > 0 : true)))
          || (saved.currentQuestionIndex && saved.currentQuestionIndex > 0)
          || (Array.isArray(saved.confirmedAnswers) && saved.confirmedAnswers.some(Boolean))
        );
      if (hasValidProgress) {
        setShowResumeModal(true);
        setPendingRestore(saved);
        return;
      }
      hasRestoredRef.current = true;
    }
  }, [quizMode, gameState]);

  const handleResume = () => {
    if (pendingRestore) {
      onResume(pendingRestore);
      setShowResumeModal(false);
      setPendingRestore(null);
    }
  };

  const handleRestart = () => {
    if (quizMode === 'exam' || quizMode === 'practice' || quizMode === 'blind') {
      clearProgress(quizMode);
    }
    onRestart();
    setShowResumeModal(false);
    setPendingRestore(null);
  };

  if (!showResumeModal) return null;

  return (
    <div className="modal-mask" style={{zIndex:1000}}>
      <div className="modal-content" style={{maxWidth:360, margin:'10% auto', textAlign:'center'}}>
        <div style={{fontWeight:700, marginBottom:'1rem'}}>检测到有未完成的答题进度，是否继续？</div>
        <button className="type-modal-btn" style={{margin:'0.5rem', width:'80%'}} onClick={handleResume}>继续答题</button>
        <button className="type-modal-btn" style={{margin:'0.5rem', width:'80%'}} onClick={handleRestart}>重新开始</button>
      </div>
    </div>
  );
};

export default ProgressManager; 