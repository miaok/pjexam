import { useState, useEffect } from 'react';
import { baijiuData } from '@/baijiu';
import { getQuestionKey } from '@/utils';
import { updateStats, getStats, saveProgress, loadProgress } from '@/utils/storage';
import { BaijiuUserAnswer, BaijiuSample } from '@/utils/types';

const initialBaijiuAnswer: BaijiuUserAnswer = { 香型: '', 酒度: '', 总分: '92.0', 设备: [], 发酵剂: [] };

export default function useBlindTasting({
  baijiuFields
}: {
  baijiuFields: Record<string, boolean>;
}) {
  const [baijiuQuestions, setBaijiuQuestions] = useState<BaijiuSample[]>([]);
  const [currentBaijiuIndex, setCurrentBaijiuIndex] = useState(0);
  const [baijiuUserAnswer, setBaijiuUserAnswer] = useState<BaijiuUserAnswer>(initialBaijiuAnswer);
  const [isBaijiuAnswerConfirmed, setIsBaijiuAnswerConfirmed] = useState(false);
  const [activeBaijiuFields, setActiveBaijiuFields] = useState(baijiuFields);

  // 自动保存盲品进度
  useEffect(() => {
    const progress = loadProgress() || {};
    saveProgress({
      ...progress,
      baijiuQuestions,
      currentBaijiuIndex,
      baijiuUserAnswer,
      isBaijiuAnswerConfirmed,
      activeBaijiuFields
    });
  }, [baijiuQuestions, currentBaijiuIndex, baijiuUserAnswer, isBaijiuAnswerConfirmed, activeBaijiuFields]);

  // startBlindTasting
  const startBlindTasting = () => {
    const stats = getStats();
    const sortedData = baijiuData.slice().sort((a, b) => {
      const ka = getBaijiuKey(a);
      const kb = getBaijiuKey(b);
      const ta = stats[ka]?.total ?? 0;
      const tb = stats[kb]?.total ?? 0;
      if (ta !== tb) return ta - tb;
      return Math.random() - 0.5;
    });
    const shuffledData = shuffleArray(sortedData);
    setBaijiuQuestions(shuffledData);
    setCurrentBaijiuIndex(0);
    setBaijiuUserAnswer(initialBaijiuAnswer);
    setIsBaijiuAnswerConfirmed(false);
    setActiveBaijiuFields(baijiuFields);
  };

  // shuffleArray
  const shuffleArray = <T,>(array: T[]): T[] => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  };

  // handleBaijiuSelectChange
  const handleBaijiuSelectChange = (field: '香型' | '酒度', value: string) => {
    setBaijiuUserAnswer(prev => ({ ...prev, [field]: value }));
  };

  // handleBaijiuScoreAdjust
  const handleBaijiuScoreAdjust = (direction: 'up' | 'down' | 'up1' | 'down1') => {
    setBaijiuUserAnswer(prev => {
      const currentScore = parseFloat(prev.总分);
      let newScore = currentScore;
      if (direction === 'up') newScore += 0.2;
      else if (direction === 'down') newScore -= 0.2;
      else if (direction === 'up1') newScore += 1;
      else if (direction === 'down1') newScore -= 1;
      return { ...prev, 总分: newScore.toFixed(1) };
    });
  };

  // handleBaijiuMultiSelectChange
  const handleBaijiuMultiSelectChange = (field: '设备' | '发酵剂', value: string) => {
    setBaijiuUserAnswer(prev => {
      const currentSelection = prev[field];
      const newSelection = currentSelection.includes(value)
        ? currentSelection.filter(item => item !== value)
        : [...currentSelection, value];
      return { ...prev, [field]: newSelection };
    });
  };

  // handleBaijiuAction
  const handleBaijiuAction = () => {
    if (isBaijiuAnswerConfirmed) {
      if (currentBaijiuIndex < baijiuQuestions.length - 1) {
        setCurrentBaijiuIndex(prev => prev + 1);
        setBaijiuUserAnswer(initialBaijiuAnswer);
        setIsBaijiuAnswerConfirmed(false);
      } else {
        playAgain();
      }
    } else {
      setIsBaijiuAnswerConfirmed(true);
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
      let isWrong = false;
      if (baijiuUserAnswer.香型 !== currentSample.香型) isWrong = true;
      if (baijiuUserAnswer.酒度 !== currentSample.酒度.toString()) isWrong = true;
      const userScore = parseFloat(baijiuUserAnswer.总分);
      const correctScore = parseFloat(currentSample.总分.toString());
      if (Math.abs(userScore - correctScore) > 0.4) isWrong = true;
      const userEquip = new Set(baijiuUserAnswer.设备);
      const correctEquip = new Set((currentSample.设备 as string).split(',').map(s => s.trim()));
      if (userEquip.size !== correctEquip.size || [...userEquip].some(x => !correctEquip.has(x))) isWrong = true;
      const userAgent = new Set(baijiuUserAnswer.发酵剂);
      const correctAgent = new Set((currentSample.发酵剂 as string).split(',').map(s => s.trim()));
      if (userAgent.size !== correctAgent.size || [...userAgent].some(x => !correctAgent.has(x))) isWrong = true;
      updateStats(key, isWrong);
    }
  };

  // playAgain
  const playAgain = () => {
    setBaijiuQuestions([]);
    setCurrentBaijiuIndex(0);
    setBaijiuUserAnswer(initialBaijiuAnswer);
    setIsBaijiuAnswerConfirmed(false);
  };

  // 生成唯一 key
  const getBaijiuKey = (sample: BaijiuSample) => `${sample.酒样名称}||${sample.香型}||${sample.酒度}`;

  return {
    baijiuQuestions,
    currentBaijiuIndex,
    baijiuUserAnswer,
    isBaijiuAnswerConfirmed,
    activeBaijiuFields,
    setBaijiuQuestions,
    setCurrentBaijiuIndex,
    setBaijiuUserAnswer,
    setIsBaijiuAnswerConfirmed,
    setActiveBaijiuFields,
    startBlindTasting,
    handleBaijiuSelectChange,
    handleBaijiuScoreAdjust,
    handleBaijiuMultiSelectChange,
    handleBaijiuAction,
    playAgain,
  };
} 