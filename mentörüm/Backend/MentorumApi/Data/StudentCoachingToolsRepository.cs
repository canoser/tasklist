using Dapper;
using MentorumApi.DTOs;

namespace MentorumApi.Data
{
    public class StudentCoachingToolsRepository : BaseRepository
    {
        public StudentCoachingToolsRepository(DbConnectionFactory connectionFactory) : base(connectionFactory) { }

        public async Task<IEnumerable<CoachingSessionDto>> GetCoachingSessionsAsync(Guid studentId)
        {
            using var conn = _connectionFactory.CreateConnection();
            return await conn.QueryAsync<CoachingSessionDto>(@"
                SELECT id AS Id, coach_id AS CoachId, student_id AS StudentId, session_date AS SessionDate, title AS Title, notes AS Notes, action_items AS ActionItems, prep_notes AS PrepNotes, grow_data::text AS GrowData, created_at AS CreatedAt
                FROM coaching_sessions
                WHERE student_id = @StudentId
                ORDER BY session_date DESC NULLS LAST",
                new { StudentId = studentId });
        }

        public Task<IEnumerable<CoachingSessionDto>> GetStudentSessionsAsync(Guid studentId) =>
            GetCoachingSessionsAsync(studentId);

        public async Task<bool> UpdateSessionPrepAsync(Guid studentId, Guid sessionId, string prepNotes)
        {
            using var conn = _connectionFactory.CreateConnection();
            var rows = await conn.ExecuteAsync(@"
                UPDATE coaching_sessions SET prep_notes = @PrepNotes WHERE id = @SessionId AND student_id = @StudentId",
                new { PrepNotes = prepNotes, SessionId = sessionId, StudentId = studentId });
            return rows > 0;
        }

        public async Task<Guid> CreateCoachingSessionAsync(Guid coachId, Guid studentId, CreateCoachingSessionRequest req)
        {
            var id = Guid.NewGuid();
            using var conn = _connectionFactory.CreateConnection();
            await conn.ExecuteAsync(@"
                INSERT INTO coaching_sessions (id, coach_id, student_id, session_date, title, notes, action_items, grow_data)
                VALUES (@Id, @CoachId, @StudentId, @SessionDate, @Title, @Notes, @ActionItems, CAST(@GrowData AS jsonb))",
                new { Id = id, CoachId = coachId, StudentId = studentId, req.SessionDate, Title = req.Title ?? "Koçluk Görüşmesi", req.Notes, req.ActionItems, req.GrowData });
            return id;
        }

        public async Task<CoachStudentToolsResponseDto> GetCoachStudentToolsAsync(Guid studentId)
        {
            using var conn = _connectionFactory.CreateConnection();
            var tools = await conn.QuerySingleOrDefaultAsync<(string? SwotData, string? WheelData, string? HabitsData, DateTime? UpdatedAt)>(@"
                SELECT swot_data::text AS SwotData, wheel_data::text AS WheelData, habits_data::text AS HabitsData, updated_at AS UpdatedAt
                FROM student_coaching_tools
                WHERE student_id = @StudentId",
                new { StudentId = studentId });

            var autoSwot = new AutoSwotSummaryDto();
            var recentExams = (await conn.QueryAsync<(string? ExamName, float? TotalNet, string? ErrorReasons)>(@"
                SELECT exam_name, total_net, error_reasons 
                FROM exam_results 
                WHERE student_id = @StudentId 
                ORDER BY exam_date DESC LIMIT 5",
                new { StudentId = studentId })).ToList();

            var highScores = recentExams.Where(e => (e.TotalNet ?? 0) >= 70).ToList();
            if (highScores.Count > 0)
                autoSwot.Strengths.Add($"Son denemelerde {highScores.Count} sınavda 70+ net başarısı.");

            var errorTexts = recentExams.Where(e => !string.IsNullOrWhiteSpace(e.ErrorReasons)).Select(e => e.ErrorReasons!).ToList();
            if (errorTexts.Any(t => t.Contains("DİKKATSİZLİK", StringComparison.OrdinalIgnoreCase) || t.Contains("DIKKATSIZLIK", StringComparison.OrdinalIgnoreCase)))
                autoSwot.Weaknesses.Add("Sınav analizlerinde dikkat hataları yoğunlukta.");
            if (errorTexts.Any(t => t.Contains("BİLGİ_EKSİĞİ", StringComparison.OrdinalIgnoreCase) || t.Contains("BILGI", StringComparison.OrdinalIgnoreCase)))
                autoSwot.Weaknesses.Add("Konu eksiklerinden kaynaklanan yanlışlar tespit edildi.");
            if (errorTexts.Any(t => t.Contains("SÜRE", StringComparison.OrdinalIgnoreCase) || t.Contains("SURE", StringComparison.OrdinalIgnoreCase)))
                autoSwot.Threats.Add("Zaman yönetimi ve süre yetiştirme riski.");

            var overdueCount = await conn.ExecuteScalarAsync<int>(@"
                SELECT COUNT(1) FROM homework_assignments 
                WHERE student_id = @StudentId AND status = 'PENDING' AND due_date < CURRENT_DATE",
                new { StudentId = studentId });
            if (overdueCount > 0)
                autoSwot.Threats.Add($"{overdueCount} adet gecikmiş ödev birikmiş durumda.");

            var openQuestions = await conn.ExecuteScalarAsync<int>(@"
                SELECT COUNT(1) FROM student_questions WHERE student_id = @StudentId AND status = 'OPEN'",
                new { StudentId = studentId });
            if (openQuestions > 0)
                autoSwot.Opportunities.Add($"{openQuestions} adet çözüm bekleyen soru ile eksik kapatma fırsatı.");
            else
                autoSwot.Strengths.Add("Tüm çözülemeyen sorular yanıtlanmış veya temiz.");

            return new CoachStudentToolsResponseDto
            {
                StudentId = studentId,
                SwotData = tools.SwotData ?? "{}",
                WheelData = tools.WheelData ?? "{}",
                HabitsData = tools.HabitsData ?? "[]",
                AutoSwot = autoSwot,
                UpdatedAt = tools.UpdatedAt
            };
        }

