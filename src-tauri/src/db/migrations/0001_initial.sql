CREATE TABLE members (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    birthday TEXT NOT NULL,
    gender TEXT NOT NULL CHECK (gender IN ('masculino', 'feminino', 'outro')),
    face_photo BLOB,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE evaluations (
    id TEXT PRIMARY KEY,
    member_id TEXT NOT NULL REFERENCES members (id) ON DELETE CASCADE,
    number INTEGER NOT NULL,
    date TEXT NOT NULL,

    weight_kg REAL NOT NULL,
    height_m REAL NOT NULL,

    neck_cm REAL,
    chest_cm REAL,
    waist_cm REAL,
    abdomen_cm REAL,
    hip_cm REAL,
    forearm_right_cm REAL,
    forearm_left_cm REAL,
    arm_right_cm REAL,
    arm_left_cm REAL,
    thigh_right_cm REAL,
    thigh_left_cm REAL,
    calf_right_cm REAL,
    calf_left_cm REAL,
    arm_flexed_right_cm REAL,
    arm_flexed_left_cm REAL,

    heart_rate_bpm REAL,
    heart_index REAL,
    bmi REAL,
    body_fat_pct REAL,
    muscle_rate_pct REAL,
    fat_free_mass_kg REAL,
    subcutaneous_fat_pct REAL,
    visceral_fat REAL,
    body_water_pct REAL,
    skeletal_muscle_pct REAL,
    muscle_mass_kg REAL,
    bone_mass_kg REAL,
    bmr_kcal REAL,
    metabolic_age REAL,

    photo_front BLOB,
    photo_side_right BLOB,
    photo_side_left BLOB,
    photo_back BLOB,

    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),

    UNIQUE (member_id, number)
);

CREATE INDEX idx_evaluations_member_date ON evaluations (member_id, date);
