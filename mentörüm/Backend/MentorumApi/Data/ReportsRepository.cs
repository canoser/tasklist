using Dapper;
using MentorumApi.DTOs;
using MentorumApi.Services;

namespace MentorumApi.Data
{
    public class ReportsRepository : BaseRepository
    {
        public ReportsRepository(DbConnectionFactory connectionFactory) : base(connectionFactory) { }

        public async Task<ReportsOverviewDto> GetOverviewReportAsync(Guid coachId)
        {
            var sql = @"
                SELECT 
                    (SELECT COUNT(*) FROM students WHERE program_id IN (SELECT program_id FROM program_coaches WHERE coach_id = @CoachId) AND is_active = 1) AS TotalStudents,
                    (SELECT COUNT(*) FROM homework_assignments WHERE program_id IN (SELECT program_id FROM program_coaches WHERE coach_id = @CoachId) AND status IN ('DONE', 'LATE_DONE') AND completed_at >= CURRENT_DATE) AS CompletedToday,
                    (SELECT COUNT(*) FROM homework_assignments WHERE program_id IN (SELECT program_id FROM program_coaches WHERE coach_id = @CoachId) AND (status = 'OVERDUE' OR (status = 'PENDING' AND due_date < CURRENT_DATE))) AS TotalOverdue,
                    (SELECT COUNT(*) FROM homework_assignments WHERE program_id IN (SELECT program_id FROM program_coaches WHERE coach_id = @CoachId) AND due_date >= date_trunc('week', CURRENT_DATE)) AS AssignedThisWeek,
                    
                    -- Başarı Oranı (Tamamlanan / Toplam)
                    (
                        SELECT COALESCE(
                            CAST(SUM(CASE WHEN status IN ('DONE', 'LATE_DONE') THEN 1 ELSE 0 END) AS FLOAT) / NULLIF(COUNT(*), 0) * 100, 
                        0)
                        FROM homework_assignments 
                        WHERE program_id IN (SELECT program_id FROM program_coaches WHERE coach_id = @CoachId)
                    ) AS SuccessRate
            ";
            
            using var conn = _connectionFactory.CreateConnection();
            return await conn.QueryFirstOrDefaultAsync<ReportsOverviewDto>(sql, new { CoachId = coachId }) ?? new ReportsOverviewDto();
        }

        public async Task<StudentReportDto?> GetStudentReportAsync(Guid coachId, Guid studentId)
        {
            // Security check
            var sqlCheck = "SELECT 1 FROM students WHERE id = @StudentId AND program_id IN (SELECT program_id FROM program_coaches WHERE coach_id = @CoachId)";
            using var conn = _connectionFactory.CreateConnection();
            var exists = await conn.QueryFirstOrDefaultAsync<int?>(sqlCheck, new { StudentId = studentId, CoachId = coachId });
            if (exists == null) return null;

            var sql = @"
                SELECT 
                    (SELECT COUNT(*) FROM homework_assignments WHERE student_id = @StudentId AND status IN ('DONE', 'LATE_DONE')) AS TotalCompleted,
                    (SELECT COUNT(*) FROM homework_assignments WHERE student_id = @StudentId AND (status = 'OVERDUE' OR (status = 'PENDING' AND due_date < CURRENT_DATE))) AS TotalOverdue,
                    (SELECT COUNT(*) FROM homework_assignments WHERE student_id = @StudentId) AS TotalAssigned,
                    
                    (
                        SELECT COALESCE(
                            CAST(SUM(CASE WHEN status IN ('DONE', 'LATE_DONE') THEN 1 ELSE 0 END) AS FLOAT) / NULLIF(COUNT(*), 0) * 100, 
                        0)
                        FROM homework_assignments 
                        WHERE student_id = @StudentId
                    ) AS SuccessRate
            ";

            return await conn.QueryFirstOrDefaultAsync<StudentReportDto>(sql, new { StudentId = studentId });
        }

        public async Task<ReportsDetailDto> GetDetailReportAsync(Guid coachId)
        {
            var result = new ReportsDetailDto();
            using var conn = _connectionFactory.CreateConnection();

            var subjectBreakdown = await conn.QueryAsync<SubjectBreakdownItemDto>(@"
                SELECT COALESCE(s.name, 'Serbest') AS SubjectName,
                       SUM(CASE WHEN h.status IN ('DONE','LATE_DONE') THEN 1 ELSE 0 END)::int AS Completed,
                       COUNT(*)::int AS Total,
                       CAST(COALESCE(SUM(CASE WHEN h.status IN ('DONE','LATE_DONE') THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(*),0), 0) AS int) AS SuccessRate
                FROM homework_assignments h
                LEFT JOIN subjects s ON s.id = h.subject_id
                WHERE h.program_id IN (SELECT program_id FROM program_coaches WHERE coach_id = @CoachId)
                GROUP BY s.name
                ORDER BY Total DESC",
                new { CoachId = coachId });
            result.SubjectBreakdown = subjectBreakdown.ToList();

            var recent = await conn.QueryAsync<RecentHomeworkItemDto>(@"
                SELECT u.full_name AS StudentName, h.snapshot_title AS Title, h.completed_at AS CompletedAt, h.status AS Status
                FROM homework_assignments h
                JOIN users u ON u.id = h.student_id
                WHERE h.program_id IN (SELECT program_id FROM program_coaches WHERE coach_id = @CoachId)
                  AND h.status IN ('DONE','LATE_DONE')
                ORDER BY h.completed_at DESC
                LIMIT 5",
                new { CoachId = coachId });
            result.RecentHomework = recent.ToList();

            var overdue = await conn.QueryAsync<OverdueHomeworkItemDto>(@"
                SELECT u.full_name AS StudentName, h.snapshot_title AS Title, h.due_date AS DueDate
                FROM homework_assignments h
                JOIN users u ON u.id = h.student_id
                WHERE h.program_id IN (SELECT program_id FROM program_coaches WHERE coach_id = @CoachId)
                  AND (h.status = 'OVERDUE' OR (h.status = 'PENDING' AND h.due_date < CURRENT_DATE))
                ORDER BY h.due_date ASC",
                new { CoachId = coachId });
            result.OverdueHomework = overdue.ToList();

            var weekly = await conn.QueryAsync<WeeklyTrendItemDto>(@"
                SELECT date_trunc('week', h.completed_at)::date AS WeekStart,
                       COUNT(*)::int AS Completed
                FROM homework_assignments h
                WHERE h.program_id IN (SELECT program_id FROM program_coaches WHERE coach_id = @CoachId)
                  AND h.status IN ('DONE','LATE_DONE')
                  AND h.completed_at >= date_trunc('week', CURRENT_DATE) - interval '3 weeks'
                GROUP BY 1
                ORDER BY 1",
                new { CoachId = coachId });
            result.WeeklyTrend = weekly.ToList();

            return result;
        }