        public async Task UpsertCoachingToolsAsync(Guid studentId, Guid coachId, UpdateCoachingToolsRequest req)
        {
            using var conn = _connectionFactory.CreateConnection();
            await conn.ExecuteAsync(@"
                INSERT INTO student_coaching_tools (student_id, swot_data, wheel_data, habits_data, updated_by, updated_at)
                VALUES (
                    @StudentId,
                    COALESCE(CAST(@SwotData AS jsonb), '{}'::jsonb),
                    COALESCE(CAST(@WheelData AS jsonb), '{}'::jsonb),
                    COALESCE(CAST(@HabitsData AS jsonb), '[]'::jsonb),
                    @CoachId,
                    NOW()
                )
                ON CONFLICT (student_id) DO UPDATE SET
                    swot_data = COALESCE(CAST(@SwotData AS jsonb), student_coaching_tools.swot_data),
                    wheel_data = COALESCE(CAST(@WheelData AS jsonb), student_coaching_tools.wheel_data),
                    habits_data = COALESCE(CAST(@HabitsData AS jsonb), student_coaching_tools.habits_data),
                    updated_by = @CoachId,
                    updated_at = NOW()",
                new
                {
                    StudentId = studentId,
                    SwotData = req.SwotData,
                    WheelData = req.WheelData,
                    HabitsData = req.HabitsData,
                    CoachId = coachId
                });
        }

        public async Task<StudentCoachingHabitsDto> GetStudentCoachingHabitsAsync(Guid studentId)
        {
            using var conn = _connectionFactory.CreateConnection();
            var tools = await conn.QuerySingleOrDefaultAsync<string?>(@"
                SELECT habits_data::text FROM student_coaching_tools WHERE student_id = @StudentId",
                new { StudentId = studentId });

            var target = await conn.QuerySingleOrDefaultAsync<(string? Milestone, int? TargetMins, int? TargetQs)>(@"
                SELECT monthly_milestone, weekly_target_minutes, weekly_target_questions 
                FROM students WHERE id = @StudentId",
                new { StudentId = studentId });

            return new StudentCoachingHabitsDto
            {
                StudentId = studentId,
                HabitsData = tools ?? "[]",
                MonthlyMilestone = target.Milestone,
                WeeklyTargetMinutes = target.TargetMins,
                WeeklyTargetQuestions = target.TargetQs
            };
        }

        public async Task<string> ToggleStudentHabitAsync(Guid studentId, ToggleHabitRequest req)
        {
            using var conn = _connectionFactory.CreateConnection();
            var currentHabitsJson = await conn.QuerySingleOrDefaultAsync<string?>(@"
                SELECT habits_data::text FROM student_coaching_tools WHERE student_id = @StudentId",
                new { StudentId = studentId });

            var dateStr = string.IsNullOrWhiteSpace(req.Date) ? DateTime.UtcNow.ToString("yyyy-MM-dd") : req.Date;
            var rootNode = string.IsNullOrWhiteSpace(currentHabitsJson)
                ? new System.Text.Json.Nodes.JsonArray()
                : System.Text.Json.Nodes.JsonNode.Parse(currentHabitsJson) as System.Text.Json.Nodes.JsonArray ?? new System.Text.Json.Nodes.JsonArray();

            foreach (var item in rootNode)
            {
                if (item is System.Text.Json.Nodes.JsonObject obj && obj["id"]?.ToString() == req.HabitId)
                {
                    var datesArr = obj["completedDates"] as System.Text.Json.Nodes.JsonArray;
                    if (datesArr == null)
                    {
                        datesArr = new System.Text.Json.Nodes.JsonArray();
                        obj["completedDates"] = datesArr;
                    }

                    var existingList = datesArr.Select(d => d?.ToString()).ToList();
                    if (req.Completed && !existingList.Contains(dateStr))
                    {
                        datesArr.Add(dateStr);
                    }
                    else if (!req.Completed && existingList.Contains(dateStr))
                    {
                        for (int i = datesArr.Count - 1; i >= 0; i--)
                        {
                            if (datesArr[i]?.ToString() == dateStr)
                                datesArr.RemoveAt(i);
                        }
                    }
                    break;
                }
            }

            var updatedJson = rootNode.ToJsonString();
            await conn.ExecuteAsync(@"
                INSERT INTO student_coaching_tools (student_id, habits_data, updated_at)
                VALUES (@StudentId, CAST(@HabitsData AS jsonb), NOW())
                ON CONFLICT (student_id) DO UPDATE SET
                    habits_data = CAST(@HabitsData AS jsonb),
                    updated_at = NOW()",
                new { StudentId = studentId, HabitsData = updatedJson });

            return updatedJson;
        }
    }
}

