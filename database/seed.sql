-- Users (Admin + Staff login accounts)
INSERT INTO users (name, email, password_hash, role) VALUES
('Admin User', 'admin@gym.com', '$2b$10$A4EfpZZoYkHx4EYDNLdlPeRxl/iPlW1XlcQf2VS80IH95HheMl3Nm', 'admin'),
('Staff User', 'staff@gym.com', '$2b$10$F3PaTznyVhM7c8vUyiuOw.lJ2z7VP.lqJuwYBOwHCbtYV8tKAT6cK', 'staff');

-- Membership plans
INSERT INTO membership_plans (name, description, duration_days, price) VALUES
('Monthly', 'Full gym access, 1 month', 30, 1500.00),
('Quarterly', 'Full gym access, 3 months', 90, 4000.00),
('Annual', 'Full gym access, 12 months', 365, 14000.00);

-- Exercises
INSERT INTO exercises (name, description, muscle_group) VALUES
('Bench Press', 'Barbell chest press', 'Chest'),
('Squats', 'Barbell back squat', 'Legs'),
('Deadlift', 'Barbell deadlift', 'Back'),
('Pull-ups', 'Bodyweight pull-up', 'Back'),
('Shoulder Press', 'Dumbbell overhead press', 'Shoulders'),
('Bicep Curl', 'Dumbbell bicep curl', 'Arms'),
('Tricep Dips', 'Bodyweight tricep dip', 'Arms'),
('Lunges', 'Bodyweight or dumbbell lunges', 'Legs'),
('Plank', 'Core stability hold', 'Core'),
('Leg Press', 'Machine leg press', 'Legs'),
('Lat Pulldown', 'Cable lat pulldown', 'Back'),
('Mountain Climbers', 'Bodyweight cardio core move', 'Core');

-- Members
INSERT INTO members (first_name, last_name, email, phone, date_of_birth, gender, address, join_date) VALUES
('Rahul', 'Sharma', 'rahul@example.com', '9999999999', '1995-04-12', 'Male', 'Andheri, Mumbai', CURRENT_DATE - 200),
('Priya', 'Verma', 'priya@example.com', '7777777777', '1998-09-03', 'Female', 'Koramangala, Bengaluru', CURRENT_DATE - 150),
('Amit', 'Kumar', 'amit@example.com', '9812345670', '1992-01-22', 'Male', 'Sector 21, Noida', CURRENT_DATE - 120),
('Sneha', 'Patel', 'sneha@example.com', '9823456781', '1996-07-18', 'Female', 'Satellite, Ahmedabad', CURRENT_DATE - 90),
('Rohan', 'Mehta', 'rohan@example.com', '9834567892', '1990-11-30', 'Male', 'Baner, Pune', CURRENT_DATE - 300),
('Ananya', 'Iyer', 'ananya@example.com', '9845678903', '1999-03-25', 'Female', 'T. Nagar, Chennai', CURRENT_DATE - 60),
('Karan', 'Malhotra', 'karan@example.com', '9856789014', '1994-06-08', 'Male', 'Model Town, Delhi', CURRENT_DATE - 45),
('Divya', 'Nair', 'divya@example.com', '9867890125', '1997-12-14', 'Female', 'Kakkanad, Kochi', CURRENT_DATE - 10);

-- Trainers
INSERT INTO trainers (first_name, last_name, email, phone, specialization, availability) VALUES
('Vikram', 'Singh', 'vikram@gym.com', '9900011122', 'Strength Training', 'Mon-Fri 6am-2pm'),
('Anjali', 'Rao', 'anjali@gym.com', '9900022233', 'Yoga', 'Mon-Sat 7am-11am'),
('Arjun', 'Nair', 'arjun@gym.com', '9900033344', 'Cardio & HIIT', 'Tue-Sun 4pm-9pm'),
('Kavita', 'Desai', 'kavita@gym.com', '9900044455', 'Nutrition & Weight Loss', 'Mon-Fri 9am-5pm'),
('Sanjay', 'Gupta', 'sanjay@gym.com', '9900055566', 'CrossFit', 'Mon-Sat 5am-10am');

