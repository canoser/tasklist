using System.Collections.Generic;
using System.Data;
using System.Threading.Tasks;
using PlanlamaApp.Application.Interfaces;
using PlanlamaApp.Domain.Entities;

namespace PlanlamaApp.Infrastructure.Repositories
{
    public class StudentResourceRepository : BaseRepository, IStudentResourceRepository
    {
        public StudentResourceRepository(IDbConnection dbConnection, ITenantProvider tenantProvider) 
            : base(dbConnection, tenantProvider)
        {
        }

        public async Task<StudentResource?> GetByIdAsync(int id)
        {
            var sql = "SELECT * FROM StudentResources WHERE Id = @id LIMIT 1";
            return await QueryFirstOrDefaultAsync<StudentResource>(sql, new { id });
        }

        public async Task<IEnumerable<StudentResource>> GetByStudentAsync(string studentId)
        {
            var sql = "SELECT * FROM StudentResources WHERE StudentId = @studentId ORDER BY Name ASC";
            return await QueryAsync<StudentResource>(sql, new { studentId });
        }

        public async Task<int> CreateAsync(StudentResource resource)
        {
            var sql = @"
                INSERT INTO StudentResources 
                (TenantId, StudentId, CoachUserId, Name, Url, CreatedAt)
                VALUES 
                (@TenantId, @StudentId, @CoachUserId, @Name, @Url, @CreatedAt)
                RETURNING Id;
            ";
            resource.TenantId = _tenantId;
            return await ExecuteScalarAsync<int>(sql, resource);
        }

        public async Task<bool> DeleteAsync(int id)
        {
            var sql = "DELETE FROM StudentResources WHERE Id = @id";
            var affected = await ExecuteAsync(sql, new { id });
            return affected > 0;
        }
    }
}
