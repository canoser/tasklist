using Dapper;
using MentorumApi.DTOs;

namespace MentorumApi.Data
{
    public class ApprovalRepository : BaseRepository
    {
        public ApprovalRepository(DbConnectionFactory connectionFactory) : base(connectionFactory) { }

        public async Task<IEnumerable<ApprovalItemDto>> ListAsync(Guid programId, string? status = null)
        {
            using var conn = _connectionFactory.CreateConnection();
            var sql = @"
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
                WHERE program_id = @ProgramId";

            if (!string.IsNullOrWhiteSpace(status))
            {
                sql += " AND status = @Status";
            }
            sql += " ORDER BY created_at DESC";

            return await conn.QueryAsync<ApprovalItemDto>(sql, new { ProgramId = programId, Status = status });
        }

        public async Task<bool> ApproveAsync(Guid id, Guid coachId)
        {
            using var conn = _connectionFactory.CreateConnection();
            conn.Open();
            using var tx = conn.BeginTransaction();
            try
            {
                var item = await conn.QuerySingleOrDefaultAsync<dynamic>(@"
                    SELECT a.id, a.program_id, a.entity_type, a.entity_id, a.created_by, a.status, a.payload::text as payload
                    FROM approval_items a
                    JOIN program_coaches pc ON pc.program_id = a.program_id
                    WHERE a.id = @Id AND pc.coach_id = @CoachId
                    FOR UPDATE",
                    new { Id = id, CoachId = coachId }, tx);

                if (item == null)
                    throw new UnauthorizedAccessException("Onay öğesi bulunamadı veya bu koça ait değil.");

                if ((string)item.status != "PENDING")
                    throw new InvalidOperationException("Bu talep zaten sonuçlandırılmış.");

                // T29: Eğer PAYMENT_CLAIM ise ödeme tablosunu güncelle
                if ((string)item.entity_type == "PAYMENT_CLAIM")
                {
                    try
                    {
                        using var doc = System.Text.Json.JsonDocument.Parse((string)item.payload);
                        var root = doc.RootElement;
                        Guid targetItemId = (Guid)item.entity_id;
                        decimal claimAmount = 0m;
                        if (root.TryGetProperty("Amount", out var amtProp) && amtProp.ValueKind == System.Text.Json.JsonValueKind.Number)
                        {
                            claimAmount = amtProp.GetDecimal();
                        }
                        string? receiptUrl = root.TryGetProperty("ReceiptUrl", out var rUrlProp) ? rUrlProp.GetString() : null;

                        var pItem = await conn.QuerySingleOrDefaultAsync<dynamic>(@"
                            SELECT id, plan_id, base_amount, paid_amount 
                            FROM payment_items WHERE id = @ItemId FOR UPDATE",
                            new { ItemId = targetItemId }, tx);

                        if (pItem != null)
                        {
                            decimal curPaid = (decimal)pItem.paid_amount;
                            decimal baseAmt = (decimal)pItem.base_amount;
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
                                await conn.ExecuteAsync(@"
                                    UPDATE payment_items SET paid_amount = @NewPaid, status = 'PARTIAL' WHERE id = @ItemId",
                                    new { NewPaid = newPaid, ItemId = targetItemId }, tx);
                            }
                        }
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
                    VALUES (gen_random_uuid(), @CreatedBy, 'COACH_APPROVAL_ACCEPTED', 'Talebiniz Onaylandı', 'Koçunuz talebinizi onayladı.', @Payload, NOW())",
                    new { CreatedBy = (Guid)item.created_by, Payload = (string)item.payload }, tx);

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
                var item = await conn.QuerySingleOrDefaultAsync<dynamic>(@"
                    SELECT a.id, a.program_id, a.created_by, a.status, a.payload::text as payload
                    FROM approval_items a
                    JOIN program_coaches pc ON pc.program_id = a.program_id
                    WHERE a.id = @Id AND pc.coach_id = @CoachId
                    FOR UPDATE",
                    new { Id = id, CoachId = coachId }, tx);

                if (item == null)
                    throw new UnauthorizedAccessException("Onay öğesi bulunamadı veya bu koça ait değil.");

                if ((string)item.status != "PENDING")
                    throw new InvalidOperationException("Bu talep zaten sonuçlandırılmış.");

                await conn.ExecuteAsync(@"
                    UPDATE approval_items
                    SET status = 'REJECTED', resolved_at = NOW(), resolved_by = @CoachId, rejection_reason = @Reason
                    WHERE id = @Id",
                    new { Id = id, CoachId = coachId, Reason = reason }, tx);

                var bodyText = string.IsNullOrWhiteSpace(reason) ? "Koçunuz talebinizi reddetti." : $"Koçunuz talebinizi reddetti: {reason}";
                await conn.ExecuteAsync(@"
                    INSERT INTO notifications (id, user_id, type, title, body, payload, created_at)
                    VALUES (gen_random_uuid(), @CreatedBy, 'COACH_APPROVAL_REJECTED', 'Talebiniz Reddedildi', @Body, @Payload, NOW())",
                    new { CreatedBy = (Guid)item.created_by, Body = bodyText, Payload = (string)item.payload }, tx);

                tx.Commit();
                return true;
            }
            catch
            {
                tx.Rollback();
                throw;
            }
        }
    }
}
