-- Move the payment due day from the global settings row to each member.
-- Existing members inherit the previously-global day; the settings column is removed.
ALTER TABLE members ADD COLUMN payment_due_day INTEGER;

UPDATE members SET payment_due_day = COALESCE(
    (SELECT payment_due_day FROM settings WHERE id = 1),
    5
) WHERE payment_due_day IS NULL;

ALTER TABLE settings DROP COLUMN payment_due_day;
