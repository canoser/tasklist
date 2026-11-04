using System;
using System.Collections.Generic;
using System.Linq;
using MentorumApi.DTOs;

namespace MentorumApi.Services
{
    public static class GradeReportProfileBuilder
    {
        public static GradeProfileMetaDto ResolveProfileMeta(int effectiveGrade, string penaltyMode)
        {
            bool noPenalty = string.Equals(penaltyMode, NetCalculator.PenaltyModeNoPenalty, StringComparison.OrdinalIgnoreCase);
            string middleRule = noPenalty ? "Cezasız Mod (Yanlış Götürmez)" : "3 Yanlış = 1 Doğru (MEB Ortaokul/LGS)";
            string highRule = noPenalty ? "Cezasız Mod (Yanlış Götürmez)" : "4 Yanlış = 1 Doğru (ÖSYM TYT/AYT)";

            return effectiveGrade switch
            {
                <= 6 => new GradeProfileMetaDto
                {
                    SystemCode = "GRADE_6_HABIT",
                    SystemTitle = "6. Sınıf — Oryantasyon & Çalışma Alışkanlığı Sistemi",
                    Subtitle = "Düzenli masa başı çalışma rutini, ödev disiplini, okul yazılı başarısı ve okuma/kaynak takibi",
                    PrimaryFocusBadge = "🟢 Alışkanlık & Okul Başarısı",
                    WrongPenaltyRule = middleRule,
                    PenaltyMode = penaltyMode
                },
                7 => new GradeProfileMetaDto
                {
                    SystemCode = "GRADE_7_PRE_LGS",
                    SystemTitle = "7. Sınıf — Akademik Temel & Ön-LGS Disiplin Sistemi",
                    Subtitle = "Ana branşlarda (Matematik-Fen-Türkçe) doğruluk oranı, yeni nesil soru çözüm hızı ve müfredat tamlığı",
                    PrimaryFocusBadge = "🟢 Ön-LGS Temel & Soru Hızı",
                    WrongPenaltyRule = middleRule,
                    PenaltyMode = penaltyMode
                },
                8 => new GradeProfileMetaDto
                {
                    SystemCode = "GRADE_8_LGS",
                    SystemTitle = "8. Sınıf — LGS Tam Saha Performans & Yüzdelik Sistem",
                    Subtitle = "4x katsayılı ana branş netleri, 500 tam puan üzerinden LGS simülasyonu ve Pareto eksik konu kapama",
                    PrimaryFocusBadge = "🟡 LGS Katsayılı Puan & Hedef",
                    WrongPenaltyRule = middleRule,
                    PenaltyMode = penaltyMode
                },
                9 => new GradeProfileMetaDto
                {
                    SystemCode = "GRADE_9_OBP_TYT",
                    SystemTitle = "9. Sınıf — Lise Adaptasyon, OBP Kalkanı & Temel TYT Sistemi",
                    Subtitle = "Okul yazılı ortalaması (OBP katkısı), 9. sınıf TYT temel konularını eksiksiz tamamlama ve çalışma dengesi",
                    PrimaryFocusBadge = "🔵 OBP Kalkanı & TYT Temeli",
                    WrongPenaltyRule = highRule,
                    PenaltyMode = penaltyMode
                },
                10 => new GradeProfileMetaDto
                {
                    SystemCode = "GRADE_10_TRACK_MATRIX",
                    SystemTitle = "10. Sınıf — Alan Seçimi Karar Matrisi & TYT İnşa Sistemi",
                    Subtitle = "Sayısal (SAY), Eşit Ağırlık (EA) ve Sözel (SÖZ) yetkinlik analizi ile 9–10 kümülatif TYT konu kapsamı",
                    PrimaryFocusBadge = "🔵 Alan Seçimi (SAY/EA/SÖZ) & TYT",
                    WrongPenaltyRule = highRule,
                    PenaltyMode = penaltyMode
                },
                11 => new GradeProfileMetaDto
                {
                    SystemCode = "GRADE_11_DUAL_TRACK",
                    SystemTitle = "11. Sınıf — Çift Kulvar (11. Sınıf AYT + TYT Temel) Denge Sistemi",
                    Subtitle = "11. sınıf alan derinliği (%65 AYT hedefi) ile TYT hız/rutin koruma (%35 TYT hedefi) dengesi",
                    PrimaryFocusBadge = "🟣 Çift Kulvar (%65 AYT / %35 TYT)",
                    WrongPenaltyRule = highRule,
                    PenaltyMode = penaltyMode
                },
                _ => new GradeProfileMetaDto
                {
                    SystemCode = "GRADE_12_YKS_PEAK",
                    SystemTitle = effectiveGrade == 13
                        ? "Mezun — YKS Tam Zamanlı Zirve & Hedef Eşleşme Sistemi"
                        : "12. Sınıf — YKS Zirve, TYT+AYT Gap & Strateji Sistemi",
                    Subtitle = "TYT (120) ve AYT (80) ayrı net trendi, hedef üniversite puan farkı (Gap), Pareto 80/20 odak ve sınav psikolojisi",
                    PrimaryFocusBadge = "🔴 YKS (TYT + AYT) Hedef Eşleşme",
                    WrongPenaltyRule = highRule,
                    PenaltyMode = penaltyMode
                }
            };
        }

