using System.Collections.Generic;
using System.Threading.Tasks;

namespace PlanlamaApp.Application.Interfaces
{
    public interface ITrendAnalysisService
    {
        object AnalyzeNetTrend(List<decimal> nets);
        bool DetectConsecutiveDrops(List<decimal> nets, int threshold);
        decimal CalculateProjectedScore(List<decimal> nets, decimal targetScore);
    }
}
