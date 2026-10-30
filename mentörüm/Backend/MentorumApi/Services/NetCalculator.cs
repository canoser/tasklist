using System;

namespace MentorumApi.Services
{
    public static class NetCalculator
    {
        public const string ExamTypeOkul = "Okul";
        public const string ExamTypeDiger = "Diğer";
        public const string ExamTypeLgs = "LGS";
        public const string TrackOrtaokul = "ORTAOKUL";

        public const decimal DivisorSchoolOrOther = 0m;
        public const decimal DivisorMiddleSchool = 3.0m;
        public const decimal DivisorHighSchool = 4.0m;

        public static decimal ResolveDivisor(string? examType, string? studentTrack)
        {
            if (string.Equals(examType, ExamTypeOkul, StringComparison.OrdinalIgnoreCase) ||
                string.Equals(examType, ExamTypeDiger, StringComparison.OrdinalIgnoreCase))
                return DivisorSchoolOrOther;

            if (string.Equals(examType, ExamTypeLgs, StringComparison.OrdinalIgnoreCase) ||
                string.Equals(studentTrack, TrackOrtaokul, StringComparison.OrdinalIgnoreCase))
                return DivisorMiddleSchool;

            return DivisorHighSchool; // TYT, AYT, Deneme ve Lise (SAY, EA, SOZ)
        }

        public static decimal ComputeNet(int correct, int wrong, int blank, string? track, string? examType = null)
        {
            decimal divisor = ResolveDivisor(examType, track);
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
    }
}
