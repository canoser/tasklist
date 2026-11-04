using Dapper;
using MentorumApi.DTOs;

namespace MentorumApi.Data
{
    public class ApprovalRepository : BaseRepository
    {
        public ApprovalRepository(DbConnectionFactory connectionFactory) : base(connectionFactory) { }

        public Task<IEnumerable<ApprovalItemDto>> ListAsync(Guid programId, string? status = null)
            => ListCoreAsync(programId, null, status);

        public Task<IEnumerable<ApprovalItemDto>> ListForCoachAsync(Guid coachId, string? status = null)
            => ListCoreAsync(null, coachId, status);

        private async Task<IEnumerable<ApprovalItemDto>> ListCoreAsync(Guid? programId, Guid? coachId, string? status)
        {
            using var conn = _connectionFactory.CreateConnection();
            var whereClause = programId.HasValue
                ? "program_id = @ProgramId"
                : "program_id IN (SELECT program_id FROM program_coaches WHERE coach_id = @CoachId)";

            var sql = $@"
                SELECT
                    id,
                    program_id AS ProgramId,
                    entity_type AS EntityType,
                    entity_id AS EntityId,
                    payload::text AS Payload,
                    status AS Status,
                    created_by AS CreatedBy,
                    created_at AS CreatedAt,
                    resolved_at AS ResolvedAt,
                    resolved_by AS ResolvedBy,
                    rejection_reason AS RejectionReason
                FROM approval_items
                WHERE {whereClause}";

            if (!string.IsNullOrWhiteSpace(status))
            {
                sql += " AND status = @Status";
            }
            sql += " ORDER BY created_at DESC";

            return await conn.QueryAsync<ApprovalItemDto>(sql, new { ProgramId = programId, CoachId = coachId, Status = status });
        }

        public async Task<Guid> CreateAsync(Guid programId, string entityType, Guid entityId, string payload, Guid createdBy)
        {
            using var conn = _connectionFactory.CreateConnection();
            var id = Guid.NewGuid();
            await conn.ExecuteAsync(@"
                INSERT INTO approval_items (id, program_id, entity_type, entity_id, payload, status, created_by, created_at)
                VALUES (@Id, @ProgramId, @EntityType, @EntityId, @Payload::jsonb, 'PENDING', @CreatedBy, NOW())",
                new { Id = id, ProgramId = programId, EntityType = entityType, EntityId = entityId, Payload = payload, CreatedBy = createdBy });
            return id;
        }

