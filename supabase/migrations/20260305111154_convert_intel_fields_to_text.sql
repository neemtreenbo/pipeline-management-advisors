ALTER TABLE public.clients
  ALTER COLUMN education TYPE text USING education#>>'{}',
  ALTER COLUMN updates TYPE text USING updates#>>'{}',
  ALTER COLUMN experiences TYPE text USING experiences#>>'{}';