        public async Task<IEnumerable<StudentSubjectStatDto>> GetStudentSubjectStatsAsync(Guid studentId)
        {
            using var conn = _connectionFactory.CreateConnection();
            var meta = await conn.QuerySingleOrDefaultAsync<StudentMetaRow>(@"
                SELECT u.full_name AS FullName, s.grade AS Grade, s.track AS Track,
                       s.target_university AS TargetUniversity, s.target_department AS TargetDepartment,
                       s.target_score AS TargetScore, s.weekly_target_minutes AS WeeklyTargetMinutes
                FROM students s
                JOIN users u ON u.id = s.id
                WHERE s.id = @StudentId",
                new { StudentId = studentId });
            var penaltyMode = await conn.ExecuteScalarAsync<string?>(
                "SELECT value FROM system_settings WHERE key = 'net_penalty_mode'") ?? NetCalculator.PenaltyModeOfficial;

            var sql = @"
                SELECT 
                    ss.subject_id AS SubjectId,
                    s.name AS SubjectName,
                    ss.curriculum_topic_id AS CurriculumTopicId,
                    ct.topic_name AS TopicName,
                    COALESCE(SUM(ss.minutes), 0)::int AS TotalMinutes,
                    COALESCE(SUM(ss.question_count), 0)::int AS TotalQuestions,
                    COALESCE(SUM(ss.correct), 0)::int AS TotalCorrect,
                    COALESCE(SUM(ss.wrong), 0)::int AS TotalWrong,
                    COALESCE(SUM(ss.blank), 0)::int AS TotalBlank
                FROM study_sessions ss
                LEFT JOIN subjects s ON s.id = ss.subject_id
                LEFT JOIN curriculum_topics ct ON ct.id = ss.curriculum_topic_id
                WHERE ss.student_id = @StudentId
                GROUP BY ss.subject_id, s.name, ss.curriculum_topic_id, ct.topic_name
                ORDER BY TotalMinutes DESC";

            var rows = await conn.QueryAsync<SubjectStatRow>(sql, new { StudentId = studentId });

            return rows.Select(r => new StudentSubjectStatDto
            {
                SubjectId = r.SubjectId,
                SubjectName = r.SubjectName ?? "Genel",
                CurriculumTopicId = r.CurriculumTopicId,
                TopicName = r.TopicName,
                TotalMinutes = r.TotalMinutes,
                TotalQuestions = r.TotalQuestions,
                TotalCorrect = r.TotalCorrect,
                TotalWrong = r.TotalWrong,
                TotalBlank = r.TotalBlank,
                TotalNet = NetCalculator.ComputeNet(r.TotalCorrect, r.TotalWrong, r.TotalBlank, meta?.Track, null, meta?.Grade, penaltyMode),
                SuccessRate = NetCalculator.ComputeSuccessRate(r.TotalCorrect, r.TotalQuestions)
            });
        }

        public async Task<WeeklyTimeBudgetDto> GetWeeklyTimeBudgetAsync(Guid studentId)
        {
            using var conn = _connectionFactory.CreateConnection();
            var studyMinutes = await conn.ExecuteScalarAsync<int?>(@"
                SELECT COALESCE(SUM(minutes), 0)::int 
                FROM study_sessions 
                WHERE student_id = @StudentId 
                  AND (started_at >= date_trunc('week', CURRENT_DATE) OR (started_at IS NULL AND created_at >= date_trunc('week', CURRENT_DATE)))",
                new { StudentId = studentId }) ?? 0;

            var personalRows = await conn.QueryAsync<PersonalCategoryRow>(@"
                SELECT 
                    COALESCE(category, 'OTHER') AS Category,
                    COALESCE(SUM(EXTRACT(EPOCH FROM (COALESCE(end_at, start_at + interval '1 hour') - start_at)) / 60), 0)::int AS TotalMinutes
                FROM personal_events
                WHERE user_id = @StudentId 
                  AND start_at >= date_trunc('week', CURRENT_DATE)
                GROUP BY COALESCE(category, 'OTHER')",
                new { StudentId = studentId });

            var schoolMinutes = await conn.ExecuteScalarAsync<int?>(@"
                SELECT COALESCE(SUM(
                    CASE 
                        WHEN end_time >= start_time THEN EXTRACT(EPOCH FROM (end_time - start_time)) / 60
                        ELSE EXTRACT(EPOCH FROM (end_time + interval '24 hours' - start_time)) / 60
                    END
                ), 0)::int
                FROM school_schedules
                WHERE student_id = @StudentId",
                new { StudentId = studentId }) ?? 0;

            var result = new WeeklyTimeBudgetDto
            {
                TotalStudyMinutes = studyMinutes
            };

            int totalPersonal = 0;
            var categoriesMap = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);

