import { useState, useEffect } from 'react';
import { useCreateStudySession, useStudentCurriculum } from '../studentApi';

export function useStudyTimer(collapsible = false) {
  const [activeTab, setActiveTab] = useState('timer');
  const [isExpanded, setIsExpanded] = useState(!collapsible);

  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState(null);

  const [showLogModal, setShowLogModal] = useState(false);
  const [loggedMinutes, setLoggedMinutes] = useState(45);
  const [questionCount, setQuestionCount] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [blank, setBlank] = useState(0);
  const [sourceType, setSourceType] = useState('CHRONOMETER');
  const [successMsg, setSuccessMsg] = useState('');

  const [quickMinutes, setQuickMinutes] = useState(45);
  const [quickQuestions, setQuickQuestions] = useState(20);
  const [quickCorrect, setQuickCorrect] = useState(18);
  const [quickWrong, setQuickWrong] = useState(2);

  const createSessionMutation = useCreateStudySession();
  const { data: curriculum = [] } = useStudentCurriculum();
  const [topicId, setTopicId] = useState('');
  const topics = (curriculum || []).map((t) => ({ id: t.id, label: `${t.subjectName} - ${t.topicName}` }));

  useEffect(() => {
    let interval = null;
    if (isActive) {
      interval = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isActive]);

  const handleStart = () => {
    if (!sessionStartTime) setSessionStartTime(new Date().toISOString());
    setIsActive(true);
  };

  const handlePause = () => {
    setIsActive(false);
  };

  const handleReset = () => {
    setIsActive(false);
    setSeconds(0);
    setSessionStartTime(null);
  };

  const handleQuickPreset = (mins) => {
    setIsActive(false);
    setSeconds(mins * 60);
    setSessionStartTime(new Date().toISOString());
  };

  const handleFinishTimer = () => {
    setIsActive(false);
    const mins = Math.max(1, Math.round(seconds / 60));
    setLoggedMinutes(mins);
    setSourceType('CHRONOMETER');
    setShowLogModal(true);
  };

  const handleSaveSession = (e) => {
    e.preventDefault();
    createSessionMutation.mutate(
      {
        minutes: Number(loggedMinutes) || 0,
        questionCount: Number(questionCount) || 0,
        correct: Number(correct) || 0,
        wrong: Number(wrong) || 0,
        blank: Number(blank) || 0,
        sourceType,
        curriculumTopicId: topicId || undefined,
        startedAt: sessionStartTime || new Date().toISOString(),
        endedAt: new Date().toISOString(),
      },
      {
        onSuccess: () => {
          setShowLogModal(false);
          handleReset();
          setSuccessMsg('Çalışma oturumu başarıyla kaydedildi!');
          setTimeout(() => setSuccessMsg(''), 3000);
        },
      }
    );
  };

  const handleQuickLogSubmit = (e) => {
    e.preventDefault();
    createSessionMutation.mutate(
      {
        minutes: Number(quickMinutes) || 0,
        questionCount: Number(quickQuestions) || 0,
        correct: Number(quickCorrect) || 0,
        wrong: Number(quickWrong) || 0,
        blank: Math.max(0, (Number(quickQuestions) || 0) - (Number(quickCorrect) || 0) - (Number(quickWrong) || 0)),
        sourceType: 'QUICK_LOG',
        curriculumTopicId: topicId || undefined,
        startedAt: new Date().toISOString(),
        endedAt: new Date().toISOString(),
      },
      {
        onSuccess: () => {
          setSuccessMsg('Hızlı kayıt başarıyla eklendi!');
          setTimeout(() => setSuccessMsg(''), 3000);
        },
      }
    );
  };

  const formatTimer = (totalSec) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return {
    activeTab,
    setActiveTab,
    isExpanded,
    setIsExpanded,
    seconds,
    isActive,
    showLogModal,
    setShowLogModal,
    loggedMinutes,
    setLoggedMinutes,
    questionCount,
    setQuestionCount,
    correct,
    setCorrect,
    wrong,
    setWrong,
    blank,
    setBlank,
    successMsg,
    quickMinutes,
    setQuickMinutes,
    quickQuestions,
    setQuickQuestions,
    quickCorrect,
    setQuickCorrect,
    quickWrong,
    setQuickWrong,
    topicId,
    setTopicId,
    topics,
    isSubmitting: createSessionMutation.isPending,
    handleStart,
    handlePause,
    handleReset,
    handleQuickPreset,
    handleFinishTimer,
    handleSaveSession,
    handleQuickLogSubmit,
    formatTimer,
  };
}

