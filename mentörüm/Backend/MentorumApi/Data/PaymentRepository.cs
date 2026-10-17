using Dapper;
using System.Text.Json;
using MentorumApi.DTOs;
using MentorumApi.Services;

namespace MentorumApi.Data
{
    public class PaymentRepository : BaseRepository
    {
        private readonly PaymentPlanService _planService;

        public PaymentRepository(DbConnectionFactory connectionFactory, PaymentPlanService planService) 
            : base(connectionFactory)
        {
            _planService = planService;
        }

        public async Task<Guid> CreatePlanAsync(Guid programId, Guid coachId, CreatePaymentPlanRequest req)
        {
            using var conn = _connectionFactory.CreateConnection();
            conn.Open();
            using var tx = conn.BeginTransaction();
            try
            {
                // Koçun bu programa yetkisini doğrula
                var isCoach = await conn.ExecuteScalarAsync<int?>(@"
                    SELECT 1 FROM program_coaches WHERE program_id = @ProgramId AND coach_id = @CoachId",
                    new { ProgramId = programId, CoachId = coachId }, tx);

                if (isCoach == null) throw new UnauthorizedAccessException("Bu programa yetkiniz yok.");

                var planId = Guid.NewGuid();
                var planSql = @"
                    INSERT INTO payment_plans (
                        id, program_id, student_id, parent_id, period_type,
                        amount, currency, month_day, start_date, is_active, created_by, created_at
                    ) VALUES (
                        @Id, @ProgramId, @StudentId, @ParentId, @PeriodType,
                        @Amount, @Currency, @MonthDay, @StartDate, 1, @CoachId, NOW()
                    )";

                await conn.ExecuteAsync(planSql, new
                {
                    Id = planId,
                    ProgramId = programId,
                    req.StudentId,
                    req.ParentId,
                    req.PeriodType,
                    req.Amount,
                    Currency = string.IsNullOrWhiteSpace(req.Currency) ? "TRY" : req.Currency,
                    req.MonthDay,
                    req.StartDate,
                    CoachId = coachId
                }, tx);

                // İlk taksitleri/kalemleri üret
                var initialItems = _planService.GenerateInitialItems(
                    req.PeriodType, req.Amount, req.Currency, req.StartDate, req.MonthDay, 3);

                var itemSql = @"
                    INSERT INTO payment_items (
                        id, plan_id, due_date, base_amount, paid_amount, status, currency, created_at
                    ) VALUES (
                        @Id, @PlanId, @DueDate, @BaseAmount, 0, 'PENDING', @Currency, NOW()
                    )";

                foreach (var it in initialItems)
                {
                    await conn.ExecuteAsync(itemSql, new
                    {
                        Id = Guid.NewGuid(),
                        PlanId = planId,
                        DueDate = it.DueDate,
                        BaseAmount = it.BaseAmount,
                        Currency = it.Currency
                    }, tx);
                }

                tx.Commit();
                return planId;
            }
            catch
            {
                tx.Rollback();
                throw;
            }
        }

        public async Task<IEnumerable<PaymentPlanDto>> GetPlansAsync(Guid programId, Guid coachId)
        {
            using var conn = _connectionFactory.CreateConnection();
            var plansSql = @"
                SELECT 
                    pp.id AS Id,
                    pp.program_id AS ProgramId,
                    pp.student_id AS StudentId,
                    u_s.full_name AS StudentName,
                    pp.parent_id AS ParentId,
                    u_p.full_name AS ParentName,
                    pp.period_type AS PeriodType,
                    pp.amount AS Amount,
                    pp.currency AS Currency,
                    pp.month_day AS MonthDay,
                    pp.start_date AS StartDate,
                    pp.is_active AS IsActive
                FROM payment_plans pp
                JOIN users u_s ON u_s.id = pp.student_id
                LEFT JOIN users u_p ON u_p.id = pp.parent_id
                WHERE pp.program_id = @ProgramId
                  AND pp.is_active = 1
                  AND pp.program_id IN (SELECT program_id FROM program_coaches WHERE coach_id = @CoachId)
                ORDER BY pp.created_at DESC";

            var plans = (await conn.QueryAsync<PaymentPlanDto>(plansSql, new { ProgramId = programId, CoachId = coachId })).ToList();
            if (!plans.Any()) return plans;

            var planIds = plans.Select(p => p.Id).ToList();
            var itemsSql = @"
                SELECT 
                    pi.id AS Id,
                    pi.plan_id AS PlanId,
                    pi.due_date AS DueDate,
                    pi.base_amount AS BaseAmount,
                    pi.paid_amount AS PaidAmount,
                    pi.status AS Status,
                    pi.currency AS Currency,
                    pi.paid_at AS PaidAt,
                    pi.rolled_from_item_id AS RolledFromItemId,
                    pi.notes AS Notes
                FROM payment_items pi
                WHERE pi.plan_id = ANY(@PlanIds)
                ORDER BY pi.due_date ASC";

            var items = (await conn.QueryAsync<PaymentItemDto>(itemsSql, new { PlanIds = planIds.ToArray() })).ToList();

            foreach (var plan in plans)
            {
                plan.Items = items.Where(i => i.PlanId == plan.Id).ToList();
            }

            return plans;
        }

