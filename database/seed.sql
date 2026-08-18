INSERT INTO users (name, email, password_hash, role)
VALUES ('Admin User', 'admin@gym.com', '$2b$10$gx7u88SXJmUUFB2zY7fezumzBvpQ7a3HXL9OMERjn3lrYiMdZVE0O', 'admin');

INSERT INTO membership_plans (name, description, duration_days, price) VALUES
('Monthly', 'Full gym access, 1 month', 30, 1500.00),
('Quarterly', 'Full gym access, 3 months', 90, 4000.00),
('Annual', 'Full gym access, 12 months', 365, 14000.00);

INSERT INTO exercises (name, description, muscle_group) VALUES
('Bench Press', 'Barbell chest press', 'Chest'),
('Squats', 'Barbell back squat', 'Legs'),
('Deadlift', 'Barbell deadlift', 'Back'),
('Pull-ups', 'Bodyweight pull-up', 'Back'),
('Shoulder Press', 'Dumbbell overhead press', 'Shoulders');
