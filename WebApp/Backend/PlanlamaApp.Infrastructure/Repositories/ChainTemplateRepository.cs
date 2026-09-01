using Dapper;
using PlanlamaApp.Application.Interfaces;
using PlanlamaApp.Domain.Entities;
using System;
using System.Collections.Generic;
using System.Data;
using System.Threading.Tasks;

namespace PlanlamaApp.Infrastructure.Repositories
{
    public class ChainTemplateRepository : BaseRepository, IChainTemplateRepository
    {
        public ChainTemplateRepository(IDbConnection dbConnection, ITenantProvider tenantProvider) 
            : base(dbConnection, tenantProvider)
        {
        }

        public async Task<IEnumerable<ChainTemplate>> GetByUserIdAsync(string userId)
        {
            var sql = "SELECT * FROM ChainTemplates WHERE UserId = @UserId ORDER BY CreatedAt DESC";
            return await QueryAsync<ChainTemplate>(sql, new { UserId = userId });
        }

        public async Task<ChainTemplate?> GetByIdAsync(int id)
        {
            var sql = "SELECT * FROM ChainTemplates WHERE Id = @Id";
            return await QueryFirstOrDefaultAsync<ChainTemplate>(sql, new { Id = id });
        }

        public async Task<int> CreateAsync(ChainTemplate template, IDbTransaction? transaction = null)
        {
            var sql = @"INSERT INTO ChainTemplates 
                        (TenantId, UserId, Title, Description, TaskType, TargetCount, CategoryId, 
                         RecurrenceType, DaysOfWeek, CustomDates, StartDate, EndDate, 
                         LastGeneratedDate, CreatedAt, UpdatedAt)
                        VALUES 
                        (@TenantId, @UserId, @Title, @Description, @TaskType, @TargetCount, @CategoryId,
                         @RecurrenceType, @DaysOfWeek, @CustomDates, @StartDate, @EndDate,
                         @LastGeneratedDate, @CreatedAt, @UpdatedAt)
                        RETURNING Id;";
            
            return await QueryFirstOrDefaultAsync<int>(sql, template, transaction);
        }

        public async Task<bool> UpdateAsync(ChainTemplate template, IDbTransaction? transaction = null)
        {
            var sql = @"UPDATE ChainTemplates SET 
                        Title = @Title,
                        Description = @Description,
                        TaskType = @TaskType,
                        TargetCount = @TargetCount,
                        CategoryId = @CategoryId,
                        RecurrenceType = @RecurrenceType,
                        DaysOfWeek = @DaysOfWeek,
                        CustomDates = @CustomDates,
                        StartDate = @StartDate,
                        EndDate = @EndDate,
                        LastGeneratedDate = @LastGeneratedDate,
                        UpdatedAt = @UpdatedAt
                        WHERE Id = @Id;";
            
            var affected = await ExecuteAsync(sql, template, transaction);
            return affected > 0;
        }

        public async Task<bool> DeleteAsync(int id, IDbTransaction? transaction = null)
        {
            var sql = "DELETE FROM ChainTemplates WHERE Id = @Id;";
            var affected = await ExecuteAsync(sql, new { Id = id }, transaction);
            return affected > 0;
        }
    }
}