        public async Task<bool> UpdatePlanAsync(Guid programId, Guid planId, Guid coachId, UpdatePaymentPlanRequest req)
        {
            using var conn = _connectionFactory.CreateConnection();
            var sql = @"
                UPDATE payment_plans SET
                    amount = COALESCE(@Amount, amount),
                    currency = COALESCE(@Currency, currency),
                    month_day = COALESCE(@MonthDay, month_day),
                    is_active = COALESCE(@IsActive, is_active)
                WHERE id = @PlanId 
                  AND program_id = @ProgramId
                  AND program_id IN (SELECT program_id FROM program_coaches WHERE coach_id = @CoachId)";

            var rows = await conn.ExecuteAsync(sql, new
            {
                PlanId = planId,
                ProgramId = programId,
                CoachId = coachId,
                req.Amount,
                req.Currency,
                req.MonthDay,
                IsActive = req.IsActive.HasValue ? (req.IsActive.Value ? 1 : 0) : (int?)null
            });

            return rows > 0;
        }

        public async Task<bool> DeletePlanAsync(Guid programId, Guid planId, Guid coachId)
        {
            using var conn = _connectionFactory.CreateConnection();
            var sql = @"
                UPDATE payment_plans SET is_active = 0 
                WHERE id = @PlanId 
                  AND program_id = @ProgramId
                  AND program_id IN (SELECT program_id FROM program_coaches WHERE coach_id = @CoachId)";

            var rows = await conn.ExecuteAsync(sql, new { PlanId = planId, ProgramId = programId, CoachId = coachId });
            return rows > 0;
        }

        public async Task<bool> CollectPaymentAsync(Guid itemId, Guid coachId, CollectPaymentRequest req)
        {
            using var conn = _connectionFactory.CreateConnection();
            conn.Open();
            using var tx = conn.BeginTransaction();
            try
            {
                var item = await conn.QuerySingleOrDefaultAsync<dynamic>(@"
                    SELECT pi.id, pi.plan_id, pi.due_date, pi.base_amount, pi.paid_amount, pi.status, pi.currency, pp.program_id
                    FROM payment_items pi
                    JOIN payment_plans pp ON pp.id = pi.plan_id
                    JOIN program_coaches pc ON pc.program_id = pp.program_id
                    WHERE pi.id = @ItemId AND pc.coach_id = @CoachId
                    FOR UPDATE",
                    new { ItemId = itemId, CoachId = coachId }, tx);

                if (item == null) throw new UnauthorizedAccessException("Ödeme kalemi bulunamadı veya yetkiniz yok.");

                decimal currentPaid = (decimal)item.paid_amount;
                decimal baseAmount = (decimal)item.base_amount;
                decimal newPaid = currentPaid + req.Amount;

                // 1. payments kaydı
                await conn.ExecuteAsync(@"
                    INSERT INTO payments (id, item_id, amount, method, recorded_by, paid_at, status, receipt_url, created_at)
                    VALUES (gen_random_uuid(), @ItemId, @Amount, @Method, @CoachId, NOW(), 'PAID', @ReceiptUrl, NOW())",
                    new { ItemId = itemId, req.Amount, req.Method, CoachId = coachId, req.ReceiptUrl }, tx);

                // 2. Durum ve Rollover (T27)
                if (newPaid >= baseAmount)
                {
                    await conn.ExecuteAsync(@"
                        UPDATE payment_items 
                        SET paid_amount = @NewPaid, status = 'PAID', paid_at = NOW() 
                        WHERE id = @ItemId",
                        new { NewPaid = newPaid, ItemId = itemId }, tx);
                }
                else
                {
                    // Kısmi ödeme (PARTIAL)
                    decimal remaining = baseAmount - newPaid;

                    await conn.ExecuteAsync(@"
                        UPDATE payment_items 
                        SET paid_amount = @NewPaid, status = 'PARTIAL' 
                        WHERE id = @ItemId",
                        new { NewPaid = newPaid, ItemId = itemId }, tx);

                    // Sıradaki PENDING kaleme bakiye devri
                    var nextPending = await conn.QuerySingleOrDefaultAsync<Guid?>(@"
                        SELECT id FROM payment_items 
                        WHERE plan_id = @PlanId AND status = 'PENDING' AND id <> @ItemId
                        ORDER BY due_date ASC LIMIT 1",
                        new { PlanId = (Guid)item.plan_id }, tx);

                    if (nextPending.HasValue)
                    {
                        await conn.ExecuteAsync(@"
                            UPDATE payment_items 
                            SET base_amount = base_amount + @Remaining, rolled_from_item_id = @ItemId
                            WHERE id = @NextId",
                            new { Remaining = remaining, ItemId = itemId, NextId = nextPending.Value }, tx);
                    }
                }

                tx.Commit();
                return true;
            }
            catch
            {
                tx.Rollback();
                throw;
            }
        }

