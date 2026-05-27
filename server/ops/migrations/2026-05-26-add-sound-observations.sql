CREATE TABLE IF NOT EXISTS public.sound_observations (
  sound_observation_id bigserial PRIMARY KEY,
  device_id text NOT NULL,
  topic text,
  observed_at timestamptz NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  sound_level_db double precision,
  dominant_classification text,
  dominant_classification_score double precision,
  classification_scores jsonb NOT NULL DEFAULT '{}'::jsonb,
  raw_payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sound_observations_device_observed_key UNIQUE (device_id, observed_at)
);

CREATE INDEX IF NOT EXISTS idx_sound_observations_observed_at
  ON public.sound_observations (observed_at DESC);

CREATE INDEX IF NOT EXISTS idx_sound_observations_device_observed_at
  ON public.sound_observations (device_id, observed_at DESC);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'appuser') THEN
    GRANT SELECT, INSERT, UPDATE ON public.sound_observations TO appuser;
    IF EXISTS (
      SELECT 1
      FROM pg_class
      WHERE relkind = 'S'
        AND relname = 'sound_observations_sound_observation_id_seq'
    ) THEN
      GRANT USAGE, SELECT ON SEQUENCE public.sound_observations_sound_observation_id_seq TO appuser;
    END IF;
  END IF;
END $$;