        public async Task<bool> ApproveAsync(Guid id, Guid coachId)
        {
            using var conn = _connectionFactory.CreateConnection();
            conn.Open();
            using var tx = conn.BeginTransaction();
            try
            {
                var item = await conn.QuerySingleOrDefaultAsync<ApprovalItemLockRow>(@"
                    SELECT a.id AS Id,
                           a.program_id AS ProgramId,
                           a.entity_type AS EntityType,
                           a.entity_id AS EntityId,
                           a.created_by AS CreatedBy,
                           a.status AS Status,
                           a.payload::text AS Payload
                    FROM approval_items a
                    JOIN program_coaches pc ON pc.program_id = a.program_id
                    WHERE a.id = @Id AND pc.coach_id = @CoachId
                    FOR UPDATE",
                    new { Id = id, CoachId = coachId }, tx);

                if (item == null)
                    throw new UnauthorizedAccessException("Onay öğesi bulunamadı veya bu koça ait değil.");

                if (item.Status != "PENDING")
                    throw new InvalidOperationException("Bu talep zaten sonuçlandırılmış.");

                // T29: Eğer PAYMENT_CLAIM ise ödeme tablosunu güncelle
                if (item.EntityType == "PAYMENT_CLAIM")
                {
                    try
                    {
                        using var doc = System.Text.Json.JsonDocument.Parse(item.Payload);
                        var root = doc.RootElement;
                        Guid targetItemId = item.EntityId;
                        decimal claimAmount = 0m;
                        if ((root.TryGetProperty("amount", out var amtProp) || root.TryGetProperty("Amount", out amtProp))
                            && amtProp.ValueKind == System.Text.Json.JsonValueKind.Number)
                        {
                            claimAmount = amtProp.GetDecimal();
                        }
                        string? receiptUrl = (root.TryGetProperty("receiptUrl", out var rUrlProp) || root.TryGetProperty("ReceiptUrl", out rUrlProp))
                            && rUrlProp.ValueKind == System.Text.Json.JsonValueKind.String
                            ? rUrlProp.GetString()
                            : null;

                        var pItem = await conn.QuerySingleOrDefaultAsync<ApprovalPaymentItemRow>(@"
                            SELECT id AS Id, plan_id AS PlanId, base_amount AS BaseAmount, paid_amount AS PaidAmount 
                            FROM payment_items WHERE id = @ItemId FOR UPDATE",
                            new { ItemId = targetItemId }, tx);

                        if (pItem != null)
                        {
                            decimal curPaid = pItem.PaidAmount;
                            decimal baseAmt = pItem.BaseAmount;
                            decimal addAmt = claimAmount > 0 ? claimAmount : (baseAmt - curPaid);
                            decimal newPaid = curPaid + addAmt;

                            await conn.ExecuteAsync(@"
                                INSERT INTO payments (id, item_id, amount, method, recorded_by, paid_at, status, receipt_url, created_at)
                                VALUES (gen_random_uuid(), @ItemId, @Amount, 'VELI_BILDIRIMI_ONAYLANDI', @CoachId, NOW(), 'PAID', @ReceiptUrl, NOW())",
                                new { ItemId = targetItemId, Amount = addAmt, CoachId = coachId, ReceiptUrl = receiptUrl }, tx);

                            if (newPaid >= baseAmt)
                            {
                                await conn.ExecuteAsync(@"
                                    UPDATE payment_items SET paid_amount = @NewPaid, status = 'PAID', paid_at = NOW() WHERE id = @ItemId",
                                    new { NewPaid = newPaid, ItemId = targetItemId }, tx);
                            }
                            else
                            {
                                decimal remaining = baseAmt - newPaid;
                                var nextPending = await conn.QuerySingleOrDefaultAsync<Guid?>(@"
                                    SELECT id FROM payment_items 
                                    WHERE plan_id = @PlanId AND status = 'PENDING' AND id <> @ItemId
                                    ORDER BY due_date ASC LIMIT 1",
                                    new { PlanId = pItem.PlanId, ItemId = targetItemId }, tx);

                                if (nextPending.HasValue)
                                {
                                    await conn.ExecuteAsync(@"
                                        UPDATE payment_items
                                        SET base_amount = @NewPaid, paid_amount = @NewPaid, status = 'PAID', paid_at = NOW()
                                        WHERE id = @ItemId",
                                        new { NewPaid = newPaid, ItemId = targetItemId }, tx);

                                    await conn.ExecuteAsync(@"
                                        UPDATE payment_items
                                        SET base_amount = base_amount + @Remaining, rolled_from_item_id = @ItemId
                                        WHERE id = @NextId",
                                        new { Remaining = remaining, ItemId = targetItemId, NextId = nextPending.Value }, tx);
                                }
                                else
                                {
                                    await conn.ExecuteAsync(@"
                                        UPDATE payment_items SET paid_amount = @NewPaid, status = 'PARTIAL' WHERE id = @ItemId",
                                        new { NewPaid = newPaid, ItemId = targetItemId }, tx);
                                }
                            }
                        }
                    }
                    catch
                    {
                        // JSON parsing hatasında onaylama engellenmez
                    }
                }

                // V10 T04: HOMEWORK_EXTENSION onayı → ödev teslim tarihini uzat
                if (item.EntityType == "HOMEWORK_EXTENSION")
                {
                    try
                    {
                        using var doc = System.Text.Json.JsonDocument.Parse(item.Payload);
                        var root = doc.RootElement;
                        Guid assignmentId = item.EntityId;
                        DateTime? requestedDueDate = null;
                        if (root.TryGetProperty("requestedDueDate", out var dueProp) && dueProp.ValueKind == System.Text.Json.JsonValueKind.String)
                        {
                            if (DateTime.TryParse(dueProp.GetString(), out var parsed))
                                requestedDueDate = parsed;
                        }

                        DateTime newDate;
                        if (requestedDueDate.HasValue)
                        {
                            newDate = requestedDueDate.Value;
                        }
                        else
                        {
                            var currentDue = await conn.QuerySingleOrDefaultAsync<DateTime?>(
                                "SELECT due_date FROM homework_assignments WHERE id = @AssignmentId",
                                new { AssignmentId = assignmentId }, tx);
                            var baseDate = (currentDue.HasValue && currentDue.Value > DateTime.UtcNow.Date) ? currentDue.Value : DateTime.UtcNow.Date;
                            newDate = baseDate.AddDays(3);
                        }

                        await conn.ExecuteAsync(@"
                            UPDATE homework_assignments
                            SET due_date = @NewDate::date,
                                status = CASE WHEN status = 'OVERDUE' THEN 'PENDING' ELSE status END
                            WHERE id = @AssignmentId",
                            new { NewDate = newDate, AssignmentId = assignmentId }, tx);
                    }
                    catch
                    {
                        // JSON parsing hatasında onaylama engellenmez
                    }
                }

                await conn.ExecuteAsync(@"
                    UPDATE approval_items
                    SET status = 'APPROVED', resolved_at = NOW(), resolved_by = @CoachId
                    WHERE id = @Id",
                    new { Id = id, CoachId = coachId }, tx);

                await conn.ExecuteAsync(@"
                    INSERT INTO notifications (id, user_id, type, title, body, payload, created_at)
                    VALUES (gen_random_uuid(), @CreatedBy, 'COACH_APPROVED', 'Talebiniz Onaylandı', 'Koçunuz talebinizi onayladı.', @Payload, NOW())",
                    new { CreatedBy = item.CreatedBy, Payload = item.Payload }, tx);

                tx.Commit();
                return true;
            }
            catch
            {
                tx.Rollback();
                throw;
            }
        }

