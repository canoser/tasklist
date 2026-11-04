using System.Text.Json.Serialization;

namespace MentorumApi.DTOs
{
    public class ReportsOverviewDto
    {
        public int TotalStudents { get; set; }
        public int CompletedToday { get; set; }
        public int TotalOverdue { get; set; }
        public int AssignedThisWeek { get; set; }
        public double SuccessRate { get; set; }
    }

    public class ReportsDetailDto
    {
        public List<SubjectBreakdownItemDto> SubjectBreakdown { get; set; } = new();
        public List<RecentHomeworkItemDto> RecentHomework { get; set; } = new();
        public List<OverdueHomeworkItemDto> OverdueHomework { get; set; } = new();
        public List<WeeklyTrendItemDto> WeeklyTrend { get; set; } = new();
    }

    public class SubjectBreakdownItemDto
    {
        public string SubjectName { get; set; } = "";
        public int Completed { get; set; }
        public int Total { get; set; }
        public int SuccessRate { get; set; }
    }

    public class RecentHomeworkItemDto
    {
        public string StudentName { get; set; } = "";
        public string Title { get; set; } = "";
        public DateTime? CompletedAt { get; set; }
        public string Status { get; set; } = "";
    }

    public class OverdueHomeworkItemDto
    {
        public string StudentName { get; set; } = "";
        public string Title { get; set; } = "";
        public DateTime DueDate { get; set; }
    }

    public class WeeklyTrendItemDto
    {
        public DateTime WeekStart { get; set; }
        public int Completed { get; set; }
    }

    public class StudentReportDto
    {
        public int TotalCompleted { get; set; }
        public int TotalOverdue { get; set; }
        public int TotalAssigned { get; set; }
        public double SuccessRate { get; set; }
    }

    public class StudentSubjectStatDto
    {
        public Guid? SubjectId { get; set; }
        public string? SubjectName { get; set; }
        public Guid? CurriculumTopicId { get; set; }
        public string? TopicName { get; set; }
        public int TotalMinutes { get; set; }
        public int TotalQuestions { get; set; }
        public int TotalCorrect { get; set; }
        public int TotalWrong { get; set; }
        public int TotalBlank { get; set; }
        public decimal TotalNet { get; set; }
        public decimal SuccessRate { get; set; }
    }

    public class WeeklyTimeBudgetItemDto
    {
        public string Category { get; set; } = "";
        public int TotalMinutes { get; set; }
        public double Percentage { get; set; }
    }

    public class WeeklyTimeBudgetDto
    {
        public int TotalStudyMinutes { get; set; }
        public int TotalPersonalMinutes { get; set; }
        public int TotalTrackedMinutes { get; set; }
        public List<WeeklyTimeBudgetItemDto> Categories { get; set; } = new();
    }

    // =========================================================================
    // [V21] 6–12. Sınıflar İçin Ayrı Koçluk Raporlama Sistemleri & Sınıf Arşivi
    // =========================================================================

    public class StudentGradeReportDto
    {
        public Guid StudentId { get; set; }
        public string StudentName { get; set; } = "";
        public int CurrentGrade { get; set; }
        public int SelectedGrade { get; set; }
        public List<int> AvailableGrades { get; set; } = new();
        public string? Track { get; set; }
        public string? TargetUniversity { get; set; }
        public string? TargetDepartment { get; set; }
        public decimal? TargetScore { get; set; }
        public bool CanEditTargets { get; set; }

        public GradeProfileMetaDto Profile { get; set; } = new();
        public List<GradeKpiCardDto> Kpis { get; set; } = new();
        public List<CoachingInsightDto> Insights { get; set; } = new();
        public WellbeingSummaryDto Wellbeing { get; set; } = new();
        public List<ExamProgressionPointDto> ExamSeries { get; set; } = new();
        public List<SubjectMasteryItemDto> SubjectMastery { get; set; } = new();
        public List<ErrorReasonStatDto> ErrorReasons { get; set; } = new();
        public GradeSpecificModuleDto GradeModule { get; set; } = new();
    }

    public class GradeProfileMetaDto
    {
        public string SystemCode { get; set; } = "";
        public string SystemTitle { get; set; } = "";
        public string Subtitle { get; set; } = "";
        public string PrimaryFocusBadge { get; set; } = "";
        public string WrongPenaltyRule { get; set; } = "";
        public string PenaltyMode { get; set; } = "OFFICIAL";
    }

    public class GradeKpiCardDto
    {
        public string Id { get; set; } = "";
        public string Label { get; set; } = "";
        public string Value { get; set; } = "";
        public string Unit { get; set; } = "";
        public string Subtext { get; set; } = "";
        public string StatusTone { get; set; } = "primary"; // primary | success | warning | danger
    }

    public class CoachingInsightDto
    {
        public string Severity { get; set; } = "info"; // info | success | warning | danger
        public string Title { get; set; } = "";
        public string Message { get; set; } = "";
    }