            foreach (var r in personalRows)
            {
                string cat = r.Category;
                int mins = r.TotalMinutes;
                totalPersonal += mins;
                categoriesMap[cat] = categoriesMap.GetValueOrDefault(cat, 0) + mins;
            }

            if (schoolMinutes > 0)
            {
                totalPersonal += schoolMinutes;
                categoriesMap["SCHOOL"] = categoriesMap.GetValueOrDefault("SCHOOL", 0) + schoolMinutes;
            }

            if (studyMinutes > 0)
            {
                result.Categories.Add(new WeeklyTimeBudgetItemDto
                {
                    Category = "STUDY",
                    TotalMinutes = studyMinutes
                });
            }

            foreach (var kvp in categoriesMap)
            {
                result.Categories.Add(new WeeklyTimeBudgetItemDto
                {
                    Category = kvp.Key,
                    TotalMinutes = kvp.Value
                });
            }

            result.TotalPersonalMinutes = totalPersonal;
            result.TotalTrackedMinutes = studyMinutes + totalPersonal;

            if (result.TotalTrackedMinutes > 0)
            {
                foreach (var cat in result.Categories)
                {
                    cat.Percentage = Math.Round((double)cat.TotalMinutes / result.TotalTrackedMinutes * 100.0, 1);
                }
            }

            return result;
        }

        // =====================================================================
        // [V21] Sınıf Bazlı Eğitim Koçluğu Raporu, Sınıf Arşivi ve Kohort Analizi
        // =====================================================================

        public async Task<(bool CanView, bool CanEditTargets)> CheckStudentReportAccessAsync(Guid actorId, string? actorRole, Guid studentId)
        {
            using var conn = _connectionFactory.CreateConnection();
            if (actorId == studentId)
            {
                var row = await conn.QuerySingleOrDefaultAsync<StudentAutonomyCheckRow>(@"
                    SELECT s.can_edit_goals AS CanEditGoals,
                           CASE WHEN EXISTS (
                               SELECT 1 FROM program_coaches pc
                               WHERE pc.program_id = s.program_id AND pc.coach_id <> s.id
                           ) THEN 1 ELSE 0 END AS HasCoach
                    FROM students s WHERE s.id = @StudentId",
                    new { StudentId = studentId });
                if (row == null) return (false, false);
                bool canEdit = row.HasCoach == 0 || row.CanEditGoals == 1;
                return (true, canEdit);
            }

            if (string.Equals(actorRole, "Coach", StringComparison.OrdinalIgnoreCase))
            {
                var owns = await conn.ExecuteScalarAsync<int?>(@"
                    SELECT 1 FROM students s
                    WHERE s.id = @StudentId
                      AND s.program_id IN (SELECT program_id FROM program_coaches WHERE coach_id = @ActorId)",
                    new { StudentId = studentId, ActorId = actorId });
                return (owns != null, owns != null);
            }

            if (string.Equals(actorRole, "Parent", StringComparison.OrdinalIgnoreCase))
            {
                var parentOk = await conn.ExecuteScalarAsync<int?>(@"
                    SELECT 1 FROM student_parents
                    WHERE student_id = @StudentId AND parent_id = @ActorId AND is_accepted = 1",
                    new { StudentId = studentId, ActorId = actorId });
                return (parentOk != null, false);
            }

            return (false, false);
        }

