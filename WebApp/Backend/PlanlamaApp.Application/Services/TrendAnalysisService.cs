using System.Collections.Generic;
using System.Linq;
using PlanlamaApp.Application.Interfaces;

namespace PlanlamaApp.Application.Services
{
    public class TrendAnalysisService : ITrendAnalysisService
    {
        public object AnalyzeNetTrend(List<decimal> nets)
        {
            if (nets == null || nets.Count < 2)
                return new { Trend = "Stable", Message = "Yeterli veri yok" };

            var first = nets.First();
            var last = nets.Last();
            var diff = last - first;

            if (diff > 5) return new { Trend = "Rising", Message = "Netler yükselişte!" };
            if (diff < -5) return new { Trend = "Falling", Message = "Netler düşüşte, dikkat!" };
            
            return new { Trend = "Stable", Message = "Netler durağan." };
        }

        public bool DetectConsecutiveDrops(List<decimal> nets, int threshold)
        {
            if (nets == null || nets.Count < threshold) return false;
            
            int dropCount = 0;
            for (int i = 1; i < nets.Count; i++)
            {
                if (nets[i] < nets[i - 1]) dropCount++;
                else dropCount = 0; // reset

                if (dropCount >= threshold) return true;
            }
            return false;
        }

        public decimal CalculateProjectedScore(List<decimal> nets, decimal targetScore)
        {
            if (nets == null || !nets.Any()) return 0;
            return nets.Average(); // Dummy projection
        }
    }
}
