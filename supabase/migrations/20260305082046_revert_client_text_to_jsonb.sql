ALTER TABLE public.clients
  ALTER COLUMN education TYPE jsonb USING to_jsonb(education),
  ALTER COLUMN updates TYPE jsonb USING to_jsonb(updates),
  ALTER COLUMN experiences TYPE jsonb USING to_jsonb(experiences),
  ALTER COLUMN talking_points TYPE jsonb USING 
    CASE 
      WHEN talking_points IS NULL THEN NULL 
      WHEN talking_points IS JSON THEN talking_points::jsonb 
      ELSE to_jsonb(talking_points) 
    END;
