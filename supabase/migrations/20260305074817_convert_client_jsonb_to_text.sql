ALTER TABLE public.clients
  ALTER COLUMN education TYPE text USING education::text,
  ALTER COLUMN updates TYPE text USING updates::text,
  ALTER COLUMN experiences TYPE text USING experiences::text,
  ALTER COLUMN talking_points TYPE text USING talking_points::text;
