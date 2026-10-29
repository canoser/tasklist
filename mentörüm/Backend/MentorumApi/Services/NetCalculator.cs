using System;

namespace MentorumApi.Services
{
    public static class NetCalculator
    {
        public static decimal ResolveDivisor(string? examType, string? studentTrack)
        {
            if (string.Equals(examType, "Okul", StringComparison.OrdinalIgnoreCase) ||
                string.Equals(examType, "Diğer", StringComparison.OrdinalIgnoreCase))
                return 0m;

            if (string.Equals(examType, "LGS", StringComparison.OrdinalIgnoreCase) ||
                string.Equals(studentTrack, "ORTAOKUL", StringComparison.OrdinalIgnoreCase))
                return 3.0m;

            return 4.0m; // TYT, AYT, Deneme ve Lise (SAY, EA, SOZ)
        }

        public static decimal ComputeNet(int correct, int wrong, int blank, string? track, string? examType = null)
        {
            decimal divisor = ResolveDivisor(examType, track);
            if (divisor <= 0m)
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
