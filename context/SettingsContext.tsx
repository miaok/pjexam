import React, { createContext, useContext, useState } from 'react';
import { QuizMode, BaijiuFields } from '@/utils/types';
import { DEFAULT_EXAM_COUNTS } from '@/constants';

type QuestionCounts = { boolean: number; single: number; multiple: number };

interface SettingsContextProps {
  quizMode: QuizMode;
  setQuizMode: (mode: QuizMode) => void;
  questionCounts: QuestionCounts;
  setQuestionCounts: (counts: QuestionCounts) => void;
  maxCounts: QuestionCounts;
  shuffleOptions: boolean;
  setShuffleOptions: (val: boolean) => void;
  isRapidMode: boolean;
  setIsRapidMode: (val: boolean) => void;
  isDarkMode: boolean;
  setIsDarkMode: (val: boolean) => void;
  baijiuFields: BaijiuFields;
  setBaijiuFields: (fields: BaijiuFields) => void;
}

const SettingsContext = createContext<SettingsContextProps | undefined>(undefined);

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

export const SettingsProvider: React.FC<{
  children: React.ReactNode;
  initial: Omit<SettingsContextProps, 'setQuizMode' | 'setQuestionCounts' | 'setShuffleOptions' | 'setIsRapidMode' | 'setIsDarkMode' | 'setBaijiuFields'>;
}> = ({ children, initial }) => {
  const getDefaultQuestionCounts = (mode: QuizMode, maxCounts: QuestionCounts): QuestionCounts => {
    if (mode === 'exam') {
      return DEFAULT_EXAM_COUNTS;
    } else {
      return { ...maxCounts };
    }
  };

  const [quizMode, setQuizMode] = useState<QuizMode>(initial.quizMode);
  const [questionCounts, setQuestionCounts] = useState<QuestionCounts>(getDefaultQuestionCounts(initial.quizMode, initial.maxCounts));
  const [shuffleOptions, setShuffleOptions] = useState<boolean>(initial.shuffleOptions);
  const [isRapidMode, setIsRapidMode] = useState<boolean>(initial.isRapidMode);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(initial.isDarkMode);
  const [baijiuFields, setBaijiuFields] = useState<BaijiuFields>(initial.baijiuFields);

  React.useEffect(() => {
    setQuestionCounts(getDefaultQuestionCounts(quizMode, initial.maxCounts));
  }, [quizMode, initial.maxCounts]);

  const setQuizModeWithClear: typeof setQuizMode = (mode) => {
    setQuizMode(mode);
  };

  return (
    <SettingsContext.Provider value={{
      quizMode, setQuizMode: setQuizModeWithClear,
      questionCounts, setQuestionCounts,
      maxCounts: initial.maxCounts,
      shuffleOptions, setShuffleOptions,
      isRapidMode, setIsRapidMode,
      isDarkMode, setIsDarkMode,
      baijiuFields, setBaijiuFields
    }}>
      {children}
    </SettingsContext.Provider>
  );
}; 