        public async Task<IEnumerable<PaymentItemDto>> GetStudentPaymentsForParentAsync(Guid studentId, Guid parentId)
        {
            using var conn = _connectionFactory.CreateConnection();
            var canView = await conn.ExecuteScalarAsync<int?>(@"
                SELECT 1 FROM student_parents 
                WHERE student_id = @StudentId AND parent_id = @ParentId AND is_accepted = 1 AND can_view_payments = 1",
                new { StudentId = studentId, ParentId = parentId });

            if (canView == null) throw new UnauthorizedAccessException("Bu öğrencinin finans bilgilerini görme yetkiniz yok.");

            var sql = @"
                SELECT 
                    pi.id AS Id,
                    pi.plan_id AS PlanId,
                    pi.due_date AS DueDate,
                    pi.base_amount AS BaseAmount,
                    pi.paid_amount AS PaidAmount,
                    pi.status AS Status,
                    pi.currency AS Currency,
                    pi.paid_at AS PaidAt,
                    pi.rolled_from_item_id AS RolledFromItemId,
                    pi.notes AS Notes
                FROM payment_items pi
                JOIN payment_plans pp ON pp.id = pi.plan_id
                WHERE pp.student_id = @StudentId AND pp.is_active = 1
                ORDER BY pi.due_date ASC";

            return await conn.QueryAsync<PaymentItemDto>(sql, new { StudentId = studentId });
        }

        public async Task<Guid> CreatePaymentClaimAsync(Guid studentId, Guid parentId, CreatePaymentClaimRequest req)
        {
            using var conn = _connectionFactory.CreateConnection();
            conn.Open();
            using var tx = conn.BeginTransaction();
            try
            {
                var canView = await conn.ExecuteScalarAsync<int?>(@"
                    SELECT 1 FROM student_parents 
                    WHERE student_id = @StudentId AND parent_id = @ParentId AND is_accepted = 1 AND can_view_payments = 1",
                    new { StudentId = studentId, ParentId = parentId }, tx);

                if (canView == null) throw new UnauthorizedAccessException("Bu öğrenci için ödeme bildirimi yapma yetkiniz yok.");

                var plan = await conn.QuerySingleOrDefaultAsync<dynamic>(@"
                    SELECT pp.program_id, pi.base_amount, pi.paid_amount 
                    FROM payment_items pi 
                    JOIN payment_plans pp ON pp.id = pi.plan_id 
                    WHERE pi.id = @ItemId AND pp.student_id = @StudentId",
                    new { req.ItemId, StudentId = studentId }, tx);

                if (plan == null) throw new InvalidOperationException("Ödeme kalemi bulunamadı.");

                var claimPayload = JsonSerializer.Serialize(new
                {
                    ItemId = req.ItemId,
                    StudentId = studentId,
                    ParentId = parentId,
                    Amount = req.Amount ?? ((decimal)plan.base_amount - (decimal)plan.paid_amount),
                    Notes = req.Notes,
                    ReceiptUrl = req.ReceiptUrl
                });

                var approvalId = Guid.NewGuid();
                var sql = @"
                    INSERT INTO approval_items (id, program_id, entity_type, entity_id, payload, status, created_by, created_at)
                    VALUES (@Id, @ProgramId, 'PAYMENT_CLAIM', @EntityId, @Payload::jsonb, 'PENDING', @CreatedBy, NOW())
                    ON CONFLICT (entity_type, entity_id) DO UPDATE
                    SET payload = EXCLUDED.payload, status = 'PENDING', created_at = NOW()
                    RETURNING id";

                var id = await conn.ExecuteScalarAsync<Guid>(sql, new
                {
                    Id = approvalId,
                    ProgramId = (Guid)plan.program_id,
                    EntityId = req.ItemId,
                    Payload = claimPayload,
                    CreatedBy = parentId
                }, tx);

                tx.Commit();
                return id;
            }
            catch
            {
                tx.Rollback();
                throw;
            }
        }
    }
}
