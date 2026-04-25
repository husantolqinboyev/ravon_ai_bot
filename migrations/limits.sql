ALTER TABLE users 
ADD COLUMN IF NOT EXISTS writing_used_today INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS writing_limit INTEGER DEFAULT 2,
ADD COLUMN IF NOT EXISTS test_used_today INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS test_limit INTEGER DEFAULT 5;

ALTER TABLE tariffs
ADD COLUMN IF NOT EXISTS writing_limit INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS test_limit INTEGER DEFAULT 50;

-- Update existing tariffs with some reasonable limits
UPDATE tariffs SET writing_limit = 5, test_limit = 20 WHERE name = 'Basic';
UPDATE tariffs SET writing_limit = 15, test_limit = 50 WHERE name = 'Standart';
UPDATE tariffs SET writing_limit = 50, test_limit = 200 WHERE name = 'Premium';

