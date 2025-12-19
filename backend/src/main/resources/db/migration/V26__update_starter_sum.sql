-- Update starter code for demo 'Suma' tasks to use robust numeric parsing
UPDATE tasks
SET starter_code = $$function solve(input){ const nums = (String(input||'').match(/-?\d+/g)||[]).map(Number); return String(nums.reduce((a,b)=>a+b,0)); }$$
WHERE title ILIKE '%suma demo%';
