using System.Collections.Generic;
using System.Data;
using System.Threading.Tasks;
using PlanlamaApp.Application.Interfaces;
using PlanlamaApp.Domain.Entities;

namespace PlanlamaApp.Infrastructure.Repositories
{
    public class ExamRepository : BaseRepository, IExamRepository
    {
        public ExamRepository(IDbConnection dbConnection, ITenantProvider tenantProvider) 
            : base(dbConnection, tenantProvider)
        {
        }

        public async Task<ExamRecord?> GetByIdAsync(int id)
        {
            var sql = "SELECT * FROM ExamRecords WHERE Id = @id LIMIT 1";
            return await QueryFirstOrDefaultAsync<ExamRecord>(sql, new { id });
        }

        public async Task<IEnumerable<ExamRecord>> GetByStudentAsync(string studentId, string? examType, int? limit)
        {
            var sql = "SELECT * FROM ExamRecords WHERE StudentId = @studentId ";
            if (!string.IsNullOrEmpty(examType))
            {
                sql += " AND ExamType = @examType ";
            }
            sql += " ORDER BY ExamDate DESC ";
            if (limit.HasValue)
            {
                sql += " LIMIT @limit ";
            }
            return await QueryAsync<ExamRecord>(sql, new { studentId, examType, limit });
        }

        public async Task<int> CreateAsync(ExamRecord exam)
        {
            var sql = @"
                INSERT INTO ExamRecords 
                (TenantId, StudentId, CoachUserId, WorkspaceId, ExamType, ExamName, ExamDate, TotalNet, TotalCorrect, TotalWrong, TotalEmpty, Notes, CreatedAt)
                VALUES 
                (@TenantId, @StudentId, @CoachUserId, @WorkspaceId, @ExamType, @ExamName, @ExamDate, @TotalNet, @TotalCorrect, @TotalWrong, @TotalEmpty, @Notes, @CreatedAt)
                RETURNING Id;
            ";
            exam.TenantId = _tenantId;
            return await ExecuteScalarAsync<int>(sql, exam);
        }

        public async Task<bool> UpdateAsync(ExamRecord exam)
        {
            var sql = @"
                UPDATE ExamRecords SET
                    ExamType = @ExamType,
                    ExamName = @ExamName,
                    ExamDate = @ExamDate,
                    TotalNet = @TotalNet,
                    TotalCorrect = @TotalCorrect,
                    TotalWrong = @TotalWrong,
                    TotalEmpty = @TotalEmpty,
                    Notes = @Notes
                WHERE Id = @Id;
            ";
            var affected = await ExecuteAsync(sql, exam);
            return affected > 0;
        }

        public async Task<bool> DeleteAsync(int id)
        {
            var sql = "DELETE FROM ExamRecords WHERE Id = @id";
            var affected = await ExecuteAsync(sql, new { id });
            return affected > 0;
        }

        public async Task<IEnumerable<ExamSubjectResult>> GetSubjectResultsAsync(int examRecordId)
        {
            var sql = "SELECT * FROM ExamSubjectResults WHERE ExamRecordId = @examRecordId";
            return await QueryAsync<ExamSubjectResult>(sql, new { examRecordId });
        }

        public async Task<int> AddSubjectResultAsync(ExamSubjectResult result)
        {
            var sql = @"
                INSERT INTO ExamSubjectResults 
                (TenantId, ExamRecordId, CategoryId, SubjectName, Correct, Wrong, Empty, Net, QuestionCount)
                VALUES 
                (@TenantId, @ExamRecordId, @CategoryId, @SubjectName, @Correct, @Wrong, @Empty, @Net, @QuestionCount)
                RETURNING Id;
            ";
            result.TenantId = _tenantId;
            return await ExecuteScalarAsync<int>(sql, result);
        }

        public async Task<bool> UpdateSubjectResultAsync(ExamSubjectResult result)
        {
            var sql = @"
                UPDATE ExamSubjectResults SET
                    SubjectName = @SubjectName,
                    Correct = @Correct,
                    Wrong = @Wrong,
                    Empty = @Empty,
                    Net = @Net,
                    QuestionCount = @QuestionCount
                WHERE Id = @Id;
            ";
            var affected = await ExecuteAsync(sql, result);
            return affected > 0;
        }

        public async Task<bool> DeleteSubjectResultsAsync(int examRecordId)
        {
            var sql = "DELETE FROM ExamSubjectResults WHERE ExamRecordId = @examRecordId";
            var affected = await ExecuteAsync(sql, new { examRecordId });
            return affected > 0;
        }
    }
}
