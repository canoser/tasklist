import React, { useState, useMemo } from 'react';
import Card from '../Card/Card';
import Button from '../Button/Button';
import SegmentedTabs from '../SegmentedTabs/SegmentedTabs';
import StatusBadge from '../StatusBadge/StatusBadge';
import Modal from '../Modal/Modal';
import Input from '../Input/Input';
import {
  useStudentGradeReport,
  useUpsertSubjectTargets,
} from '../../../features/coach/api/coachReportsCalendarApi';
import {
  useMyGradeReport,
  useUpsertMySubjectTargets,
} from '../../../features/student/studentApi';
import {
  TrendingUp,
  Target,
  HeartHandshake,
  AlertTriangle,
  Sparkles,
  BookOpen,
  Compass,
} from 'lucide-react';
import styles from './GradeReportDashboard.module.css';

const MOOD_LABELS = {
  GREAT: 'Harika 🤩',
  GOOD: 'İyi 🙂',
  HAPPY: 'Mutlu 😊',
  MOTIVATED: 'Motive 🔥',
  OKAY: 'Normal 😐',
  TIRED: 'Yorgun 😴',
  STRESSED: 'Stresli 😟',
  BELİRTİLMEDİ: 'Henüz Check-in Yok',
};

const formatGradeLabel = (g, currentGrade) => {
  if (Number(g) === 0) return '📊 Tüm Yıllar (Kümülatif)';
  const base = Number(g) === 13 ? 'Mezun' : `${g}. Sınıf`;
  return Number(g) === Number(currentGrade) ? `🟢 ${base} (Aktif)` : `📁 ${base} (Geçmiş Dönem)`;
};

