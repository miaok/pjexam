import React, { useEffect } from 'react';
import ModeSelector from '../components/ModeSelector';
import SettingsPanel from '../components/SettingsPanel';
import BaijiuFieldsSelector from '../components/BaijiuFieldsSelector';
import { useSettings } from '../context/SettingsContext';

interface WelcomePageProps {
  handleStart: () => void;
}

const WelcomePage: React.FC<WelcomePageProps> = ({ handleStart }) => {
  const {
    quizMode, 
    questionCounts, setQuestionCounts,
    maxCounts,
    isDarkMode, setIsDarkMode,
    baijiuFields, setBaijiuFields
  } = useSettings();

  const allCountsZero = Object.values(questionCounts).every(v => v === 0);

  useEffect(() => {
    if (quizMode === 'practice') {
      setQuestionCounts({ ...maxCounts });
    }
  }, [quizMode, maxCounts, setQuestionCounts]);

  return (
    <div className="welcome-container">
      <h1>Let's Practice!</h1>
      <ModeSelector />
      {quizMode !== 'blind' ? (
        <SettingsPanel />
      ) : (
        <BaijiuFieldsSelector
          baijiuFields={baijiuFields}
          onFieldChange={(field, checked) => setBaijiuFields({ ...baijiuFields, [field]: checked })}
        />
      )}
      <div className="settings-checkbox-container" style={{ justifyContent: 'center' }}>
        <div className="setting-item-checkbox">
          <input
            type="checkbox"
            id="dark-mode"
            checked={isDarkMode}
            onChange={e => setIsDarkMode(e.target.checked)}
          />
          <label htmlFor="dark-mode">深色模式</label>
        </div>
      </div>
      <button
        className="action-btn"
        style={{ marginTop: '1rem' }}
        onClick={handleStart}
        disabled={quizMode === 'blind' && Object.values(baijiuFields).every(v => !v) || allCountsZero}
      >
        开始学习
      </button>
    </div>
  );
};

export default WelcomePage; 