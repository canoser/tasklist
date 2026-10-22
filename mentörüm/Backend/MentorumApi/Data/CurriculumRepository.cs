using Dapper;
using MentorumApi.DTOs;

namespace MentorumApi.Data
{
    public class CurriculumRepository : BaseRepository
    {
        public CurriculumRepository(DbConnectionFactory connectionFactory) : base(connectionFactory) { }

        public async Task<IEnumerable<SubjectDto>> GetAllSubjectsAsync()
        {
            using var connection = _connectionFactory.CreateConnection();
            var sql = "SELECT id, name, short_code AS ShortCode, default_color AS DefaultColor, is_system_subject AS IsSystemSubject FROM subjects ORDER BY name";
            return await connection.QueryAsync<SubjectDto>(sql);
        }

        public async Task<IEnumerable<string>> GetLevelsAsync()
        {
            using var connection = _connectionFactory.CreateConnection();
            var sql = "SELECT DISTINCT grade FROM curriculum_topics WHERE is_active = 1 ORDER BY grade";
            return await connection.QueryAsync<string>(sql);
        }

        public async Task<IEnumerable<SubjectDto>> GetSubjectsByLevelAsync(string? level)
        {
            using var connection = _connectionFactory.CreateConnection();
            var sql = @"
                SELECT DISTINCT s.id, s.name, s.short_code AS ShortCode, s.default_color AS DefaultColor, s.is_system_subject AS IsSystemSubject
                FROM subjects s
                INNER JOIN curriculum_topics ct ON ct.subject_id = s.id
                WHERE ct.is_active = 1 AND (@Level IS NULL OR ct.grade = @Level)
                ORDER BY s.name";
            return await connection.QueryAsync<SubjectDto>(sql, new { Level = level });
        }

        public async Task<IEnumerable<CurriculumTopicDto>> GetTopicsBySubjectAsync(Guid subjectId, string? grade, int? unit = null)
        {
            using var connection = _connectionFactory.CreateConnection();
            var sql = @"
                SELECT id, subject_id AS SubjectId, grade, curriculum_type AS CurriculumType,
                       unit_number AS UnitNumber, unit_name AS UnitName, topic_number AS TopicNumber,
                       topic_name AS TopicName, sort_order AS SortOrder
                FROM curriculum_topics 
                WHERE subject_id = @SubjectId AND is_active = 1";
            
            if (!string.IsNullOrEmpty(grade))
            {
                sql += " AND grade = @Grade";
            }

            if (unit.HasValue)
            {
                sql += " AND unit_number = @Unit";
            }
            
            sql += " ORDER BY sort_order";

            return await connection.QueryAsync<CurriculumTopicDto>(sql, new { SubjectId = subjectId, Grade = grade, Unit = unit });
        }

        public async Task<IEnumerable<CurriculumUnitDto>> GetUnitsBySubjectAsync(Guid subjectId, string? grade)
        {
            using var connection = _connectionFactory.CreateConnection();
            var sql = @"
                SELECT DISTINCT unit_number AS UnitNumber, unit_name AS UnitName
                FROM curriculum_topics
                WHERE subject_id = @SubjectId AND is_active = 1 AND unit_number IS NOT NULL";

            if (!string.IsNullOrEmpty(grade))
            {
                sql += " AND grade = @Grade";
            }

            sql += " ORDER BY unit_number";

            return await connection.QueryAsync<CurriculumUnitDto>(sql, new { SubjectId = subjectId, Grade = grade });
        }

        // Öğrencinin sınıfına göre müfredat + tamamlanma durumu (Aşama 1).
        // Tamamlanma, ödevlerden (curriculum_topic_id + DONE/LATE_DONE) türetilir; veri yoksa salt konu listesi.
        public async Task<IEnumerable<StudentCurriculumTopicDto>> GetStudentCurriculumAsync(Guid studentId)
        {
            using var connection = _connectionFactory.CreateConnection();
            var grade = await connection.ExecuteScalarAsync<int?>("SELECT grade FROM students WHERE id = @StudentId", new { StudentId = studentId });
            var gradeText = grade?.ToString();

            return await connection.QueryAsync<StudentCurriculumTopicDto>(@"
                SELECT ct.id AS Id, s.name AS SubjectName, ct.grade AS Grade, ct.curriculum_type AS CurriculumType,
                       ct.unit_number AS UnitNumber, ct.unit_name AS UnitName, ct.topic_number AS TopicNumber,
                       ct.topic_name AS TopicName,
                       EXISTS (
                           SELECT 1 FROM homework_assignments ha
                           WHERE ha.student_id = @StudentId AND ha.curriculum_topic_id = ct.id
                             AND ha.status IN ('DONE','LATE_DONE')
                       ) AS IsCompleted
                FROM curriculum_topics ct
                JOIN subjects s ON s.id = ct.subject_id
                WHERE ct.is_active = 1 AND (@GradeText IS NULL OR ct.grade = @GradeText)
                ORDER BY s.name, ct.sort_order",
                new { StudentId = studentId, GradeText = gradeText });
        }