    public class WellbeingSummaryDto
    {
        public int RecentCheckinCount { get; set; }
        public string DominantMood { get; set; } = "BELİRTİLMEDİ";
        public int PositiveMoodRate { get; set; }
        public int CompletedGrowSessionsCount { get; set; }
        public DateTime? LastGrowSessionDate { get; set; }
        public string? LastGrowGoalSummary { get; set; }
    }

    public class ExamProgressionPointDto
    {
        public Guid ExamId { get; set; }
        public string ExamName { get; set; } = "";
        public string ExamType { get; set; } = "";
        public DateTime ExamDate { get; set; }
        public int? Grade { get; set; }
        public decimal TotalNet { get; set; }
        public decimal? SchoolScoreAverage { get; set; }
        public decimal? LgsWeightedScore { get; set; }
    }

    public class SubjectMasteryItemDto
    {
        public Guid SubjectId { get; set; }
        public string SubjectName { get; set; } = "";
        public int CompletedTopics { get; set; }
        public int TotalTopics { get; set; }
        public int TopicCompletionPercent { get; set; }
        public int StudyMinutes { get; set; }
        public int SolvedQuestions { get; set; }
        public decimal SuccessRate { get; set; }
        public decimal AvgExamNet { get; set; }
        public decimal LastExamNet { get; set; }
        public decimal? SchoolWrittenAvg { get; set; }
        public decimal? TargetNet { get; set; }
        public decimal? TargetScore { get; set; }
        public decimal? NetGap { get; set; }
    }

    public class ErrorReasonStatDto
    {
        public string Reason { get; set; } = "";
        public int Count { get; set; }
        public int Percentage { get; set; }
    }

    public class GradeSpecificModuleDto
    {
        // 6. & 7. Sınıf: Alışkanlık, Okul Yazılısı, Hız ve Kaynak İlerlemesi
        public int StreakDays { get; set; }
        public int WeeklyStudyMinutes { get; set; }
        public int OnTimeHomeworkRate { get; set; }
        public decimal SchoolWrittenAverage { get; set; }
        public int CompletedResourceUnits { get; set; }
        public int TotalResourceUnits { get; set; }
        public decimal CoreBranchAccuracy { get; set; }
        public decimal QuestionsPerMinute { get; set; }
        public int WeeklySolvedQuestions { get; set; }

        // 8. Sınıf: LGS Katsayılı Puan & 4x/1x Branş Analizi
        public decimal EstimatedLgsScore { get; set; }
        public decimal CoreBranchNetSum { get; set; }
        public decimal MinorBranchNetSum { get; set; }
        public decimal TargetScoreGap { get; set; }

        // 9. Sınıf: OBP Kalkanı & 9. Sınıf Temeli
        public decimal EstimatedObpContribution { get; set; }
        public int Grade9SyllabusCompletionRate { get; set; }
        public int WeeklyRoutineAdherence { get; set; }

        // 10. Sınıf: Alan Seçimi Karar Matrisi (SAY / EA / SOZ)
        public decimal AptitudeSayScore { get; set; }
        public decimal AptitudeEaScore { get; set; }
        public decimal AptitudeSozScore { get; set; }
        public string RecommendedTrack { get; set; } = "SAY";
        public int CumulativeTytSyllabusRate { get; set; }

        // 11. Sınıf: Çift Kulvar (11. Sınıf AYT vs TYT Temel) Denge Sistemi
        public int AytStudySharePercent { get; set; }
        public int TytStudySharePercent { get; set; }
        public int RecommendedAytSharePercent { get; set; } = 65;
        public decimal Grade11AytAvgNet { get; set; }
        public decimal LastTytNet { get; set; }

        // 12. Sınıf & Mezun (13): YKS Zirve, TYT+AYT Gap & Pareto Odak
        public decimal LastAytNet { get; set; }
        public decimal CombinedYksEstimate { get; set; }
        public List<string> ParetoFocusSubjects { get; set; } = new();
    }

    [JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
    public class UpsertSubjectTargetsRequest
    {
        public int Grade { get; set; }
        public List<SubjectTargetInputDto> Targets { get; set; } = new();
    }

    [JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
    public class SubjectTargetInputDto
    {
        public Guid SubjectId { get; set; }
        public decimal TargetNet { get; set; }
        public decimal? TargetScore { get; set; }
    }

    public class GradeCohortSummaryDto
    {
        public int Grade { get; set; }
        public string GradeLabel { get; set; } = "";
        public string SystemTitle { get; set; } = "";
        public int StudentCount { get; set; }
        public int AvgHomeworkCompletionRate { get; set; }
        public decimal AvgLatestExamNet { get; set; }
        public int AvgWeeklyStudyMinutes { get; set; }
        public int AtRiskStudentCount { get; set; }
        public List<GradeCohortStudentItemDto> Students { get; set; } = new();
    }

    public class GradeCohortStudentItemDto
    {
        public Guid StudentId { get; set; }
        public string StudentName { get; set; } = "";
        public int Grade { get; set; }
        public string? Track { get; set; }
        public int HomeworkCompletionRate { get; set; }
        public decimal LatestExamNet { get; set; }
        public int WeeklyStudyMinutes { get; set; }
        public int OverdueHomeworkCount { get; set; }
        public bool IsAtRisk { get; set; }
    }
}
