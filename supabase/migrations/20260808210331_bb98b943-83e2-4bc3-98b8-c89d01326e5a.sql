CREATE TABLE public.agenda_events (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  id text NOT NULL,
  date text NOT NULL DEFAULT '',
  time text NOT NULL DEFAULT '',
  title text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  status_id text NOT NULL DEFAULT '',
  amount numeric NOT NULL DEFAULT 0,
  record_id text NOT NULL DEFAULT '',
  kind text NOT NULL DEFAULT 'evento',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.agenda_events TO authenticated;
GRANT ALL ON public.agenda_events TO service_role;

ALTER TABLE public.agenda_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own agenda" ON public.agenda_events
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_agenda_events_updated_at
  BEFORE UPDATE ON public.agenda_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();