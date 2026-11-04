using System;
using System.Collections.Generic;
using System.Linq;

namespace MentorumApi.Services
{
    public static class NetCalculator
    {
        public const string ExamTypeOkul = "Okul";
        public const string ExamTypeDiger = "Diğer";
        public const string ExamTypeLgs = "LGS";
        public const string ExamTypeTyt = "TYT";
        public const string ExamTypeAyt = "AYT";
        public const string TrackOrtaokul = "ORTAOKUL";
        public const string TrackLgs = "LGS";
        public const string PenaltyModeOfficial = "OFFICIAL";
        public const string PenaltyModeNoPenalty = "NO_PENALTY";

        public const decimal DivisorSchoolOrOther = 0m;
        public const decimal DivisorMiddleSchool = 3.0m;
        public const decimal DivisorHighSchool = 4.0m;

        public static decimal ResolveDivisor(
            string? examType,
            string? studentTrack,
            int? grade = null,
            string? penaltyMode = PenaltyModeOfficial)
        {
            if (string.Equals(penaltyMode, PenaltyModeNoPenalty, StringComparison.OrdinalIgnoreCase) ||
                string.Equals(examType, ExamTypeOkul, StringComparison.OrdinalIgnoreCase) ||
                string.Equals(examType, ExamTypeDiger, StringComparison.OrdinalIgnoreCase))
            {
                return DivisorSchoolOrOther;
            }

            if (string.Equals(examType, ExamTypeLgs, StringComparison.OrdinalIgnoreCase) ||
                string.Equals(studentTrack, TrackOrtaokul, StringComparison.OrdinalIgnoreCase) ||
                string.Equals(studentTrack, TrackLgs, StringComparison.OrdinalIgnoreCase) ||
                (grade.HasValue && grade.Value >= 4 && grade.Value <= 8))
            {
                return DivisorMiddleSchool;
            }

            return DivisorHighSchool; // 9..13 (Lise & Mezun), TYT, AYT, SAY, EA, SOZ, DIL
        }

        public static decimal ComputeNet(
            int correct,
            int wrong,
            int blank,
            string? track,
            string? examType = null,
            int? grade = null,
            string? penaltyMode = PenaltyModeOfficial)
        {
            decimal divisor = ResolveDivisor(examType, track, grade, penaltyMode);
            if (divisor <= DivisorSchoolOrOther)
                return correct;

            decimal rawNet = correct - (wrong / divisor);
            return Math.Round(rawNet, 2, MidpointRounding.AwayFromZero);
        }

        public static decimal ComputeSuccessRate(int correct, int questionCount)
        {
            if (questionCount <= 0) return 0m;
            return Math.Round((decimal)correct / questionCount * 100m, 2, MidpointRounding.AwayFromZero);
        }

        /// <summary>
        /// 8. Sınıf LGS Katsayılı Puan Tahmini (100..500 Ölçeği).
        /// MEB Katsayıları: Türkçe (4x, 20 soru), Matematik (4x, 20 soru), Fen Bilimleri (4x, 20 soru),
        /// T.C. İnkılap (1x, 10 soru), Din Kültürü (1x, 10 soru), Yabancı Dil / İngilizce (1x, 10 soru).
        /// Maksimum ağırlıklı net = (20*4)*3 + (10*1)*3 = 270.
        /// </summary>
        public static decimal ComputeLgsWeightedScore(
            decimal totalNet,
            IEnumerable<(string? SubjectName, decimal Net)>? subjectNets = null)
        {
            var list = subjectNets?.Where(x => !string.IsNullOrWhiteSpace(x.SubjectName)).ToList();
            if (list != null && list.Count > 0)
            {
                decimal weightedSum = 0m;
                foreach (var item in list)
                {
                    int weight = IsLgsCoreSubject(item.SubjectName!) ? 4 : 1;
                    weightedSum += Math.Max(0m, item.Net) * weight;
                }
                decimal clampedWeighted = Math.Clamp(weightedSum, 0m, 270m);
                return Math.Round(100m + (clampedWeighted / 270m) * 400m, 2, MidpointRounding.AwayFromZero);
            }

            decimal clampedTotal = Math.Clamp(totalNet, 0m, 90m);
            return Math.Round(100m + (clampedTotal / 90m) * 400m, 2, MidpointRounding.AwayFromZero);
        }