        public async Task<StudentGradeReportDto?> GetStudentGradeReportAsync(Guid studentId, int? requestedGrade, bool canEditTargets)
        {
            using var conn = _connectionFactory.CreateConnection();
            var meta = await conn.QuerySingleOrDefaultAsync<StudentMetaRow>(@"
                SELECT u.full_name AS FullName, s.grade AS Grade, s.track AS Track,
                       s.target_university AS TargetUniversity, s.target_department AS TargetDepartment,
                       s.target_score AS TargetScore, s.weekly_target_minutes AS WeeklyTargetMinutes
                FROM students s
                JOIN users u ON u.id = s.id
                WHERE s.id = @StudentId",
                new { StudentId = studentId });

            if (meta == null) return null;

            int currentGrade = meta.Grade ?? 12;
            var penaltyMode = await conn.ExecuteScalarAsync<string?>(
                "SELECT value FROM system_settings WHERE key = 'net_penalty_mode'") ?? NetCalculator.PenaltyModeOfficial;

            // Öğrencinin verisi bulunan tüm sınıfları (aktif + geçmiş arşiv) topla
            var historyGrades = (await conn.QueryAsync<int>(@"
                SELECT DISTINCT g FROM (
                    SELECT grade::int AS g FROM exam_results WHERE student_id = @StudentId AND grade IS NOT NULL
                    UNION
                    SELECT grade::int AS g FROM homework_assignments WHERE student_id = @StudentId AND grade IS NOT NULL
                    UNION
                    SELECT grade::int AS g FROM study_sessions WHERE student_id = @StudentId AND grade IS NOT NULL
                    UNION
                    SELECT grade::int AS g FROM student_resources WHERE student_id = @StudentId AND grade IS NOT NULL
                    UNION
                    SELECT grade::int AS g FROM student_subject_targets WHERE student_id = @StudentId
                    UNION
                    SELECT CASE WHEN ct.grade ~ '^[0-9]+$' THEN ct.grade::int ELSE NULL END AS g
                    FROM student_topic_progress stp
                    JOIN curriculum_topics ct ON ct.id = stp.curriculum_topic_id
                    WHERE stp.student_id = @StudentId AND stp.is_completed = 1
                ) sub
                WHERE g IS NOT NULL AND g BETWEEN 4 AND 13",
                new { StudentId = studentId })).ToList();

            if (!historyGrades.Contains(currentGrade))
                historyGrades.Add(currentGrade);
            historyGrades = historyGrades.Distinct().OrderByDescending(g => g).ToList();

            int selectedGrade = requestedGrade.HasValue ? requestedGrade.Value : currentGrade;
            int effectiveGrade = selectedGrade > 0 ? selectedGrade : currentGrade;

            var report = new StudentGradeReportDto
            {
                StudentId = studentId, StudentName = meta.FullName, CurrentGrade = currentGrade,
                SelectedGrade = selectedGrade, AvailableGrades = historyGrades, Track = meta.Track,
                TargetUniversity = meta.TargetUniversity, TargetDepartment = meta.TargetDepartment,
                TargetScore = meta.TargetScore, CanEditTargets = canEditTargets,
                Profile = GradeReportProfileBuilder.ResolveProfileMeta(effectiveGrade, penaltyMode)
            };

            var hwStats = await conn.QuerySingleAsync<HwAggRow>(@"
                SELECT COUNT(*)::int AS TotalAssigned,
                       COALESCE(SUM(CASE WHEN status IN ('DONE', 'LATE_DONE') THEN 1 ELSE 0 END), 0)::int AS TotalCompleted,
                       COALESCE(SUM(CASE WHEN status = 'OVERDUE' OR (status = 'PENDING' AND due_date < (NOW() AT TIME ZONE 'Europe/Istanbul')::date) THEN 1 ELSE 0 END), 0)::int AS TotalOverdue
                FROM homework_assignments WHERE student_id = @StudentId AND (@SelectedGrade = 0 OR grade = @SelectedGrade)",
                new { StudentId = studentId, SelectedGrade = selectedGrade });

            var exams = (await conn.QueryAsync<ExamHeaderRow>(@"
                SELECT id AS Id, COALESCE(exam_name, 'Deneme Sınavı') AS ExamName, COALESCE(exam_type, 'Deneme') AS ExamType,
                       COALESCE(exam_date, created_at::date) AS ExamDate, grade AS Grade, COALESCE(total_net, 0)::numeric AS TotalNet, error_reasons AS ErrorReasons
                FROM exam_results WHERE student_id = @StudentId AND (@SelectedGrade = 0 OR grade = @SelectedGrade)
                ORDER BY COALESCE(exam_date, created_at::date) DESC, created_at DESC",
                new { StudentId = studentId, SelectedGrade = selectedGrade })).ToList();

            var examScores = (await conn.QueryAsync<ExamScoreDetailRow>(@"
                SELECT es.exam_id AS ExamId, es.subject_id AS SubjectId, COALESCE(s.name, es.subject_name, es.subject_code, 'Genel') AS SubjectName,
                       COALESCE(es.correct, 0) AS Correct, COALESCE(es.wrong, 0) AS Wrong, COALESCE(es.blank, 0) AS Blank,
                       es.net AS Net, es.score AS Score, er.exam_type AS ExamType, er.grade AS Grade
                FROM exam_scores es JOIN exam_results er ON er.id = es.exam_id LEFT JOIN subjects s ON s.id = es.subject_id
                WHERE er.student_id = @StudentId AND (@SelectedGrade = 0 OR er.grade = @SelectedGrade)
                ORDER BY COALESCE(er.exam_date, er.created_at::date) DESC, er.created_at DESC",
                new { StudentId = studentId, SelectedGrade = selectedGrade })).ToList();

            var scoresByExam = examScores.GroupBy(x => x.ExamId).ToDictionary(g => g.Key, g => g.ToList());

            foreach (var ex in exams)
            {
                var exScores = scoresByExam.GetValueOrDefault(ex.Id) ?? new List<ExamScoreDetailRow>();
                decimal computedTotalNet = ex.TotalNet;
                if (exScores.Count > 0 && computedTotalNet == 0m && !string.Equals(ex.ExamType, NetCalculator.ExamTypeOkul, StringComparison.OrdinalIgnoreCase))
                    computedTotalNet = exScores.Sum(s => s.Net ?? NetCalculator.ComputeNet(s.Correct, s.Wrong, s.Blank, meta.Track, ex.ExamType, ex.Grade ?? effectiveGrade, penaltyMode));

                decimal? schoolAvg = null;
                if (string.Equals(ex.ExamType, NetCalculator.ExamTypeOkul, StringComparison.OrdinalIgnoreCase))
                {
                    var validScores = exScores.Where(s => s.Score.HasValue).Select(s => (decimal)s.Score!.Value).ToList();
                    schoolAvg = validScores.Count > 0 ? Math.Round(validScores.Average(), 1) : computedTotalNet;
                }

                decimal? lgsScore = null;
                if ((ex.Grade ?? effectiveGrade) == 8 && !string.Equals(ex.ExamType, NetCalculator.ExamTypeOkul, StringComparison.OrdinalIgnoreCase))
                {
                    var subjNets = exScores.Select(s => ((string?)s.SubjectName, s.Net ?? NetCalculator.ComputeNet(s.Correct, s.Wrong, s.Blank, meta.Track, ex.ExamType, 8, penaltyMode)));
                    lgsScore = NetCalculator.ComputeLgsWeightedScore(computedTotalNet, subjNets);
                }

                report.ExamSeries.Add(new ExamProgressionPointDto
                {
                    ExamId = ex.Id, ExamName = ex.ExamName, ExamType = ex.ExamType, ExamDate = ex.ExamDate,
                    Grade = ex.Grade, TotalNet = Math.Round(computedTotalNet, 2), SchoolScoreAverage = schoolAvg, LgsWeightedScore = lgsScore
                });
            }

            var reasonCounts = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
            foreach (var ex in exams.Where(e => !string.IsNullOrWhiteSpace(e.ErrorReasons)))
            {
                var parts = ex.ErrorReasons!.Replace("[", "").Replace("]", "").Replace("\"", "")
                    .Split(new[] { ',', ';', '|' }, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
                foreach (var p in parts) reasonCounts[p] = reasonCounts.GetValueOrDefault(p, 0) + 1;
            }
            int totalReasons = reasonCounts.Values.Sum();
            if (totalReasons > 0)
            {
                report.ErrorReasons = reasonCounts.OrderByDescending(kv => kv.Value)
                    .Select(kv => new ErrorReasonStatDto { Reason = kv.Key, Count = kv.Value, Percentage = (int)Math.Round(kv.Value * 100.0 / totalReasons) })
                    .ToList();
            }

            // 4. Ders bazlı müfredat, çalışma oturumu, sınav ve hedef net (gap) birleştirmesi
            var curriculumGradeText = selectedGrade > 0 ? selectedGrade.ToString() : null;
            var syllabusRows = (await conn.QueryAsync<SyllabusSubjectAggRow>(@"
                SELECT s.id AS SubjectId, s.name AS SubjectName,
                       COUNT(ct.id)::int AS TotalTopics,
                       COALESCE(SUM(CASE
                           WHEN stp.is_completed = 1 THEN 1
                           WHEN stp.is_completed IS NULL AND EXISTS (
                               SELECT 1 FROM homework_assignments ha
                               WHERE ha.student_id = @StudentId AND ha.curriculum_topic_id = ct.id AND ha.status IN ('DONE', 'LATE_DONE')
                           ) THEN 1
                           ELSE 0
                       END), 0)::int AS CompletedTopics
                FROM curriculum_topics ct
                JOIN subjects s ON s.id = ct.subject_id
                LEFT JOIN student_topic_progress stp ON stp.student_id = @StudentId AND stp.curriculum_topic_id = ct.id
                WHERE ct.is_active = 1
                  AND (@GradeText IS NULL OR ct.grade = @GradeText)
                GROUP BY s.id, s.name
                ORDER BY s.name",
                new { StudentId = studentId, GradeText = curriculumGradeText })).ToList();

            var studyRows = (await conn.QueryAsync<StudySubjectAggRow>(@"
                SELECT COALESCE(ss.subject_id, '00000000-0000-0000-0000-000000000000'::uuid) AS SubjectId,
                       COALESCE(s.name, 'Genel') AS SubjectName,
                       COALESCE(SUM(ss.minutes), 0)::int AS StudyMinutes,
                       COALESCE(SUM(ss.question_count), 0)::int AS SolvedQuestions,
                       COALESCE(SUM(ss.correct), 0)::int AS TotalCorrect
                FROM study_sessions ss
                LEFT JOIN subjects s ON s.id = ss.subject_id
                WHERE ss.student_id = @StudentId
                  AND (@SelectedGrade = 0 OR ss.grade = @SelectedGrade)
                GROUP BY COALESCE(ss.subject_id, '00000000-0000-0000-0000-000000000000'::uuid), COALESCE(s.name, 'Genel')",
                new { StudentId = studentId, SelectedGrade = selectedGrade })).ToList();

            var targets = (await conn.QueryAsync<SubjectTargetRow>(@"
                SELECT sst.subject_id AS SubjectId, s.name AS SubjectName,
                       sst.target_net AS TargetNet, sst.target_score AS TargetScore
                FROM student_subject_targets sst
                JOIN subjects s ON s.id = sst.subject_id
                WHERE sst.student_id = @StudentId AND sst.grade = @EffectiveGrade",
                new { StudentId = studentId, EffectiveGrade = effectiveGrade })).ToList();

            var allSubjects = new Dictionary<Guid, string>();
            foreach (var r in syllabusRows) allSubjects[r.SubjectId] = r.SubjectName;
            foreach (var r in studyRows.Where(x => x.SubjectId != Guid.Empty)) allSubjects[r.SubjectId] = r.SubjectName;
            foreach (var r in targets) allSubjects[r.SubjectId] = r.SubjectName;
            foreach (var r in examScores.Where(x => x.SubjectId.HasValue)) allSubjects[r.SubjectId!.Value] = r.SubjectName;

            foreach (var kv in allSubjects.OrderBy(x => x.Value))
            {
                var subjId = kv.Key;
                var subjName = kv.Value;
                var syl = syllabusRows.FirstOrDefault(x => x.SubjectId == subjId);
                var st = studyRows.FirstOrDefault(x => x.SubjectId == subjId);
                var tgt = targets.FirstOrDefault(x => x.SubjectId == subjId);
                var scList = examScores.Where(x => x.SubjectId == subjId || string.Equals(x.SubjectName, subjName, StringComparison.OrdinalIgnoreCase)).ToList();

                var denemeScores = scList.Where(x => !string.Equals(x.ExamType, NetCalculator.ExamTypeOkul, StringComparison.OrdinalIgnoreCase)).ToList();
                var schoolScores = scList.Where(x => string.Equals(x.ExamType, NetCalculator.ExamTypeOkul, StringComparison.OrdinalIgnoreCase) && x.Score.HasValue).ToList();

                decimal avgNet = denemeScores.Count > 0
                    ? Math.Round(denemeScores.Average(x => x.Net ?? NetCalculator.ComputeNet(x.Correct, x.Wrong, x.Blank, meta.Track, x.ExamType, effectiveGrade, penaltyMode)), 2)
                    : 0m;
                decimal lastNet = denemeScores.Count > 0
                    ? Math.Round(denemeScores[0].Net ?? NetCalculator.ComputeNet(denemeScores[0].Correct, denemeScores[0].Wrong, denemeScores[0].Blank, meta.Track, denemeScores[0].ExamType, effectiveGrade, penaltyMode), 2)
                    : 0m;
                decimal? schoolWrittenAvg = schoolScores.Count > 0
                    ? Math.Round(schoolScores.Average(x => (decimal)x.Score!.Value), 1)
                    : null;

                int totalTopics = syl?.TotalTopics ?? 0;
                int completedTopics = syl?.CompletedTopics ?? 0;
                int topicPct = totalTopics > 0 ? (int)Math.Round(completedTopics * 100.0 / totalTopics) : 0;

                int solvedQ = st?.SolvedQuestions ?? 0;
                int correctQ = st?.TotalCorrect ?? 0;
                decimal successRate = solvedQ > 0
                    ? NetCalculator.ComputeSuccessRate(correctQ, solvedQ)
                    : (denemeScores.Sum(x => x.Correct + x.Wrong + x.Blank) > 0
                        ? NetCalculator.ComputeSuccessRate(denemeScores.Sum(x => x.Correct), denemeScores.Sum(x => x.Correct + x.Wrong + x.Blank))
                        : 0m);

                decimal? netGap = tgt != null ? Math.Round(tgt.TargetNet - lastNet, 2) : null;

                report.SubjectMastery.Add(new SubjectMasteryItemDto
                {
                    SubjectId = subjId, SubjectName = subjName, CompletedTopics = completedTopics, TotalTopics = totalTopics,
                    TopicCompletionPercent = topicPct, StudyMinutes = st?.StudyMinutes ?? 0, SolvedQuestions = solvedQ,
                    SuccessRate = successRate, AvgExamNet = avgNet, LastExamNet = lastNet,
                    SchoolWrittenAvg = schoolWrittenAvg, TargetNet = tgt?.TargetNet, TargetScore = tgt?.TargetScore, NetGap = netGap
                });
            }

            var checkins = (await conn.QueryAsync<string>(@"
                SELECT mood FROM student_checkins
                WHERE student_id = @StudentId AND checkin_date >= ((NOW() AT TIME ZONE 'Europe/Istanbul')::date - interval '14 days')
                ORDER BY checkin_date DESC",
                new { StudentId = studentId })).ToList();

            var growRow = await conn.QuerySingleOrDefaultAsync<GrowAggRow>(@"
                SELECT COUNT(*)::int AS TotalCount, MAX(session_date) AS LastDate,
                       (SELECT action_items FROM coaching_sessions WHERE student_id = @StudentId ORDER BY session_date DESC NULLS LAST, created_at DESC LIMIT 1) AS LastAction
                FROM coaching_sessions WHERE student_id = @StudentId",
                new { StudentId = studentId });

            int positiveCount = checkins.Count(m => m is "GREAT" or "GOOD" or "HAPPY" or "MOTIVATED" or "ENERGETIC" or "İYİ" or "HARİKA");
            report.Wellbeing = new WellbeingSummaryDto
            {
                RecentCheckinCount = checkins.Count,
                DominantMood = checkins.Count > 0 ? checkins.GroupBy(m => m).OrderByDescending(g => g.Count()).First().Key : "BELİRTİLMEDİ",
                PositiveMoodRate = checkins.Count > 0 ? (int)Math.Round(positiveCount * 100.0 / checkins.Count) : 0,
                CompletedGrowSessionsCount = growRow?.TotalCount ?? 0,
                LastGrowSessionDate = growRow?.LastDate,
                LastGrowGoalSummary = growRow?.LastAction
            };

            var weeklyAgg = await conn.QuerySingleAsync<WeeklyStudyAggRow>(@"
                SELECT COALESCE(SUM(minutes), 0)::int AS WeeklyMinutes, COALESCE(SUM(question_count), 0)::int AS WeeklyQuestions,
                       COUNT(DISTINCT ((COALESCE(started_at, created_at) AT TIME ZONE 'Europe/Istanbul')::date))::int AS ActiveDays7d
                FROM study_sessions WHERE student_id = @StudentId AND (@SelectedGrade = 0 OR grade = @SelectedGrade)
                  AND COALESCE(started_at, created_at) >= date_trunc('week', NOW() AT TIME ZONE 'Europe/Istanbul')",
                new { StudentId = studentId, SelectedGrade = selectedGrade });

            var resAgg = await conn.QuerySingleAsync<ResourceAggRow>(@"
                SELECT COALESCE(SUM(completed_units), 0)::int AS CompletedUnits, COALESCE(SUM(total_units), 0)::int AS TotalUnits
                FROM student_resources WHERE student_id = @StudentId AND (@SelectedGrade = 0 OR grade = @SelectedGrade)",
                new { StudentId = studentId, SelectedGrade = selectedGrade });

            var gm = report.GradeModule;
            gm.StreakDays = weeklyAgg.ActiveDays7d;
            gm.WeeklyStudyMinutes = weeklyAgg.WeeklyMinutes;
            gm.WeeklySolvedQuestions = weeklyAgg.WeeklyQuestions;
            gm.CompletedResourceUnits = resAgg.CompletedUnits;
            gm.TotalResourceUnits = resAgg.TotalUnits;

            var g9and10Rate = await conn.ExecuteScalarAsync<int?>(@"
                SELECT CAST(ROUND(COALESCE(
                    SUM(CASE WHEN stp.is_completed = 1 THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(ct.id), 0),
                0)) AS int)
                FROM curriculum_topics ct
                LEFT JOIN student_topic_progress stp ON stp.student_id = @StudentId AND stp.curriculum_topic_id = ct.id
                WHERE ct.is_active = 1 AND ct.grade IN ('9', '10')",
                new { StudentId = studentId }) ?? 0;

            GradeReportProfileBuilder.PopulateGradeKpisAndInsights(
                report,
                effectiveGrade,
                hwStats.TotalAssigned,
                hwStats.TotalCompleted,
                hwStats.TotalOverdue,
                meta.WeeklyTargetMinutes ?? 300,
                g9and10Rate);

            return report;
        }

        public async Task UpsertSubjectTargetsAsync(Guid studentId, int grade, List<SubjectTargetInputDto> targets, string updatedBy)
        {
            int safeGrade = Math.Clamp(grade, 4, 13);
            string actor = updatedBy == "Coach" ? "Coach" : "Student";
            using var conn = _connectionFactory.CreateConnection();
            conn.Open();
            using var tx = conn.BeginTransaction();
            try
            {
                foreach (var t in targets)
                {
                    if (t.SubjectId == Guid.Empty) continue;
                    await conn.ExecuteAsync(@"
                        INSERT INTO student_subject_targets (student_id, grade, subject_id, target_net, target_score, updated_by, updated_at)
                        VALUES (@StudentId, @Grade, @SubjectId, @TargetNet, @TargetScore, @UpdatedBy, NOW())
                        ON CONFLICT (student_id, grade, subject_id) DO UPDATE SET
                            target_net = EXCLUDED.target_net, target_score = EXCLUDED.target_score,
                            updated_by = EXCLUDED.updated_by, updated_at = NOW()",
                        new { StudentId = studentId, Grade = safeGrade, t.SubjectId, TargetNet = Math.Max(0m, t.TargetNet), t.TargetScore, UpdatedBy = actor }, tx);
                }
                tx.Commit();
            }
            catch { tx.Rollback(); throw; }
        }

        public async Task<List<GradeCohortSummaryDto>> GetCohortByGradeAsync(Guid coachId, int? filterGrade)
        {
            using var conn = _connectionFactory.CreateConnection();
            var penaltyMode = await conn.ExecuteScalarAsync<string?>(
                "SELECT value FROM system_settings WHERE key = 'net_penalty_mode'") ?? NetCalculator.PenaltyModeOfficial;

            var rows = (await conn.QueryAsync<CohortStudentRow>(@"
                SELECT s.id AS StudentId, u.full_name AS StudentName, COALESCE(s.grade, 12)::int AS Grade, s.track AS Track,
                       COALESCE(hw.total_assigned, 0)::int AS TotalAssigned, COALESCE(hw.total_completed, 0)::int AS TotalCompleted,
                       COALESCE(hw.total_overdue, 0)::int AS OverdueCount, COALESCE(ex.last_net, 0)::numeric AS LatestExamNet,
                       COALESCE(st.weekly_mins, 0)::int AS WeeklyStudyMinutes
                FROM students s JOIN users u ON u.id = s.id
                LEFT JOIN LATERAL (
                    SELECT COUNT(*) AS total_assigned,
                           SUM(CASE WHEN ha.status IN ('DONE', 'LATE_DONE') THEN 1 ELSE 0 END) AS total_completed,
                           SUM(CASE WHEN ha.status = 'OVERDUE' OR (ha.status = 'PENDING' AND ha.due_date < (NOW() AT TIME ZONE 'Europe/Istanbul')::date) THEN 1 ELSE 0 END) AS total_overdue
                    FROM homework_assignments ha WHERE ha.student_id = s.id AND (ha.grade IS NULL OR ha.grade = s.grade)
                ) hw ON true
                LEFT JOIN LATERAL (
                    SELECT er.total_net AS last_net FROM exam_results er
                    WHERE er.student_id = s.id AND (er.grade IS NULL OR er.grade = s.grade)
                    ORDER BY COALESCE(er.exam_date, er.created_at::date) DESC, er.created_at DESC LIMIT 1
                ) ex ON true
                LEFT JOIN LATERAL (
                    SELECT SUM(ss.minutes) AS weekly_mins FROM study_sessions ss
                    WHERE ss.student_id = s.id AND COALESCE(ss.started_at, ss.created_at) >= date_trunc('week', NOW() AT TIME ZONE 'Europe/Istanbul')
                ) st ON true
                WHERE s.is_active = 1 AND s.program_id IN (SELECT program_id FROM program_coaches WHERE coach_id = @CoachId)
                  AND (@FilterGrade IS NULL OR COALESCE(s.grade, 12) = @FilterGrade)
                ORDER BY COALESCE(s.grade, 12) DESC, u.full_name ASC",
                new { CoachId = coachId, FilterGrade = filterGrade })).ToList();

            var result = new List<GradeCohortSummaryDto>();
            foreach (var grp in rows.GroupBy(r => r.Grade).OrderByDescending(g => g.Key))
            {
                var meta = GradeReportProfileBuilder.ResolveProfileMeta(grp.Key, penaltyMode);
                var studentItems = grp.Select(r =>
                {
                    int hwRate = r.TotalAssigned > 0 ? (int)Math.Round(r.TotalCompleted * 100.0 / r.TotalAssigned) : 100;
                    bool atRisk = r.OverdueCount >= 2 || (r.TotalAssigned >= 3 && hwRate < 50);
                    return new GradeCohortStudentItemDto
                    {
                        StudentId = r.StudentId, StudentName = r.StudentName, Grade = r.Grade, Track = r.Track,
                        HomeworkCompletionRate = hwRate, LatestExamNet = Math.Round(r.LatestExamNet, 2),
                        WeeklyStudyMinutes = r.WeeklyStudyMinutes, OverdueHomeworkCount = r.OverdueCount, IsAtRisk = atRisk
                    };
                }).ToList();

                result.Add(new GradeCohortSummaryDto
                {
                    Grade = grp.Key, GradeLabel = grp.Key == 13 ? "Mezun" : $"{grp.Key}. Sınıf", SystemTitle = meta.SystemTitle,
                    StudentCount = studentItems.Count, AvgHomeworkCompletionRate = (int)Math.Round(studentItems.Average(x => x.HomeworkCompletionRate)),
                    AvgLatestExamNet = Math.Round(studentItems.Average(x => x.LatestExamNet), 2),
                    AvgWeeklyStudyMinutes = (int)Math.Round(studentItems.Average(x => x.WeeklyStudyMinutes)),
                    AtRiskStudentCount = studentItems.Count(x => x.IsAtRisk), Students = studentItems
                });
            }

            return result;
        }

        private sealed class StudentAutonomyCheckRow { public int CanEditGoals { get; set; } public int HasCoach { get; set; } }
        private sealed class StudentMetaRow { public string FullName { get; set; } = ""; public int? Grade { get; set; } public string? Track { get; set; } public string? TargetUniversity { get; set; } public string? TargetDepartment { get; set; } public decimal? TargetScore { get; set; } public int? WeeklyTargetMinutes { get; set; } }
        private sealed class HwAggRow { public int TotalAssigned { get; set; } public int TotalCompleted { get; set; } public int TotalOverdue { get; set; } }
        private sealed class ExamHeaderRow { public Guid Id { get; set; } public string ExamName { get; set; } = ""; public string ExamType { get; set; } = ""; public DateTime ExamDate { get; set; } public int? Grade { get; set; } public decimal TotalNet { get; set; } public string? ErrorReasons { get; set; } }
        private sealed class ExamScoreDetailRow { public Guid ExamId { get; set; } public Guid? SubjectId { get; set; } public string SubjectName { get; set; } = ""; public int Correct { get; set; } public int Wrong { get; set; } public int Blank { get; set; } public decimal? Net { get; set; } public float? Score { get; set; } public string ExamType { get; set; } = ""; public int? Grade { get; set; } }
        private sealed class SyllabusSubjectAggRow { public Guid SubjectId { get; set; } public string SubjectName { get; set; } = ""; public int TotalTopics { get; set; } public int CompletedTopics { get; set; } }
        private sealed class StudySubjectAggRow { public Guid SubjectId { get; set; } public string SubjectName { get; set; } = ""; public int StudyMinutes { get; set; } public int SolvedQuestions { get; set; } public int TotalCorrect { get; set; } }
        private sealed class SubjectTargetRow { public Guid SubjectId { get; set; } public string SubjectName { get; set; } = ""; public decimal TargetNet { get; set; } public decimal? TargetScore { get; set; } }
        private sealed class GrowAggRow { public int TotalCount { get; set; } public DateTime? LastDate { get; set; } public string? LastAction { get; set; } }
        private sealed class WeeklyStudyAggRow { public int WeeklyMinutes { get; set; } public int WeeklyQuestions { get; set; } public int ActiveDays7d { get; set; } }
        private sealed class ResourceAggRow { public int CompletedUnits { get; set; } public int TotalUnits { get; set; } }
        private sealed class CohortStudentRow { public Guid StudentId { get; set; } public string StudentName { get; set; } = ""; public int Grade { get; set; } public string? Track { get; set; } public int TotalAssigned { get; set; } public int TotalCompleted { get; set; } public int OverdueCount { get; set; } public decimal LatestExamNet { get; set; } public int WeeklyStudyMinutes { get; set; } }
        private sealed class SubjectStatRow { public Guid? SubjectId { get; set; } public string? SubjectName { get; set; } public Guid? CurriculumTopicId { get; set; } public string? TopicName { get; set; } public int TotalMinutes { get; set; } public int TotalQuestions { get; set; } public int TotalCorrect { get; set; } public int TotalWrong { get; set; } public int TotalBlank { get; set; } }
        private sealed class PersonalCategoryRow { public string Category { get; set; } = "OTHER"; public int TotalMinutes { get; set; } }
    }
}
