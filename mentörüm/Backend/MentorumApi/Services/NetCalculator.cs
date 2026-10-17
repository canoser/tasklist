using System;

namespace MentorumApi.Services
{
    public static class NetCalculator
    {
        public static decimal ComputeNet(int correct, int wrong, int blank, string? track)
        {
            decimal divisor = string.Equals(track, "ORTAOKUL", StringComparison.OrdinalIgnoreCase) ? 3.0m : 4.0m;
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