        public static void PopulateGradeKpisAndInsights(
            StudentGradeReportDto report,
            int effectiveGrade,
            int totalHwAssigned,
            int totalHwCompleted,
            int totalHwOverdue,
            int weeklyTargetMinutes,
            int g9and10Rate)
        {
            var m = report.GradeModule;
            int totalMinutesAll = report.SubjectMastery.Sum(x => x.StudyMinutes);
            int totalQuestionsAll = report.SubjectMastery.Sum(x => x.SolvedQuestions);
            m.QuestionsPerMinute = totalMinutesAll > 0 ? Math.Round((decimal)totalQuestionsAll / totalMinutesAll, 2) : 0m;

            var schoolExams = report.ExamSeries.Where(e => e.SchoolScoreAverage.HasValue).ToList();
            m.SchoolWrittenAverage = schoolExams.Count > 0
                ? Math.Round(schoolExams.Average(e => e.SchoolScoreAverage!.Value), 1)
                : 0m;
            m.EstimatedObpContribution = NetCalculator.ComputeObpContribution(m.SchoolWrittenAverage);

            var coreMastery = report.SubjectMastery.Where(s => NetCalculator.IsLgsCoreSubject(s.SubjectName)).ToList();
            var minorMastery = report.SubjectMastery.Where(s => !NetCalculator.IsLgsCoreSubject(s.SubjectName)).ToList();
            m.CoreBranchAccuracy = coreMastery.Count > 0 ? Math.Round(coreMastery.Average(x => x.SuccessRate), 1) : 0m;
            m.CoreBranchNetSum = Math.Round(coreMastery.Sum(x => x.LastExamNet), 2);
            m.MinorBranchNetSum = Math.Round(minorMastery.Sum(x => x.LastExamNet), 2);

            var latestLgsExam = report.ExamSeries.FirstOrDefault(e => e.ExamType != NetCalculator.ExamTypeOkul);
            if (latestLgsExam != null)
            {
                m.EstimatedLgsScore = latestLgsExam.LgsWeightedScore
                    ?? NetCalculator.ComputeLgsWeightedScore(latestLgsExam.TotalNet, report.SubjectMastery.Select(s => ((string?)s.SubjectName, s.LastExamNet)));
            }
            decimal targetLgs = report.TargetScore ?? 450m;
            if (effectiveGrade == 8)
            {
                m.TargetScoreGap = m.EstimatedLgsScore > 0 ? Math.Max(0m, Math.Round(targetLgs - m.EstimatedLgsScore, 1)) : targetLgs;
            }

            int targetMins = weeklyTargetMinutes > 0 ? weeklyTargetMinutes : 300;
            m.WeeklyRoutineAdherence = Math.Min(100, (int)Math.Round(m.WeeklyStudyMinutes * 100.0 / targetMins));

            int avgSyllabus = report.SubjectMastery.Count > 0
                ? (int)Math.Round(report.SubjectMastery.Average(s => s.TopicCompletionPercent))
                : 0;
            int hwRate = totalHwAssigned > 0
                ? (int)Math.Round(totalHwCompleted * 100.0 / totalHwAssigned)
                : 100;

            m.OnTimeHomeworkRate = hwRate;
            m.Grade9SyllabusCompletionRate = avgSyllabus;
            m.CumulativeTytSyllabusRate = g9and10Rate > 0 ? g9and10Rate : avgSyllabus;

            decimal GroupCompetency(Func<string, bool> matcher)
            {
                var items = report.SubjectMastery.Where(s => matcher(s.SubjectName.ToUpperInvariant())).ToList();
                if (items.Count == 0) return 50m;
                return items.Average(i => (0.55m * i.SuccessRate) + (0.30m * (i.SchoolWrittenAvg ?? i.SuccessRate)) + (0.15m * i.TopicCompletionPercent));
            }

            decimal mathComp = GroupCompetency(n => n.Contains("MATEMAT") || n.Contains("GEOMETR"));
            decimal sciComp = GroupCompetency(n => n.Contains("FİZ") || n.Contains("FIZ") || n.Contains("KİM") || n.Contains("KIM") || n.Contains("BİYO") || n.Contains("BIYO") || n.Contains("FEN"));
            decimal turkComp = GroupCompetency(n => n.Contains("TÜRK") || n.Contains("TURK") || n.Contains("EDEB"));
            decimal socComp = GroupCompetency(n => n.Contains("TARİH") || n.Contains("TARIH") || n.Contains("COĞ") || n.Contains("COG") || n.Contains("FELSEF") || n.Contains("SOSYAL") || n.Contains("İNK") || n.Contains("INK"));

            var aptitude = NetCalculator.ComputeTrackAptitudeScores(mathComp, sciComp, turkComp, socComp);
            m.AptitudeSayScore = aptitude.SayScore;
            m.AptitudeEaScore = aptitude.EaScore;
            m.AptitudeSozScore = aptitude.SozScore;
            m.RecommendedTrack = aptitude.RecommendedTrack;

            var lastTyt = report.ExamSeries.FirstOrDefault(e => string.Equals(e.ExamType, NetCalculator.ExamTypeTyt, StringComparison.OrdinalIgnoreCase))
                          ?? report.ExamSeries.FirstOrDefault(e => !string.Equals(e.ExamType, NetCalculator.ExamTypeAyt, StringComparison.OrdinalIgnoreCase) && !string.Equals(e.ExamType, NetCalculator.ExamTypeOkul, StringComparison.OrdinalIgnoreCase));
            var lastAyt = report.ExamSeries.FirstOrDefault(e => string.Equals(e.ExamType, NetCalculator.ExamTypeAyt, StringComparison.OrdinalIgnoreCase));

            m.LastTytNet = lastTyt?.TotalNet ?? 0m;
            m.LastAytNet = lastAyt?.TotalNet ?? 0m;

            var aytExams = report.ExamSeries.Where(e => string.Equals(e.ExamType, NetCalculator.ExamTypeAyt, StringComparison.OrdinalIgnoreCase)).ToList();
            m.Grade11AytAvgNet = aytExams.Count > 0 ? Math.Round(aytExams.Average(e => e.TotalNet), 2) : m.LastAytNet;

            int aytStudyMins = report.SubjectMastery
                .Where(s => s.SubjectName.Contains("AYT", StringComparison.OrdinalIgnoreCase) ||
                            s.SubjectName.Contains("Fizik", StringComparison.OrdinalIgnoreCase) ||
                            s.SubjectName.Contains("Kimya", StringComparison.OrdinalIgnoreCase) ||
                            s.SubjectName.Contains("Biyoloji", StringComparison.OrdinalIgnoreCase) ||
                            s.SubjectName.Contains("Edebiyat", StringComparison.OrdinalIgnoreCase))
                .Sum(s => s.StudyMinutes);
            if (totalMinutesAll > 0)
            {
                m.AytStudySharePercent = (int)Math.Round(aytStudyMins * 100.0 / totalMinutesAll);
                m.TytStudySharePercent = 100 - m.AytStudySharePercent;
            }
            else
            {
                m.AytStudySharePercent = 65;
                m.TytStudySharePercent = 35;
            }

            m.CombinedYksEstimate = NetCalculator.ComputeYksCombinedEstimate(m.LastTytNet, m.LastAytNet, m.EstimatedObpContribution);
            decimal targetYks = report.TargetScore ?? 460m;
            if (effectiveGrade >= 12)
            {
                m.TargetScoreGap = m.CombinedYksEstimate > 0 ? Math.Max(0m, Math.Round(targetYks - m.CombinedYksEstimate, 1)) : targetYks;
            }

            m.ParetoFocusSubjects = report.SubjectMastery
                .OrderByDescending(s => s.NetGap ?? (100 - s.SuccessRate))
                .Take(3)
                .Select(s => s.SubjectName)
                .ToList();

            if (effectiveGrade <= 6)
            {
                report.Kpis.Add(new GradeKpiCardDto
                {
                    Id = "weekly-study",
                    Label = "Haftalık Masa Başı Süresi",
                    Value = m.WeeklyStudyMinutes.ToString(),
                    Unit = "dk",
                    Subtext = $"{m.StreakDays} günlük çalışma serisi",
                    StatusTone = m.WeeklyStudyMinutes >= 180 ? "success" : "warning"
                });
                report.Kpis.Add(new GradeKpiCardDto
                {
                    Id = "hw-rate",
                    Label = "Ödev Disiplin Oranı",
                    Value = $"%{hwRate}",
                    Unit = "",
                    Subtext = $"{totalHwCompleted}/{totalHwAssigned} ödev tamamlandı",
                    StatusTone = hwRate >= 80 ? "success" : "warning"
                });
                report.Kpis.Add(new GradeKpiCardDto
                {
                    Id = "school-avg",
                    Label = "Okul Yazılı Ortalaması",
                    Value = m.SchoolWrittenAverage > 0 ? m.SchoolWrittenAverage.ToString("0.#") : "-",
                    Unit = "/ 100",
                    Subtext = "1. ve 2. dönem yazılı sınavları",
                    StatusTone = m.SchoolWrittenAverage >= 85 ? "success" : "primary"
                });
                report.Kpis.Add(new GradeKpiCardDto
                {
                    Id = "resource-progress",
                    Label = "Kitap & Kaynak İlerlemesi",
                    Value = $"{m.CompletedResourceUnits}/{m.TotalResourceUnits}",
                    Unit = "Bölüm",
                    Subtext = $"Müfredat kapsamı: %{avgSyllabus}",
                    StatusTone = "primary"
                });
            }
            else if (effectiveGrade == 7)
            {
                report.Kpis.Add(new GradeKpiCardDto
                {
                    Id = "core-accuracy",
                    Label = "Ana Branş Doğruluk (Mat/Fen/Tr)",
                    Value = $"%{m.CoreBranchAccuracy:0.#}",
                    Unit = "",
                    Subtext = "3 Yanlış = 1 Doğru ortaokul standardı",
                    StatusTone = m.CoreBranchAccuracy >= 75 ? "success" : "warning"
                });
                report.Kpis.Add(new GradeKpiCardDto
                {
                    Id = "weekly-questions",
                    Label = "Haftalık Çözülen Soru",
                    Value = m.WeeklySolvedQuestions.ToString(),
                    Unit = "soru",
                    Subtext = $"Hız: {m.QuestionsPerMinute:0.##} soru/dk",
                    StatusTone = m.WeeklySolvedQuestions >= 250 ? "success" : "primary"
                });
                report.Kpis.Add(new GradeKpiCardDto
                {
                    Id = "syllabus-rate",
                    Label = "7. Sınıf Konu Tamamlama",
                    Value = $"%{avgSyllabus}",
                    Unit = "",
                    Subtext = $"Ödev uyumu: %{hwRate}",
                    StatusTone = avgSyllabus >= 60 ? "success" : "primary"
                });
                report.Kpis.Add(new GradeKpiCardDto
                {
                    Id = "school-avg",
                    Label = "Okul Yazılı Ortalaması",
                    Value = m.SchoolWrittenAverage > 0 ? m.SchoolWrittenAverage.ToString("0.#") : "-",
                    Unit = "/ 100",
                    Subtext = "Okul başarısı ve temel kazanım",
                    StatusTone = "primary"
                });
            }
            else if (effectiveGrade == 8)
            {
                var latestLgsNet = report.ExamSeries.FirstOrDefault(e => e.ExamType != NetCalculator.ExamTypeOkul)?.TotalNet ?? 0m;
                report.Kpis.Add(new GradeKpiCardDto
                {
                    Id = "lgs-score",
                    Label = "Tahmini LGS Puanı (Katsayılı)",
                    Value = m.EstimatedLgsScore > 0 ? m.EstimatedLgsScore.ToString("0.#") : "-",
                    Unit = "/ 500",
                    Subtext = "4x Türkçe/Mat/Fen · 1x İnk/Din/İng",
                    StatusTone = m.EstimatedLgsScore >= 420 ? "success" : "primary"
                });
                report.Kpis.Add(new GradeKpiCardDto
                {
                    Id = "lgs-net",
                    Label = "Son LGS Deneme Neti",
                    Value = latestLgsNet.ToString("0.##"),
                    Unit = "/ 90",
                    Subtext = $"4x Ana Branş: {m.CoreBranchNetSum:0.#} Net",
                    StatusTone = latestLgsNet >= 70 ? "success" : "warning"
                });
                report.Kpis.Add(new GradeKpiCardDto
                {
                    Id = "lgs-gap",
                    Label = "Hedef Puan Farkı (Gap)",
                    Value = m.TargetScoreGap <= 0 ? "Hedefe Ulaşıldı" : $"-{m.TargetScoreGap:0.#}",
                    Unit = m.TargetScoreGap <= 0 ? "✓" : "puan",
                    Subtext = report.TargetScore.HasValue ? $"Hedef: {report.TargetScore:0.#}" : "Genel hedef: 450",
                    StatusTone = m.TargetScoreGap <= 15 ? "success" : "warning"
                });
                report.Kpis.Add(new GradeKpiCardDto
                {
                    Id = "lgs-syllabus",
                    Label = "LGS Müfredat Kapsamı",
                    Value = $"%{avgSyllabus}",
                    Unit = "",
                    Subtext = $"Haftalık soru: {m.WeeklySolvedQuestions}",
                    StatusTone = avgSyllabus >= 70 ? "success" : "primary"
                });
            }
            else if (effectiveGrade == 9)
            {
                report.Kpis.Add(new GradeKpiCardDto
                {
                    Id = "obp-shield",
                    Label = "OBP Katkı Tahmini",
                    Value = m.EstimatedObpContribution > 0 ? $"+{m.EstimatedObpContribution:0.#}" : "-",
                    Unit = "/ 60 puan",
                    Subtext = m.SchoolWrittenAverage > 0 ? $"Yazılı Ort: {m.SchoolWrittenAverage:0.#}/100" : "Yazılı notu bekleniyor",
                    StatusTone = m.EstimatedObpContribution >= 50 ? "success" : "primary"
                });
                report.Kpis.Add(new GradeKpiCardDto
                {
                    Id = "grade9-tyt",
                    Label = "9. Sınıf TYT Temel Kapsamı",
                    Value = $"%{m.Grade9SyllabusCompletionRate}",
                    Unit = "",
                    Subtext = "TYT konularının %60'ı 9. sınıftır",
                    StatusTone = m.Grade9SyllabusCompletionRate >= 60 ? "success" : "warning"
                });
                report.Kpis.Add(new GradeKpiCardDto
                {
                    Id = "routine-adherence",
                    Label = "Haftalık Çalışma Uyum Oranı",
                    Value = $"%{m.WeeklyRoutineAdherence}",
                    Unit = "",
                    Subtext = $"{m.WeeklyStudyMinutes} dk / hafta",
                    StatusTone = m.WeeklyRoutineAdherence >= 75 ? "success" : "warning"
                });
                report.Kpis.Add(new GradeKpiCardDto
                {
                    Id = "hw-rate",
                    Label = "Ödev Tamamlama",
                    Value = $"%{hwRate}",
                    Unit = "",
                    Subtext = $"{totalHwCompleted}/{totalHwAssigned} görev",
                    StatusTone = hwRate >= 80 ? "success" : "warning"
                });
            }
            else if (effectiveGrade == 10)
            {
                report.Kpis.Add(new GradeKpiCardDto
                {
                    Id = "recommended-track",
                    Label = "Önerilen Alan Eğilimi",
                    Value = m.RecommendedTrack,
                    Unit = "Alanı",
                    Subtext = $"SAY:{m.AptitudeSayScore:0} · EA:{m.AptitudeEaScore:0} · SÖZ:{m.AptitudeSozScore:0}",
                    StatusTone = "primary"
                });
                report.Kpis.Add(new GradeKpiCardDto
                {
                    Id = "cum-tyt",
                    Label = "9+10 Kümülatif TYT Kapsamı",
                    Value = $"%{m.CumulativeTytSyllabusRate}",
                    Unit = "",
                    Subtext = "11. sınıfa geçmeden TYT temeli",
                    StatusTone = m.CumulativeTytSyllabusRate >= 65 ? "success" : "warning"
                });
                report.Kpis.Add(new GradeKpiCardDto
                {
                    Id = "obp-shield",
                    Label = "Okul Yazılı & OBP Kalkanı",
                    Value = m.EstimatedObpContribution > 0 ? $"+{m.EstimatedObpContribution:0.#}" : "-",
                    Unit = "/ 60 puan",
                    Subtext = m.SchoolWrittenAverage > 0 ? $"Yazılı Ort: {m.SchoolWrittenAverage:0.#}" : "Yazılı notu girilmedi",
                    StatusTone = "success"
                });
                report.Kpis.Add(new GradeKpiCardDto
                {
                    Id = "last-tyt",
                    Label = "Son TYT Deneme Neti",
                    Value = m.LastTytNet > 0 ? m.LastTytNet.ToString("0.##") : "-",
                    Unit = "/ 120",
                    Subtext = $"Haftalık {m.WeeklySolvedQuestions} soru",
                    StatusTone = "primary"
                });
            }
            else if (effectiveGrade == 11)
            {
                int diffFromIdeal = Math.Abs(m.AytStudySharePercent - m.RecommendedAytSharePercent);
                report.Kpis.Add(new GradeKpiCardDto
                {
                    Id = "dual-track-balance",
                    Label = "AYT / TYT Çalışma Dengesi",
                    Value = $"%{m.AytStudySharePercent} / %{m.TytStudySharePercent}",
                    Unit = "AYT/TYT",
                    Subtext = $"İdeal 11. Sınıf Dengesi: %{m.RecommendedAytSharePercent} AYT / %35 TYT",
                    StatusTone = diffFromIdeal <= 15 ? "success" : "warning"
                });
                report.Kpis.Add(new GradeKpiCardDto
                {
                    Id = "grade11-ayt",
                    Label = "11. Sınıf Alan (AYT) Net Ort.",
                    Value = m.Grade11AytAvgNet > 0 ? m.Grade11AytAvgNet.ToString("0.##") : "-",
                    Unit = "Net",
                    Subtext = $"11. Sınıf Müfredat: %{avgSyllabus}",
                    StatusTone = "primary"
                });
                report.Kpis.Add(new GradeKpiCardDto
                {
                    Id = "last-tyt",
                    Label = "Son TYT Deneme Neti",
                    Value = m.LastTytNet > 0 ? m.LastTytNet.ToString("0.##") : "-",
                    Unit = "/ 120",
                    Subtext = "TYT hız ve rutin koruma",
                    StatusTone = m.LastTytNet >= 70 ? "success" : "primary"
                });
                report.Kpis.Add(new GradeKpiCardDto
                {
                    Id = "obp-shield",
                    Label = "OBP Katkı Tahmini",
                    Value = m.EstimatedObpContribution > 0 ? $"+{m.EstimatedObpContribution:0.#}" : "-",
                    Unit = "/ 60",
                    Subtext = $"Ödev uyumu: %{hwRate}",
                    StatusTone = "success"
                });
            }
            else
            {
                report.Kpis.Add(new GradeKpiCardDto
                {
                    Id = "yks-combined",
                    Label = "Tahmini YKS Yerleştirme Puanı",
                    Value = m.CombinedYksEstimate > 0 ? m.CombinedYksEstimate.ToString("0.#") : "-",
                    Unit = "/ 560",
                    Subtext = m.TargetScoreGap <= 0
                        ? "Hedef puana ulaşıldı ✓"
                        : $"Hedef farkı: -{m.TargetScoreGap:0.#} puan",
                    StatusTone = m.TargetScoreGap <= 15 && m.CombinedYksEstimate > 0 ? "success" : "primary"
                });
                report.Kpis.Add(new GradeKpiCardDto
                {
                    Id = "last-tyt",
                    Label = "Son TYT Neti",
                    Value = m.LastTytNet > 0 ? m.LastTytNet.ToString("0.##") : "-",
                    Unit = "/ 120",
                    Subtext = "%40 YKS ağırlığı",
                    StatusTone = m.LastTytNet >= 80 ? "success" : "primary"
                });
                report.Kpis.Add(new GradeKpiCardDto
                {
                    Id = "last-ayt",
                    Label = "Son AYT Neti",
                    Value = m.LastAytNet > 0 ? m.LastAytNet.ToString("0.##") : "-",
                    Unit = "/ 80",
                    Subtext = "%60 YKS ağırlığı",
                    StatusTone = m.LastAytNet >= 50 ? "success" : "warning"
                });
                report.Kpis.Add(new GradeKpiCardDto
                {
                    Id = "yks-syllabus",
                    Label = "YKS Konu & Ödev Tamamlama",
                    Value = $"%{avgSyllabus}",
                    Unit = "Konu",
                    Subtext = $"Ödev tamamlama: %{hwRate}",
                    StatusTone = avgSyllabus >= 75 ? "success" : "primary"
                });
            }

            // Kural tabanlı akıllı koçluk teşhisleri (Rule-Based Insights)
            if (totalHwOverdue > 0)
            {
                report.Insights.Add(new CoachingInsightDto
                {
                    Severity = "warning",
                    Title = $"{totalHwOverdue} Adet Gecikmiş Ödev Bulunuyor",
                    Message = "Yeni konu yüklemesi yapmadan önce geciken görevlerin tamamlanması konu birikmesini önler."
                });
            }

            if (effectiveGrade <= 7 && m.StreakDays < 3)
            {
                report.Insights.Add(new CoachingInsightDto
                {
                    Severity = "info",
                    Title = "Günlük Çalışma Zinciri (Streak) Güçlendirilmeli",
                    Message = $"{effectiveGrade}. sınıfta uzun saatler yerine her gün en az 30-45 dakikalık kesintisiz masa başı alışkanlığı hedeflenmelidir."
                });
            }
            else if (effectiveGrade == 8 && m.CoreBranchNetSum < m.MinorBranchNetSum * 1.5m && report.ExamSeries.Count > 0)
            {
                report.Insights.Add(new CoachingInsightDto
                {
                    Severity = "warning",
                    Title = "LGS 4x Katsayılı Ana Branş Odağı",
                    Message = "LGS'de Türkçe, Matematik ve Fen derslerindeki 1 net, ara branşlardaki 4 nete eşdeğer puan getirir. Haftalık soru bütçesinin %75'ini bu 3 derse ayırın."
                });
            }
            else if (effectiveGrade == 10)
            {
                report.Insights.Add(new CoachingInsightDto
                {
                    Severity = "info",
                    Title = $"10. Sınıf Alan Seçimi Karar Matrisi: {m.RecommendedTrack} Eğilimi Önde",
                    Message = $"Mevcut sınav doğruluğu ve konu ilerlemesine göre {m.RecommendedTrack} alanı öne çıkıyor (SAY:{m.AptitudeSayScore:0} / EA:{m.AptitudeEaScore:0} / SÖZ:{m.AptitudeSozScore:0})."
                });
            }
            else if (effectiveGrade == 11 && m.AytStudySharePercent < 50)
            {
                report.Insights.Add(new CoachingInsightDto
                {
                    Severity = "warning",
                    Title = "11. Sınıf AYT Konu Ağırlığı Artırılmalı",
                    Message = $"11. sınıf çalışma dağılımında AYT oranı şu an %{m.AytStudySharePercent}. 12. sınıfa konu borcu bırakmamak için sürenin en az %60-65'i 11. sınıf alan derslerine ayrılmalıdır."
                });
            }
            else if (effectiveGrade >= 12 && m.ParetoFocusSubjects.Count > 0)
            {
                report.Insights.Add(new CoachingInsightDto
                {
                    Severity = "info",
                    Title = "Pareto 80/20 En Hızlı Net Artış Alanları",
                    Message = $"Hedef farkını en hızlı kapatacak dersler: {string.Join(", ", m.ParetoFocusSubjects)}. Bu derslerdeki hedef-gerçek net farkına odaklanın."
                });
            }

            if (report.Insights.Count == 0)
            {
                report.Insights.Add(new CoachingInsightDto
                {
                    Severity = "success",
                    Title = "Plan ve Disiplin Dengesi Yolunda",
                    Message = "Bu sınıf dönemindeki ödev, konu tamamlama ve çalışma göstergeleri dengeli ilerliyor."
                });
            }
        }
    }
}
