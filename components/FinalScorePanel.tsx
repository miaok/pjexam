import React from 'react';

export type FinalScorePanelProps = {
  score: number;
  hasWrongAnswers: boolean;
  reviewingWrongOnly: boolean;
  onToggleReviewingWrongOnly: () => void;
  onRestart: () => void;
};

const FinalScorePanel: React.FC<FinalScorePanelProps> = ({
  score,
  hasWrongAnswers,
  reviewingWrongOnly,
  onToggleReviewingWrongOnly,
  onRestart
}) => (
  <div className="final-score-active">
    <button className="review-btn" disabled style={{pointerEvents: 'none'}}>{score} 分</button>
    <div className="final-score-actions">
      {hasWrongAnswers && (
        <button
          className="review-btn"
          onClick={onToggleReviewingWrongOnly}
        >
          {reviewingWrongOnly ? '回顾全部' : '只看错题'}
        </button>
      )}
    </div>
    <button
      className="review-btn"
      onClick={onRestart}
      style={{pointerEvents: 'auto'}}
    >
      再来一次
    </button>
  </div>
);

export default FinalScorePanel; 