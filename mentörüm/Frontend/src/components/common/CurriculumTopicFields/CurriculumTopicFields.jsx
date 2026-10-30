import React from 'react';
import Input, { Select } from '../Input/Input';
import { useLevels, useSubjects, useUnits, useTopics } from '../../../features/coach/coachApi';

export default function CurriculumTopicFields({
  level,
  setLevel,
  subject,
  setSubject,
  unit,
  setUnit,
  topic,
  setTopic,
  freeTopic,
  setFreeTopic,
  onTopicAutoTitle,
  disabled = false,
}) {
  const { data: levels = [] } = useLevels();
  const { data: subjects = [] } = useSubjects(level || undefined);
  const { data: units = [] } = useUnits(subject || undefined, level || undefined);
  const { data: topics = [] } = useTopics(subject || undefined, level || undefined, unit || undefined);

  const handleTopicChange = (e) => {
    const selectedTopicId = e.target.value;
    setTopic(selectedTopicId);
    setFreeTopic('');

    if (selectedTopicId && selectedTopicId !== '__other__' && onTopicAutoTitle) {
      const tObj = topics.find((t) => t.id === selectedTopicId);
      const sObj = subjects.find((s) => s.id === subject);
      if (tObj) {
        const auto = [sObj?.name, tObj.topicName].filter(Boolean).join(' — ');
        if (auto) onTopicAutoTitle(auto);
      }
    }
  };

  return (
    <>
      <Select
        label="Seviye / Sınav"
        value={level}
        onChange={(e) => {
          setLevel(e.target.value);
          setSubject('');
          setUnit('');
          setTopic('');
          setFreeTopic('');
        }}
        disabled={disabled}
      >
        <option value="">-- Seviye Seç --</option>
        {levels.map((l) => (
          <option key={l} value={l}>
            {l}
          </option>
        ))}
      </Select>

      <Select
        label="Ders"
        value={subject}
        onChange={(e) => {
          setSubject(e.target.value);
          setUnit('');
          setTopic('');
          setFreeTopic('');
        }}
        disabled={!level || disabled}
      >
        <option value="">-- Ders Seç --</option>
        {subjects.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </Select>

      <Select
        label="Tema / Ünite (Opsiyonel)"
        value={unit}
        onChange={(e) => {
          setUnit(e.target.value);
          setTopic('');
          setFreeTopic('');
        }}
        disabled={!subject || disabled}
      >
        <option value="">-- Tüm Temalar --</option>
        {units.map((u) => (
          <option key={u.unitNumber} value={u.unitNumber}>
            {u.unitNumber}
            {u.unitName ? `. ${u.unitName}` : ''}
          </option>
        ))}
      </Select>

      <Select
        label="Konu (Opsiyonel)"
        value={topic}
        onChange={handleTopicChange}
        disabled={!subject || disabled}
      >
        <option value="">-- Konu Seç --</option>
        {topics.map((t) => (
          <option key={t.id} value={t.id}>
            {t.unitName ? `${t.unitName} → ` : ''}
            {t.topicName}
          </option>
        ))}
        <option value="__other__">➕ Bunun dışında (serbest konu)</option>
      </Select>

      {topic === '__other__' && (
        <Input
          label="Serbest Konu Başlığı"
          placeholder="Örn: Karmaşık Sayılar"
          value={freeTopic}
          onChange={(e) => setFreeTopic(e.target.value)}
          disabled={disabled}
        />
      )}
    </>
  );
}