-- Trainer-member assignments
INSERT INTO trainer_member_assignments (trainer_id, member_id) VALUES
(1, 1), -- Vikram -> Rahul
(2, 2), -- Anjali -> Priya
(1, 3), -- Vikram -> Amit
(5, 5), -- Sanjay -> Rohan
(4, 6); -- Kavita -> Ananya

-- Workout plans
INSERT INTO workout_plans (name, description, difficulty_level, created_by) VALUES
('Beginner Strength', 'Foundational full-body strength plan', 'beginner', 1),
('Fat Loss Circuit', 'High-intensity circuit for fat loss', 'intermediate', 3),
('Advanced Powerlifting', 'Heavy compound lifts for experienced lifters', 'advanced', 5);

-- Workout plan exercises
INSERT INTO workout_plan_exercises (workout_plan_id, exercise_id, day_of_week, sets, reps) VALUES
-- Beginner Strength
(1, 1, 'Monday', 3, 10),   -- Bench Press
(1, 2, 'Monday', 3, 12),   -- Squats
(1, 3, 'Wednesday', 3, 8), -- Deadlift
-- Fat Loss Circuit
(2, 12, 'Monday', 4, 20),  -- Mountain Climbers
(2, 8, 'Wednesday', 3, 15),-- Lunges
(2, 10, 'Wednesday', 3, 12),-- Leg Press
(2, 9, 'Friday', 3, 45),   -- Plank
-- Advanced Powerlifting
(3, 2, 'Monday', 5, 5),    -- Squats
(3, 3, 'Wednesday', 5, 5), -- Deadlift
(3, 1, 'Friday', 5, 5);    -- Bench Press

-- Member workout plan assignments
INSERT INTO member_workout_plans (member_id, workout_plan_id) VALUES
(1, 1), -- Rahul -> Beginner Strength
(3, 1), -- Amit -> Beginner Strength
(5, 3), -- Rohan -> Advanced Powerlifting
(6, 2); -- Ananya -> Fat Loss Circuit

-- Memberships (dates are relative to CURRENT_DATE so this seed stays realistic whenever it's run)
INSERT INTO memberships (member_id, plan_id, start_date, end_date, status) VALUES
(1, 1, CURRENT_DATE - 10, CURRENT_DATE + 20, 'active'),  -- Rahul: Monthly, active
(2, 1, CURRENT_DATE - 5,  CURRENT_DATE + 25, 'active'),  -- Priya: Monthly, active
(3, 2, CURRENT_DATE - 40, CURRENT_DATE + 50, 'active'),  -- Amit: Quarterly, active
(4, 1, CURRENT_DATE - 45, CURRENT_DATE - 15, 'active'),  -- Sneha: Monthly, EXPIRED (end date already passed)
(5, 3, CURRENT_DATE - 100, CURRENT_DATE + 265, 'active'),-- Rohan: Annual, active
(6, 1, CURRENT_DATE - 15, CURRENT_DATE + 15, 'active'),  -- Ananya: Monthly, active
(7, 1, CURRENT_DATE - 27, CURRENT_DATE + 3, 'active');   -- Karan: Monthly, EXPIRING SOON (3 days left)
-- Divya (member 8) intentionally has no membership, to demonstrate the check-in-denied rule.

-- Payments (one per membership above, amount matching the plan price)
INSERT INTO payments (member_id, membership_id, amount, payment_date, payment_method) VALUES
(1, 1, 1500.00, CURRENT_DATE - 10, 'cash'),
(2, 2, 1500.00, CURRENT_DATE - 5, 'upi'),
(3, 3, 4000.00, CURRENT_DATE - 40, 'card'),
(4, 4, 1500.00, CURRENT_DATE - 45, 'bank_transfer'),
(5, 5, 14000.00, CURRENT_DATE - 100, 'card'),
(6, 6, 1500.00, CURRENT_DATE - 15, 'upi'),
(7, 7, 1500.00, CURRENT_DATE - 27, 'cash');

-- Attendance (today + one from yesterday, for history)
INSERT INTO attendance (member_id, check_in_time, check_out_time) VALUES
(1, NOW() - INTERVAL '2 hours', NOW() - INTERVAL '1 hour'),  -- Rahul: checked in and out today
(2, NOW() - INTERVAL '30 minutes', NULL),                     -- Priya: still checked in today
(3, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day' + INTERVAL '1 hour'); -- Amit: yesterday