        /// <summary>Müfredatı AI ile doldurulacak JSON şablonu olarak dışa aktarır.</summary>
        public async Task<CurriculumExportDto> ExportAsync(string? grade = null)
        {
            grade = string.IsNullOrWhiteSpace(grade) ? null : grade.Trim();

            using var conn = _connectionFactory.CreateConnection();

            var year = await conn.QuerySingleOrDefaultAsync<string?>(
                "SELECT year_label FROM curriculum_years WHERE is_active = 1 ORDER BY created_at LIMIT 1");

            var subjects = (await conn.QueryAsync<SubjectDto>(
                "SELECT id, name, short_code AS ShortCode, default_color AS DefaultColor, is_system_subject AS IsSystemSubject FROM subjects ORDER BY name")).ToList();

            var rows = await conn.QueryAsync<CurriculumTopicRow>(@"
                SELECT s.name AS SubjectName, ct.grade AS Grade, ct.curriculum_type AS CurriculumType,
                       ct.unit_number AS UnitNumber, ct.unit_name AS UnitName,
                       ct.topic_number AS TopicNumber, ct.topic_name AS TopicName
                FROM curriculum_topics ct
                JOIN subjects s ON s.id = ct.subject_id
                WHERE ct.is_active = 1 AND (@Grade IS NULL OR ct.grade = @Grade)
                ORDER BY s.name, ct.sort_order", new { Grade = grade });

            return new CurriculumExportDto
            {
                FormatVersion = 1,
                CurriculumYear = year,
                Grade = grade,
                Instructions = "Bu JSON, Mentörüm müfredatını doldurmak için kullanılan şablondur. 'topics' dizisini gerçek MEB müfredatıyla doldurun (mevcut satırlar yalnızca örnektir). Her konu için alanlar: subject (ders adı — 'subjects' listesindeki ad), grade (sınıf: '1'..'12', 'TYT' veya 'AYT'), type ('NEW' = Maarif, 'OLD' = eski), unit (ünite no), unitName (ünite adı), topic (konu no, örn '1.1'), topicName (konu adı).",
                Subjects = subjects.Select(s => new CurriculumSubjectRefDto { Name = s.Name, ShortCode = s.ShortCode }).ToList(),
                Topics = rows.Select(r => new CurriculumTopicImportRow
                {
                    Subject = r.SubjectName,
                    Grade = r.Grade,
                    Type = r.CurriculumType,
                    Unit = r.UnitNumber,
                    UnitName = r.UnitName,
                    Topic = r.TopicNumber,
                    TopicName = r.TopicName
                }).ToList()
            };
        }

        /// <summary>
        /// Doldurulmuş müfredatı içe aktarır (upsert). Var olan konular güncellenir,
        /// olmayanlar eklenir; hiçbir konu silinmez (ödev bağlantıları korunur).
        /// </summary>
        public async Task<CurriculumImportResultDto> ImportAsync(CurriculumExportDto payload, string? overrideGrade = null)
        {
            var result = new CurriculumImportResultDto();
            using var conn = _connectionFactory.CreateConnection();
            conn.Open();
            using var tx = conn.BeginTransaction();

            Guid? yearId = null;
            var yearLabel = payload.CurriculumYear?.Trim();
            if (!string.IsNullOrWhiteSpace(yearLabel))
            {
                yearId = await conn.QuerySingleOrDefaultAsync<Guid?>(
                    "SELECT id FROM curriculum_years WHERE year_label = @Label",
                    new { Label = yearLabel }, tx);
                if (yearId == null)
                {
                    yearId = Guid.NewGuid();
                    await conn.ExecuteAsync(
                        "INSERT INTO curriculum_years (id, year_label, is_active) VALUES (@Id, @Label, 1)",
                        new { Id = yearId.Value, Label = yearLabel }, tx);
                }
            }
            yearId ??= await conn.QuerySingleOrDefaultAsync<Guid?>(
                "SELECT id FROM curriculum_years WHERE is_active = 1 ORDER BY created_at LIMIT 1", transaction: tx);
            if (yearId == null)
            {
                yearId = Guid.NewGuid();
                await conn.ExecuteAsync(
                    "INSERT INTO curriculum_years (id, year_label, is_active) VALUES (@Id, '2026-2027', 1)",
                    new { Id = yearId.Value }, tx);
            }

            var subjectRows = await conn.QueryAsync<SubjectKeyRow>(
                "SELECT id AS Id, name AS Name, short_code AS ShortCode FROM subjects", transaction: tx);
            var byName = new Dictionary<string, Guid>(StringComparer.OrdinalIgnoreCase);
            foreach (var s in subjectRows)
            {
                if (!string.IsNullOrWhiteSpace(s.Name)) byName[s.Name.Trim()] = s.Id;
                if (!string.IsNullOrWhiteSpace(s.ShortCode)) byName[s.ShortCode.Trim()] = s.Id;
            }

            var existingRows = await conn.QueryAsync<ExistingTopicRow>(@"
                SELECT id AS Id, subject_id AS SubjectId, grade AS Grade,
                       curriculum_type AS CurriculumType, unit_number AS UnitNumber, topic_number AS TopicNumber
                FROM curriculum_topics WHERE curriculum_year_id = @YearId",
                new { YearId = yearId.Value }, tx);
            var existingByKey = new Dictionary<string, Guid>(StringComparer.OrdinalIgnoreCase);
            foreach (var e in existingRows)
                existingByKey[Key(e.SubjectId, e.Grade, e.CurriculumType, e.UnitNumber ?? 0, e.TopicNumber)] = e.Id;

            var sortCounter = new Dictionary<Guid, int>();

            foreach (var t in payload.Topics ?? new List<CurriculumTopicImportRow>())
            {
                var subjectName = (t.Subject ?? "").Trim();
                if (subjectName.Length == 0 || !byName.TryGetValue(subjectName, out var subjectId))
                {
                    result.Skipped++;
                    if (result.Errors.Count < 20) result.Errors.Add($"Bilinmeyen ders: {t.Subject}");
                    continue;
                }
                if (string.IsNullOrWhiteSpace(t.TopicName))
                {
                    result.Skipped++;
                    if (result.Errors.Count < 20) result.Errors.Add($"Konu adı eksik: {subjectName}");
                    continue;
                }

                // Sınıf çözümü: 1) endpoint overrideGrade, 2) satır grade, 3) şablonun üst seviye grade alanı.
                var grade = !string.IsNullOrWhiteSpace(overrideGrade)
                    ? overrideGrade.Trim()
                    : !string.IsNullOrWhiteSpace(t.Grade)
                        ? t.Grade.Trim()
                        : (payload.Grade ?? "").Trim();
                if (grade.Length == 0)
                {
                    result.Skipped++;
                    if (result.Errors.Count < 20) result.Errors.Add($"Seviye eksik: {subjectName} - {t.TopicName}");
                    continue;
                }

                var type = string.Equals(t.Type?.Trim(), "OLD", StringComparison.OrdinalIgnoreCase) ? "OLD" : "NEW";
                var unit = (t.Unit ?? 0) > 0 ? t.Unit.Value : 1;
                var topicNo = string.IsNullOrWhiteSpace(t.Topic) ? $"{unit}.1" : t.Topic.Trim();

                sortCounter.TryGetValue(subjectId, out var seq);
                seq += 1;
                sortCounter[subjectId] = seq;

                var key = Key(subjectId, grade, type, unit, topicNo);
                if (existingByKey.TryGetValue(key, out var existingId))
                {
                    await conn.ExecuteAsync(@"
                        UPDATE curriculum_topics
                        SET unit_name = @UnitName, topic_name = @TopicName, is_active = 1, sort_order = @SortOrder
                        WHERE id = @Id",
                        new { Id = existingId, UnitName = t.UnitName, TopicName = t.TopicName, SortOrder = seq }, tx);
                    result.Updated++;
                }
                else
                {
                    var newId = Guid.NewGuid();
                    await conn.ExecuteAsync(@"
                        INSERT INTO curriculum_topics (id, curriculum_year_id, subject_id, grade, curriculum_type, unit_number, unit_name, topic_number, topic_name, is_active, sort_order)
                        VALUES (@Id, @YearId, @SubjectId, @Grade, @Type, @Unit, @UnitName, @TopicNo, @TopicName, 1, @SortOrder)",
                        new { Id = newId, YearId = yearId.Value, SubjectId = subjectId, Grade = grade, Type = type, Unit = unit, UnitName = t.UnitName, TopicNo = topicNo, TopicName = t.TopicName, SortOrder = seq }, tx);
                    existingByKey[key] = newId;
                    result.Inserted++;
                }
            }

            tx.Commit();
            return result;
        }

        private static string Key(Guid subjectId, string grade, string type, int unit, string topic)
            => $"{subjectId}|{grade.ToUpperInvariant()}|{type}|{unit}|{topic.ToUpperInvariant()}";

        private sealed class CurriculumTopicRow
        {
            public string SubjectName { get; set; } = "";
            public string Grade { get; set; } = "";
            public string CurriculumType { get; set; } = "";
            public int? UnitNumber { get; set; }
            public string UnitName { get; set; } = "";
            public string TopicNumber { get; set; } = "";
            public string TopicName { get; set; } = "";
        }

        private sealed class SubjectKeyRow
        {
            public Guid Id { get; set; }
            public string Name { get; set; } = "";
            public string ShortCode { get; set; } = "";
        }

        private sealed class ExistingTopicRow
        {
            public Guid Id { get; set; }
            public Guid SubjectId { get; set; }
            public string Grade { get; set; } = "";
            public string CurriculumType { get; set; } = "";
            public int? UnitNumber { get; set; }
            public string TopicNumber { get; set; } = "";
        }
    }
}
