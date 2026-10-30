-- V18 B3a: Salt-Okunur Canlı Veri Denetimi (0 TL Tahsilat ve Yanlış Rollover Kontrolü)
-- Bu sorgu veritabanında hiçbir değişiklik YAPMAZ (yalnızca SELECT).

-- 1) 0 TL (veya <= 0) tutarlı tahsilat kayıtları ve etkilenen taksitler
SELECT
    p.id AS payment_id,
    p.item_id AS source_item_id,
    p.amount AS recorded_amount,
    p.paid_at,
    pi.plan_id,
    pi.due_date AS source_due_date,
    pi.base_amount AS source_base_amount,
    pi.paid_amount AS source_paid_amount,
    pi.status AS source_status,
    u.full_name AS student_name
FROM payments p
JOIN payment_items pi ON pi.id = p.item_id
JOIN payment_plans pp ON pp.id = pi.plan_id
JOIN users u ON u.id = pp.student_id
WHERE p.amount <= 0
ORDER BY p.paid_at DESC;

-- 2) 0 TL tahsilat nedeniyle sonraki taksite devredilmiş (rolled_from_item_id) taksitler
SELECT
    next_pi.id AS rolled_target_item_id,
    next_pi.plan_id,
    next_pi.due_date AS target_due_date,
    next_pi.base_amount AS target_inflated_base_amount,
    next_pi.rolled_from_item_id AS source_item_id,
    src_pi.base_amount AS source_base_amount,
    src_pi.paid_amount AS source_paid_amount,
    src_pi.status AS source_status
FROM payment_items next_pi
JOIN payment_items src_pi ON src_pi.id = next_pi.rolled_from_item_id
WHERE src_pi.status = 'PARTIAL' AND src_pi.paid_amount = 0;
