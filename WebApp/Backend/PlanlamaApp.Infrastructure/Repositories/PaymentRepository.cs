using System.Collections.Generic;
using System.Data;
using System.Threading.Tasks;
using PlanlamaApp.Application.Interfaces;
using PlanlamaApp.Domain.Entities;

namespace PlanlamaApp.Infrastructure.Repositories
{
    public class PaymentRepository : BaseRepository, IPaymentRepository
    {
        public PaymentRepository(IDbConnection dbConnection, ITenantProvider tenantProvider) 
            : base(dbConnection, tenantProvider)
        {
        }

        public async Task<PaymentRecord?> GetByIdAsync(int id)
        {
            var sql = "SELECT * FROM PaymentRecords WHERE Id = @id LIMIT 1";
            return await QueryFirstOrDefaultAsync<PaymentRecord>(sql, new { id });
        }

        public async Task<IEnumerable<PaymentRecord>> GetByCoachAsync(string coachUserId, string? status)
        {
            var sql = "SELECT * FROM PaymentRecords WHERE CoachUserId = @coachUserId ";
            if (!string.IsNullOrEmpty(status))
            {
                sql += " AND Status = @status ";
            }
            sql += " ORDER BY DueDate ASC ";
            return await QueryAsync<PaymentRecord>(sql, new { coachUserId, status });
        }

        public async Task<IEnumerable<PaymentRecord>> GetByStudentAsync(string studentId)
        {
            var sql = "SELECT * FROM PaymentRecords WHERE StudentId = @studentId ORDER BY DueDate DESC";
            return await QueryAsync<PaymentRecord>(sql, new { studentId });
        }

        public async Task<int> CreateAsync(PaymentRecord payment)
        {
            var sql = @"
                INSERT INTO PaymentRecords 
                (TenantId, CoachUserId, StudentId, WorkspaceId, Amount, Currency, PaymentType, Status, DueDate, PaidDate, PaymentMethod, Notes, CreatedAt)
                VALUES 
                (@TenantId, @CoachUserId, @StudentId, @WorkspaceId, @Amount, @Currency, @PaymentType, @Status, @DueDate, @PaidDate, @PaymentMethod, @Notes, @CreatedAt)
                RETURNING Id;
            ";
            payment.TenantId = _tenantId;
            return await ExecuteScalarAsync<int>(sql, payment);
        }

        public async Task<bool> UpdateAsync(PaymentRecord payment)
        {
            var sql = @"
                UPDATE PaymentRecords SET
                    Amount = @Amount,
                    Currency = @Currency,
                    PaymentType = @PaymentType,
                    Status = @Status,
                    DueDate = @DueDate,
                    PaidDate = @PaidDate,
                    PaymentMethod = @PaymentMethod,
                    Notes = @Notes
                WHERE Id = @Id;
            ";
            var affected = await ExecuteAsync(sql, payment);
            return affected > 0;
        }

        public async Task<bool> DeleteAsync(int id)
        {
            var sql = "DELETE FROM PaymentRecords WHERE Id = @id";
            var affected = await ExecuteAsync(sql, new { id });
            return affected > 0;
        }
    }
}