        public async Task<bool> RejectAsync(Guid id, Guid coachId, string? reason)
        {
            using var conn = _connectionFactory.CreateConnection();
            conn.Open();
            using var tx = conn.BeginTransaction();
            try
            {
                var item = await conn.QuerySingleOrDefaultAsync<ApprovalItemLockRow>(@"
                    SELECT a.id AS Id,
                           a.program_id AS ProgramId,
                           a.entity_type AS EntityType,
                           a.entity_id AS EntityId,
                           a.created_by AS CreatedBy,
                           a.status AS Status,
                           a.payload::text AS Payload
                    FROM approval_items a
                    JOIN program_coaches pc ON pc.program_id = a.program_id
                    WHERE a.id = @Id AND pc.coach_id = @CoachId
                    FOR UPDATE",
                    new { Id = id, CoachId = coachId }, tx);

                if (item == null)
                    throw new UnauthorizedAccessException("Onay öğesi bulunamadı veya bu koça ait değil.");

                if (item.Status != "PENDING")
                    throw new InvalidOperationException("Bu talep zaten sonuçlandırılmış.");

                await conn.ExecuteAsync(@"
                    UPDATE approval_items
                    SET status = 'REJECTED', resolved_at = NOW(), resolved_by = @CoachId, rejection_reason = @Reason
                    WHERE id = @Id",
                    new { Id = id, CoachId = coachId, Reason = reason }, tx);

                var bodyText = string.IsNullOrWhiteSpace(reason) ? "Koçunuz talebinizi reddetti." : $"Koçunuz talebinizi reddetti: {reason}";
                await conn.ExecuteAsync(@"
                    INSERT INTO notifications (id, user_id, type, title, body, payload, created_at)
                    VALUES (gen_random_uuid(), @CreatedBy, 'COACH_REJECTED', 'Talebiniz Reddedildi', @Body, @Payload, NOW())",
                    new { CreatedBy = item.CreatedBy, Body = bodyText, Payload = item.Payload }, tx);

                tx.Commit();
                return true;
            }
            catch
            {
                tx.Rollback();
                throw;
            }
        }

        private sealed class ApprovalItemLockRow
        {
            public Guid Id { get; set; }
            public Guid ProgramId { get; set; }
            public string EntityType { get; set; } = string.Empty;
            public Guid EntityId { get; set; }
            public Guid CreatedBy { get; set; }
            public string Status { get; set; } = "PENDING";
            public string Payload { get; set; } = "{}";
        }

        private sealed class ApprovalPaymentItemRow
        {
            public Guid Id { get; set; }
            public Guid PlanId { get; set; }
            public decimal BaseAmount { get; set; }
            public decimal PaidAmount { get; set; }
        }
    }
}
