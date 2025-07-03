import React from 'react';
import { localQuestions, Question } from '../questions';
import { getStats, getExamRecords } from '../storage';

// 类型定义
export type StatsPageProps = { onBack: () => void };
export type StatQuestion = Question & { total: number; wrong: number };

const StatsPage: React.FC<StatsPageProps> = ({ onBack }) => {
  // 题目统计
  const stats = getStats();
  // 题型分组
  const single: StatQuestion[] = [];
  const multiple: StatQuestion[] = [];
  const boolean: StatQuestion[] = [];
  // 题库遍历
  localQuestions.forEach(q => {
    const key = q.question + '||' + q.options.join('|');
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

export default StatsPage; 