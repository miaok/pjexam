import React from 'react';
import { Question } from '../questions';
import { getExamRecords, clearAllQuizData } from '../utils/storage';

// 类型定义
import { StatsPageProps } from '@/utils/types';
export type StatQuestion = Question & { total: number; wrong: number };

const StatsPage: React.FC<StatsPageProps> = ({ onBack }) => {
  // 考试记录
  const examRecords = getExamRecords();
  // 时间格式化
  const fmt = (t: number) => {
    const d = new Date(t);
    return d.toLocaleString();
  };
  const fmtSec = (s: number) => `${Math.floor(s/60)}分${s%60}秒`;

  const [showClearModal, setShowClearModal] = React.useState(false);
  const handleClear = () => {
    clearAllQuizData();
    window.location.reload();
  };

  return (
    <div className="stats-container">
      <div style={{display:'flex', gap:'1rem', marginBottom:'0.75rem'}}>
        <button className="action-btn" onClick={onBack}>返回首页</button>
        <button className="action-btn" style={{background:'#e74c3c'}} onClick={() => setShowClearModal(true)}>清除数据</button>
      </div>
      {showClearModal && (
        <div className="modal-mask" style={{zIndex:1000}}>
          <div className="modal-content" style={{maxWidth:340, margin:'10% auto', textAlign:'center'}}>
            <div style={{fontWeight:700, marginBottom:'1rem'}}>确定要清除所有答题相关数据吗？建议页面出现异常时使用。</div>
            <button className="type-modal-btn" style={{margin:'0.5rem', width:'80%'}} onClick={handleClear}>确认清除</button>
            <button className="type-modal-btn" style={{margin:'0.5rem', width:'80%'}} onClick={() => setShowClearModal(false)}>取消</button>
          </div>
        </div>
      )}
      <div className="stats-section">
        <h2>考试记录</h2>
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
    </div>
  );
};

export default StatsPage; 