        public static bool IsLgsCoreSubject(string subjectName)
        {
            var upper = subjectName.Trim().ToUpperInvariant();
            return upper.Contains("MATEMAT") ||
                   upper.Contains("FEN") ||
                   upper.Contains("TÜRKÇE") ||
                   upper.Contains("TURKCE");
        }

        /// <summary>
        /// 9–12. Sınıf OBP (Ortaöğretim Başarı Puanı) YKS Yerleştirme Katkısı (0..60 Ölçeği).
        /// Resmî ÖSYM formülü: DiplomaNotu * 5 * 0.12 = DiplomaNotu * 0.6.
        /// </summary>
        public static decimal ComputeObpContribution(decimal schoolWrittenAverage)
        {
            if (schoolWrittenAverage <= 0m) return 0m;
            decimal clamped = Math.Clamp(schoolWrittenAverage, 50m, 100m);
            return Math.Round(clamped * 0.6m, 2, MidpointRounding.AwayFromZero);
        }

        /// <summary>
        /// 10. Sınıf Alan Seçimi Eğilim Skorları (SAY, EA, SOZ — 0..100 Ölçeği).
        /// </summary>
        public static (decimal SayScore, decimal EaScore, decimal SozScore, string RecommendedTrack) ComputeTrackAptitudeScores(
            decimal mathScore,
            decimal scienceScore,
            decimal turkishLitScore,
            decimal socialScore)
        {
            decimal m = Math.Clamp(mathScore, 0m, 100m);
            decimal f = Math.Clamp(scienceScore, 0m, 100m);
            decimal t = Math.Clamp(turkishLitScore, 0m, 100m);
            decimal s = Math.Clamp(socialScore, 0m, 100m);

            decimal say = Math.Round(0.50m * m + 0.50m * f, 1, MidpointRounding.AwayFromZero);
            decimal ea = Math.Round(0.50m * m + 0.35m * t + 0.15m * s, 1, MidpointRounding.AwayFromZero);
            decimal soz = Math.Round(0.50m * t + 0.50m * s, 1, MidpointRounding.AwayFromZero);

            string recommended = "SAY";
            decimal max = say;
            if (ea > max)
            {
                max = ea;
                recommended = "EA";
            }
            if (soz > max)
            {
                recommended = "SOZ";
            }

            return (say, ea, soz, recommended);
        }

        /// <summary>
        /// 12. Sınıf & Mezun YKS Birleşik Yerleştirme Puan Tahmini (100..560 Ölçeği).
        /// %40 TYT (max 160 puan) + %60 AYT (max 240 puan) + 100 Taban Puan + OBP Katkısı (max 60 puan, yazılı yoksa 48).
        /// </summary>
        public static decimal ComputeYksCombinedEstimate(
            decimal lastTytNet,
            decimal lastAytNet,
            decimal estimatedObpContribution = 0m)
        {
            if (lastTytNet <= 0m && lastAytNet <= 0m) return 0m;
            decimal tytPart = (Math.Clamp(lastTytNet, 0m, 120m) / 120m) * 160m;
            decimal aytPart = (Math.Clamp(lastAytNet, 0m, 80m) / 80m) * 240m;
            decimal obpPart = estimatedObpContribution > 0m ? Math.Clamp(estimatedObpContribution, 30m, 60m) : 48m;
            return Math.Round(100m + tytPart + aytPart + obpPart, 2, MidpointRounding.AwayFromZero);
        }
    }
}
