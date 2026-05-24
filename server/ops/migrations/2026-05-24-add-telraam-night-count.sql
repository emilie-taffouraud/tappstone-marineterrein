ALTER TABLE public.traffic_observations
  ADD COLUMN IF NOT EXISTS night_count integer DEFAULT 0;

UPDATE public.traffic_observations
SET night_count = 0
WHERE night_count IS NULL;

ALTER TABLE public.traffic_observations
  ALTER COLUMN night_count SET DEFAULT 0;

INSERT INTO public.metrics (metric_name, display_name, unit, category, description)
VALUES (
  'night_count',
  'Night Mode Count',
  'counts',
  'traffic',
  'Telraam night-mode detections when travel mode cannot be classified'
)
ON CONFLICT (metric_name) DO UPDATE
SET display_name = EXCLUDED.display_name,
    unit = EXCLUDED.unit,
    category = EXCLUDED.category,
    description = EXCLUDED.description;
