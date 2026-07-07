-- Seed initial departments
-- Run this in Supabase SQL Editor

INSERT INTO departments (name, description, head_id, head_name, member_count) VALUES
  ('Executive', 'Executive leadership team', NULL, NULL, 0),
  ('Engineering', 'Software development and engineering', NULL, NULL, 0),
  ('Sales', 'Sales and business development', NULL, NULL, 0),
  ('Marketing', 'Marketing and brand management', NULL, NULL, 0),
  ('Human Resources', 'HR and people operations', NULL, NULL, 0),
  ('Finance', 'Finance and accounting', NULL, NULL, 0),
  ('Operations', 'Operations and logistics', NULL, NULL, 0),
  ('Customer Support', 'Customer service and support', NULL, NULL, 0);

-- Verify departments were created
SELECT * FROM departments ORDER BY name;
