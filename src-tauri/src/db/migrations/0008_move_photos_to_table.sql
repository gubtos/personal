-- Move the four photo blobs out of `evaluations` into a 1:1 side table, so metric
-- queries and metric-only updates never touch the (large) photo payload.
CREATE TABLE evaluation_photos (
    evaluation_id TEXT PRIMARY KEY REFERENCES evaluations (id) ON DELETE CASCADE,
    photo_front BLOB,
    photo_side_right BLOB,
    photo_side_left BLOB,
    photo_back BLOB
);

INSERT INTO evaluation_photos (
    evaluation_id, photo_front, photo_side_right, photo_side_left, photo_back
)
SELECT id, photo_front, photo_side_right, photo_side_left, photo_back
FROM evaluations;

ALTER TABLE evaluations DROP COLUMN photo_front;
ALTER TABLE evaluations DROP COLUMN photo_side_right;
ALTER TABLE evaluations DROP COLUMN photo_side_left;
ALTER TABLE evaluations DROP COLUMN photo_back;