export default function GradeReportDashboard({
  studentId = null,
  selfMode = false,
  initialGrade = null,
  onGradeChange = null,
}) {
  const [selectedGrade, setSelectedGrade] = useState(initialGrade);
  const [isTargetModalOpen, setIsTargetModalOpen] = useState(false);
  const [draftTargets, setDraftTargets] = useState({});

  const coachQuery = useStudentGradeReport(studentId, selectedGrade, !selfMode && Boolean(studentId));
  const selfQuery = useMyGradeReport(selectedGrade);

  const { data: report, isLoading, isError } = selfMode ? selfQuery : coachQuery;
  const upsertCoachTargets = useUpsertSubjectTargets();
  const upsertSelfTargets = useUpsertMySubjectTargets();

  const activeGradeValue = selectedGrade !== null && selectedGrade !== undefined
    ? String(selectedGrade)
    : String(report?.selectedGrade ?? report?.currentGrade ?? 12);

  const gradeTabs = useMemo(() => {
    if (!report) return [];
    const avail = Array.isArray(report.availableGrades) && report.availableGrades.length > 0
      ? report.availableGrades
      : [report.currentGrade || 12];
    const tabs = avail.map((g) => ({
      id: String(g),
      label: formatGradeLabel(g, report.currentGrade),
    }));
    tabs.push({ id: '0', label: '📊 Tüm Yıllar (Kümülatif)' });
    return tabs;
  }, [report]);

  const handleSelectGradeTab = (tabId) => {
    const numeric = Number(tabId);
    setSelectedGrade(numeric);
    if (onGradeChange) onGradeChange(numeric);
  };

  const handleOpenTargetModal = () => {
    if (!report?.subjectMastery) return;
    const map = {};
    report.subjectMastery.forEach((s) => {
      map[s.subjectId] = {
        targetNet: s.targetNet ?? '',
        targetScore: s.targetScore ?? '',
      };
    });
    setDraftTargets(map);
    setIsTargetModalOpen(true);
  };

  const handleSaveTargets = async (e) => {
    e.preventDefault();
    if (!report) return;
    const effectiveGrade = report.selectedGrade > 0 ? report.selectedGrade : report.currentGrade;
    const targetsPayload = Object.entries(draftTargets)
      .filter(([, val]) => val.targetNet !== '' || val.targetScore !== '')
      .map(([subjectId, val]) => ({
        subjectId,
        targetNet: Number(val.targetNet) || 0,
        targetScore: val.targetScore !== '' ? Number(val.targetScore) : null,
      }));

    if (selfMode) {
      await upsertSelfTargets.mutateAsync({ grade: effectiveGrade, targets: targetsPayload });
    } else if (studentId) {
      await upsertCoachTargets.mutateAsync({ studentId, grade: effectiveGrade, targets: targetsPayload });
    }
    setIsTargetModalOpen(false);
  };

  if (isLoading) {
    return (
      <Card>
        <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-color-muted)' }}>
          Sınıf bazlı eğitim koçluğu karnesi hazırlanıyor...
        </div>
      </Card>
    );
  }

  if (isError || !report) {
    return (
      <Card>
        <div style={{ padding: 24, textAlign: 'center', color: 'var(--color-danger, #ef4444)' }}>
          Sınıf raporu yüklenemedi.
        </div>
      </Card>
    );
  }

  const effectiveGrade = report.selectedGrade > 0 ? report.selectedGrade : report.currentGrade;
  const gm = report.gradeModule || {};
  const wb = report.wellbeing || {};
  const profile = report.profile || {};
  const chronologicalExams = [...(report.examSeries || [])].reverse();

  return (
    <div className={styles.dashboardWrap} data-testid="grade-report-dashboard">
      {/* 1. Üst Sistem Kimliği + Sınıf Dönemi (Arşiv) Seçici */}
      <Card>
        <div className={styles.profileBanner}>
          <div className={styles.profileHeaderLeft}>
            <div className={styles.badgeRow}>
              <StatusBadge
                status="ACTIVE"
                label={profile.primaryFocusBadge || `${effectiveGrade}. Sınıf Sistemi`}
                pill
              />
              <StatusBadge
                status="PENDING"
                label={`Net Kuralı: ${profile.wrongPenaltyRule || '4 Yanlış = 1 Doğru'}`}
                pill
              />
              {report.selectedGrade > 0 && report.selectedGrade !== report.currentGrade && (
                <StatusBadge
                  status="DUE_TODAY"
                  label={`📁 ${report.selectedGrade}. Sınıf Geçmiş Dönem Arşivi`}
                  pill
                />
              )}
            </div>
            <h2 className={styles.systemTitle} data-testid="grade-system-title">
              {profile.systemTitle}
            </h2>
            <p className={styles.systemSubtitle}>{profile.subtitle}</p>
          </div>

          {report.canEditTargets && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenTargetModal}
              data-testid="open-subject-targets-btn"
            >
              <Target size={15} />
              <span>🎯 Ders Hedeflerini Düzenle</span>
            </Button>
          )}
        </div>

        <div className={styles.gradeTabsRow} data-testid="grade-history-switcher">
          <SegmentedTabs
            tabs={gradeTabs}
            activeTab={activeGradeValue}
            onChange={handleSelectGradeTab}
            size="sm"
          />
        </div>
      </Card>

      {/* 2. Akıllı Koçluk Teşhisleri */}
      {Array.isArray(report.insights) && report.insights.length > 0 && (
        <div className={styles.insightsList} data-testid="coaching-insights-list">
          {report.insights.map((ins, idx) => (
            <div key={idx} className={styles.insightCard}>
              <Sparkles
                size={18}
                style={{
                  color:
                    ins.severity === 'warning'
                      ? 'var(--color-warning, #f59e0b)'
                      : ins.severity === 'success'
                        ? 'var(--color-success, #10b981)'
                        : 'var(--color-primary, #6366f1)',
                  flexShrink: 0,
                  marginTop: 2,
                }}
              />
              <div>
                <div className={styles.insightTitle}>{ins.title}</div>
                <div className={styles.insightMsg}>{ins.message}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 3. 4'lü Sınıf KPI Kartları */}
      <div className={styles.kpiGrid} data-testid="grade-kpi-grid">
        {(report.kpis || []).map((kpi) => (
          <Card key={kpi.id}>
            <div className={styles.kpiCard} data-testid={`grade-kpi-${kpi.id}`}>
              <span className={styles.kpiLabel}>{kpi.label}</span>
              <div className={styles.kpiValueRow}>
                <span
                  className={styles.kpiValue}
                  style={{
                    color:
                      kpi.statusTone === 'success'
                        ? 'var(--color-success, #10b981)'
                        : kpi.statusTone === 'warning'
                          ? 'var(--color-warning, #f59e0b)'
                          : 'var(--color-primary, #6366f1)',
                  }}
                >
                  {kpi.value}
                </span>
                {kpi.unit && <span className={styles.kpiUnit}>{kpi.unit}</span>}
              </div>
              <span className={styles.kpiSubtext}>{kpi.subtext}</span>
            </div>
          </Card>
        ))}
      </div>

      {/* 4. Sınıfa Özel Derin Analiz Modülü + 7. Sütun (İyi Oluş & GROW) */}
      <div className={styles.twoColGrid}>
        <Card>
          <h3 className={styles.sectionTitle}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Compass size={17} color="var(--color-primary, #6366f1)" />
              <span>
                {effectiveGrade <= 6 && '6. Sınıf Çalışma Alışkanlığı, Yazılı & Okuma Karnesi'}
                {effectiveGrade === 7 && '7. Sınıf Ön-LGS Ana Branş Doğruluk & Soru Hızı'}
                {effectiveGrade === 8 && '8. Sınıf LGS Katsayılı Puan (4x/1x) & Hedef Analizi'}
                {effectiveGrade === 9 && '9. Sınıf OBP Kalkanı & Temel TYT Konu Takibi'}
                {effectiveGrade === 10 && '10. Sınıf Alan Seçimi Karar Matrisi (SAY / EA / SÖZ)'}
                {effectiveGrade === 11 && '11. Sınıf Çift Kulvar (%65 AYT / %35 TYT) Denge Analizi'}
                {effectiveGrade >= 12 && '12. Sınıf & Mezun YKS Birleşik Puan ve Pareto 80/20 Odağı'}
              </span>
            </span>
          </h3>

          {effectiveGrade <= 7 && (
            <div>
              <div className={styles.metricRow}>
                <div className={styles.metricHeader}>
                  <span>Haftalık Çalışma Uyum Oranı ({gm.weeklyStudyMinutes || 0} dk)</span>
                  <strong>%{gm.weeklyRoutineAdherence || 0}</strong>
                </div>
                <div className={styles.progressTrack}>
                  <div
                    className={styles.progressFill}
                    style={{
                      width: `${Math.min(100, gm.weeklyRoutineAdherence || 0)}%`,
                      background: 'var(--color-success, #10b981)',
                    }}
                  />
                </div>
              </div>
              <div className={styles.metricRow}>
                <div className={styles.metricHeader}>
                  <span>Ana Branş Doğruluk Oranı (Matematik / Fen / Türkçe)</span>
                  <strong>%{gm.coreBranchAccuracy || 0}</strong>
                </div>
                <div className={styles.progressTrack}>
                  <div
                    className={styles.progressFill}
                    style={{
                      width: `${Math.min(100, gm.coreBranchAccuracy || 0)}%`,
                      background: 'var(--color-primary, #6366f1)',
                    }}
                  />
                </div>
              </div>
              <div className={styles.badgeRow} style={{ marginTop: 10 }}>
                <StatusBadge status="ACTIVE" label={`🔥 ${gm.streakDays || 0} Gün Aktif Seri`} />
                <StatusBadge status="PENDING" label={`⚡ Hız: ${gm.questionsPerMinute || 0} soru/dk`} />
                <StatusBadge
                  status="APPROVED"
                  label={`📚 Kaynak: ${gm.completedResourceUnits || 0}/${gm.totalResourceUnits || 0} Bölüm`}
                />
              </div>
            </div>
          )}

          {effectiveGrade === 8 && (
            <div>
              <div className={styles.metricRow}>
                <div className={styles.metricHeader}>
                  <span>LGS Katsayılı Puan Simülasyonu (500 Tam Puan)</span>
                  <strong>{gm.estimatedLgsScore || 0} / 500</strong>
                </div>
                <div className={styles.progressTrack}>
                  <div
                    className={styles.progressFill}
                    style={{
                      width: `${Math.min(100, Math.round(((gm.estimatedLgsScore || 0) / 500) * 100))}%`,
                      background: 'var(--color-primary, #6366f1)',
                    }}
                  />
                </div>
              </div>
              <div className={styles.badgeRow} style={{ marginTop: 10 }}>
                <StatusBadge status="ACTIVE" label={`4x Ana Branş Net Toplamı: ${gm.coreBranchNetSum || 0}`} />
                <StatusBadge status="PENDING" label={`1x Ara Branş Net Toplamı: ${gm.minorBranchNetSum || 0}`} />
                <StatusBadge
                  status={gm.targetScoreGap <= 15 ? 'DONE' : 'DUE_TODAY'}
                  label={`Hedef Farkı: ${gm.targetScoreGap <= 0 ? 'Hedefe Ulaşıldı' : `-${gm.targetScoreGap} Puan`}`}
                />
              </div>
            </div>
          )}

          {effectiveGrade === 9 && (
            <div>
              <div className={styles.metricRow}>
                <div className={styles.metricHeader}>
                  <span>Okul Yazılı Ortalaması ve OBP Katkısı (60 Tam Puan)</span>
                  <strong>+{gm.estimatedObpContribution || 0} / 60 Puan</strong>
                </div>
                <div className={styles.progressTrack}>
                  <div
                    className={styles.progressFill}
                    style={{
                      width: `${Math.min(100, Math.round(((gm.estimatedObpContribution || 0) / 60) * 100))}%`,
                      background: 'var(--color-success, #10b981)',
                    }}
                  />
                </div>
              </div>
              <div className={styles.metricRow}>
                <div className={styles.metricHeader}>
                  <span>9. Sınıf Temel TYT Konu Tamamlama Oranı</span>
                  <strong>%{gm.grade9SyllabusCompletionRate || 0}</strong>
                </div>
                <div className={styles.progressTrack}>
                  <div
                    className={styles.progressFill}
                    style={{
                      width: `${Math.min(100, gm.grade9SyllabusCompletionRate || 0)}%`,
                      background: 'var(--color-primary, #6366f1)',
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {effectiveGrade === 10 && (
            <div data-testid="grade10-track-matrix">
              {[
                { label: 'Sayısal (SAY — Mat %55 + Fen %45)', score: gm.aptitudeSayScore || 0, color: '#6366f1' },
                { label: 'Eşit Ağırlık (EA — Mat %50 + Tr/Edb %50)', score: gm.aptitudeEaScore || 0, color: '#10b981' },
                { label: 'Sözel (SÖZ — Tr/Edb %50 + Sosyal %50)', score: gm.aptitudeSozScore || 0, color: '#f59e0b' },
              ].map((item) => (
                <div key={item.label} className={styles.metricRow}>
                  <div className={styles.metricHeader}>
                    <span>{item.label}</span>
                    <strong>{item.score} / 100</strong>
                  </div>
                  <div className={styles.progressTrack}>
                    <div
                      className={styles.progressFill}
                      style={{ width: `${Math.min(100, item.score)}%`, background: item.color }}
                    />
                  </div>
                </div>
              ))}
              <div className={styles.badgeRow} style={{ marginTop: 8 }}>
                <StatusBadge status="ACTIVE" label={`Önerilen Alan: ${gm.recommendedTrack || 'SAY'}`} />
                <StatusBadge status="PENDING" label={`9+10 Kümülatif TYT: %${gm.cumulativeTytSyllabusRate || 0}`} />
              </div>
            </div>
          )}

          {effectiveGrade === 11 && (
            <div data-testid="grade11-dual-track">
              <div className={styles.metricHeader} style={{ marginBottom: 6 }}>
                <span>Çalışma Süresi Dağılımı: AYT %{gm.aytStudySharePercent} / TYT %{gm.tytStudySharePercent}</span>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-color-muted)' }}>
                  Hedef: %65 AYT / %35 TYT
                </span>
              </div>
              <div className={styles.dualBarTrack}>
                <div
                  style={{
                    width: `${gm.aytStudySharePercent || 65}%`,
                    background: 'var(--color-primary, #6366f1)',
                  }}
                  title={`AYT: %${gm.aytStudySharePercent}`}
                />
                <div
                  style={{
                    width: `${gm.tytStudySharePercent || 35}%`,
                    background: 'var(--color-success, #10b981)',
                  }}
                  title={`TYT: %${gm.tytStudySharePercent}`}
                />
              </div>
              <div className={styles.badgeRow} style={{ marginTop: 12 }}>
                <StatusBadge status="PENDING" label={`11. Sınıf AYT Net Ort: ${gm.grade11AytAvgNet || 0}`} />
                <StatusBadge status="ACTIVE" label={`Son TYT Neti: ${gm.lastTytNet || 0} / 120`} />
                <StatusBadge status="APPROVED" label={`OBP Katkısı: +${gm.estimatedObpContribution || 0}`} />
              </div>
            </div>
          )}

          {effectiveGrade >= 12 && (
            <div data-testid="grade12-yks-module">
              <div className={styles.metricRow}>
                <div className={styles.metricHeader}>
                  <span>YKS Yerleştirme Puan Tahmini (%40 TYT + %60 AYT + OBP)</span>
                  <strong>{gm.combinedYksEstimate || 0} / 560</strong>
                </div>
                <div className={styles.progressTrack}>
                  <div
                    className={styles.progressFill}
                    style={{
                      width: `${Math.min(100, Math.round(((gm.combinedYksEstimate || 0) / 560) * 100))}%`,
                      background: 'var(--color-primary, #6366f1)',
                    }}
                  />
                </div>
              </div>
              <div className={styles.badgeRow} style={{ marginTop: 10 }}>
                <StatusBadge status="ACTIVE" label={`Son TYT: ${gm.lastTytNet || 0} / 120`} />
                <StatusBadge status="PENDING" label={`Son AYT: ${gm.lastAytNet || 0} / 80`} />
                <StatusBadge status="APPROVED" label={`OBP: +${gm.estimatedObpContribution || 48}`} />
              </div>
              {Array.isArray(gm.paretoFocusSubjects) && gm.paretoFocusSubjects.length > 0 && (
                <div style={{ marginTop: 10, fontSize: '0.82rem', color: 'var(--text-color-muted)' }}>
                  <strong>Pareto 80/20 En Hızlı Net Artış Dersleri:</strong>{' '}
                  {gm.paretoFocusSubjects.join(' · ')}
                </div>
              )}
            </div>
          )}
        </Card>

        {/* 7. Sütun — İyi Oluş, Motivasyon & GROW Koçluk Seansları */}
        <Card>
          <h3 className={styles.sectionTitle}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <HeartHandshake size={17} color="var(--color-success, #10b981)" />
              <span>İyi Oluş, Motivasyon & GROW Takibi</span>
            </span>
          </h3>
          <div className={styles.metricRow}>
            <div className={styles.metricHeader}>
              <span>Son 14 Gün Pozitif Duygu Oranı ({wb.recentCheckinCount || 0} Check-in)</span>
              <strong>%{wb.positiveMoodRate || 0}</strong>
            </div>
            <div className={styles.progressTrack}>
              <div
                className={styles.progressFill}
                style={{
                  width: `${Math.min(100, wb.positiveMoodRate || 0)}%`,
                  background: 'var(--color-success, #10b981)',
                }}
              />
            </div>
          </div>
          <div className={styles.badgeRow} style={{ marginTop: 10 }}>
            <StatusBadge
              status="ACTIVE"
              label={`Baskın Duygu: ${MOOD_LABELS[wb.dominantMood] || wb.dominantMood || 'Belirtilmedi'}`}
            />
            <StatusBadge
              status="PENDING"
              label={`GROW Koçluk Seansı: ${wb.completedGrowSessionsCount || 0}`}
            />
          </div>
          {wb.lastGrowGoalSummary && (
            <div style={{ marginTop: 10, fontSize: '0.8rem', color: 'var(--text-color-muted)' }}>
              <strong>Son GROW Eylem Kararı:</strong> {wb.lastGrowGoalSummary}
            </div>
          )}
        </Card>
      </div>

      {/* 5. Dahili <svg><polyline> Net / Yazılı Gelişim Çizgi Grafiği + Hata Nedenleri */}
      <div className={styles.twoColGrid}>
        <Card>
          <h3 className={styles.sectionTitle}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <TrendingUp size={17} color="var(--color-primary, #6366f1)" />
              <span>Deneme Net & Yazılı Gelişim Trendi ({chronologicalExams.length} Sınav)</span>
            </span>
          </h3>
          {chronologicalExams.length === 0 ? (
            <p style={{ color: 'var(--text-color-muted)', fontSize: '0.85rem', margin: 0 }}>
              Seçili sınıf döneminde henüz kayıtlı sınav bulunmuyor.
            </p>
          ) : (
            <div className={styles.svgChartBox} data-testid="exam-trend-svg-chart">
              {(() => {
                const values = chronologicalExams.map((e) =>
                  Number(e.schoolScoreAverage ?? e.totalNet ?? 0)
                );
                const maxVal = Math.max(...values, 20);
                const width = Math.max(360, chronologicalExams.length * 80);
                const height = 140;
                const padX = 32;
                const padY = 24;
                const usableW = Math.max(1, width - padX * 2);
                const usableH = height - padY * 2;

                const pts = chronologicalExams.map((ex, idx) => {
                  const val = Number(ex.schoolScoreAverage ?? ex.totalNet ?? 0);
                  const x =
                    chronologicalExams.length === 1
                      ? width / 2
                      : padX + (idx / (chronologicalExams.length - 1)) * usableW;
                  const y = padY + usableH - (Math.min(maxVal, Math.max(0, val)) / maxVal) * usableH;
                  return { x: Math.round(x), y: Math.round(y), val, ex };
                });

                const polylinePoints = pts.map((p) => `${p.x},${p.y}`).join(' ');

                return (
                  <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ minWidth: 320 }}>
                    <line
                      x1={padX}
                      y1={height - padY}
                      x2={width - padX}
                      y2={height - padY}
                      stroke="var(--border-color, #cbd5e1)"
                      strokeWidth="1"
                    />
                    {pts.length > 1 && (
                      <polyline
                        fill="none"
                        stroke="var(--color-primary, #6366f1)"
                        strokeWidth="2.5"
                        points={polylinePoints}
                      />
                    )}
                    {pts.map((p) => (
                      <g key={p.ex.examId}>
                        <circle
                          cx={p.x}
                          cy={p.y}
                          r="4.5"
                          fill="var(--color-primary, #6366f1)"
                        />
                        <text
                          x={p.x}
                          y={Math.max(12, p.y - 8)}
                          textAnchor="middle"
                          fontSize="11"
                          fontWeight="700"
                          fill="var(--text-color, #0f172a)"
                        >
                          {p.val}
                        </text>
                        <text
                          x={p.x}
                          y={height - 6}
                          textAnchor="middle"
                          fontSize="10"
                          fill="var(--text-color-muted, #64748b)"
                        >
                          {(p.ex.examName || 'Sınav').slice(0, 12)}
                        </text>
                      </g>
                    ))}
                  </svg>
                );
              })()}
            </div>
          )}
        </Card>

        <Card>
          <h3 className={styles.sectionTitle}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <AlertTriangle size={17} color="var(--color-warning, #f59e0b)" />
              <span>Sınav Hata Nedenleri Dağılımı</span>
            </span>
          </h3>
          {!report.errorReasons || report.errorReasons.length === 0 ? (
            <p style={{ color: 'var(--text-color-muted)', fontSize: '0.85rem', margin: 0 }}>
              Sınavlarda henüz hata nedeni etiketi girilmemiş.
            </p>
          ) : (
            report.errorReasons.map((er) => (
              <div key={er.reason} className={styles.metricRow}>
                <div className={styles.metricHeader}>
                  <span>{er.reason}</span>
                  <strong>
                    {er.count} sınav (%{er.percentage})
                  </strong>
                </div>
                <div className={styles.progressTrack}>
                  <div
                    className={styles.progressFill}
                    style={{
                      width: `${Math.min(100, er.percentage)}%`,
                      background: 'var(--color-warning, #f59e0b)',
                    }}
                  />
                </div>
              </div>
            ))
          )}
        </Card>
      </div>

      {/* 6. Ders Bazlı Başarı, Müfredat Kapsamı ve Hedef Net (Gap) Tablosu */}
      <Card>
        <h3 className={styles.sectionTitle}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <BookOpen size={17} color="var(--color-primary, #6366f1)" />
            <span>Ders Bazlı Müfredat Kapsamı, Soru Doğruluğu & Hedef Net Farkı (Gap)</span>
          </span>
        </h3>
        {!report.subjectMastery || report.subjectMastery.length === 0 ? (
          <p style={{ color: 'var(--text-color-muted)', fontSize: '0.85rem', margin: 0 }}>
            Bu sınıf döneminde henüz ders verisi bulunmuyor.
          </p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.masteryTable} data-testid="subject-mastery-table">
              <thead>
                <tr>
                  <th>Ders</th>
                  <th>Müfredat Kapsamı</th>
                  <th>Çözülen Soru & Doğruluk</th>
                  <th>Son Net / Yazılı</th>
                  <th>Hedef Net</th>
                  <th>Fark (Gap)</th>
                </tr>
              </thead>
              <tbody>
                {report.subjectMastery.map((s) => (
                  <tr key={s.subjectId}>
                    <td style={{ fontWeight: 700 }}>{s.subjectName}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className={styles.progressTrack} style={{ maxWidth: 90 }}>
                          <div
                            className={styles.progressFill}
                            style={{
                              width: `${Math.min(100, s.topicCompletionPercent)}%`,
                              background: 'var(--color-primary, #6366f1)',
                            }}
                          />
                        </div>
                        <span>
                          %{s.topicCompletionPercent} ({s.completedTopics}/{s.totalTopics})
                        </span>
                      </div>
                    </td>
                    <td>
                      {s.solvedQuestions} soru · <strong>%{s.successRate}</strong>
                    </td>
                    <td>
                      <strong>{s.lastExamNet} Net</strong>
                      {s.schoolWrittenAvg !== null && s.schoolWrittenAvg !== undefined && (
                        <span style={{ color: 'var(--text-color-muted)', marginLeft: 6 }}>
                          (Yazılı: {s.schoolWrittenAvg})
                        </span>
                      )}
                    </td>
                    <td>{s.targetNet !== null && s.targetNet !== undefined ? `${s.targetNet} Net` : '-'}</td>
                    <td>
                      {s.netGap === null || s.netGap === undefined ? (
                        <span style={{ color: 'var(--text-color-muted)' }}>Hedef girilmedi</span>
                      ) : s.netGap <= 0 ? (
                        <StatusBadge status="DONE" label="Hedefe Ulaşıldı ✓" />
                      ) : (
                        <StatusBadge status="DUE_TODAY" label={`-${s.netGap} Net`} />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* 7. Ders Hedef Neti Düzenleme Modalı */}
      <Modal
        isOpen={isTargetModalOpen}
        onClose={() => setIsTargetModalOpen(false)}
        title={`${effectiveGrade === 13 ? 'Mezun' : `${effectiveGrade}. Sınıf`} Ders Bazlı Hedef Net & Yazılı Belirle`}
      >
        <form onSubmit={handleSaveTargets}>
          <div className={styles.targetGrid}>
            {(report.subjectMastery || []).map((s) => {
              const cur = draftTargets[s.subjectId] || { targetNet: '', targetScore: '' };
              return (
                <div key={s.subjectId} className={styles.targetRow}>
                  <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>{s.subjectName}</span>
                  <Input
                    type="number"
                    step="0.25"
                    min="0"
                    max="120"
                    placeholder="Hedef Net"
                    value={cur.targetNet}
                    onChange={(e) =>
                      setDraftTargets((prev) => ({
                        ...prev,
                        [s.subjectId]: { ...cur, targetNet: e.target.value },
                      }))
                    }
                    data-testid={`target-net-input-${s.subjectName}`}
                  />
                  <Input
                    type="number"
                    step="1"
                    min="0"
                    max="100"
                    placeholder="Hedef Yazılı (0-100)"
                    value={cur.targetScore}
                    onChange={(e) =>
                      setDraftTargets((prev) => ({
                        ...prev,
                        [s.subjectId]: { ...cur, targetScore: e.target.value },
                      }))
                    }
                  />
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
            <Button type="button" variant="outline" onClick={() => setIsTargetModalOpen(false)}>
              İptal
            </Button>
            <Button
              type="submit"
              isLoading={upsertCoachTargets.isPending || upsertSelfTargets.isPending}
              data-testid="save-subject-targets-btn"
            >
              Hedefleri Kaydet
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
