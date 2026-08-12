CREATE TABLE public.finance_records (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  id text NOT NULL,
  date text NOT NULL DEFAULT '',
  type text NOT NULL DEFAULT 'despesa',
  category text NOT NULL DEFAULT '',
  expense_kind text NOT NULL DEFAULT 'nenhuma',
  description text NOT NULL DEFAULT '',
  account text NOT NULL DEFAULT '',
  method text NOT NULL DEFAULT '',
  due_date text NOT NULL DEFAULT '',
  amount numeric NOT NULL DEFAULT 0,
  notes text NOT NULL DEFAULT '',
  details text NOT NULL DEFAULT '',
  history text NOT NULL DEFAULT '',
  links text NOT NULL DEFAULT '',
  comments text NOT NULL DEFAULT '',
  paid_amount numeric NOT NULL DEFAULT 0,
  payment_date text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pendente',
  source text NOT NULL DEFAULT 'manual',
  file_id text NOT NULL DEFAULT '',
  file_name text NOT NULL DEFAULT '',
  sheet text NOT NULL DEFAULT '',
  extra jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.finance_records TO authenticated;
GRANT ALL ON public.finance_records TO service_role;
ALTER TABLE public.finance_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own records" ON public.finance_records FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.finance_files (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  id text NOT NULL,
  name text NOT NULL DEFAULT '',
  size bigint NOT NULL DEFAULT 0,
  imported_at text NOT NULL DEFAULT '',
  sheets jsonb NOT NULL DEFAULT '[]'::jsonb,
  issues jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.finance_files TO authenticated;
GRANT ALL ON public.finance_files TO service_role;
ALTER TABLE public.finance_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own files" ON public.finance_files FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.finance_prefs (
  user_id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  goal jsonb,
  settings jsonb,
  layout jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.finance_prefs TO authenticated;
GRANT ALL ON public.finance_prefs TO service_role;
ALTER TABLE public.finance_prefs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own prefs" ON public.finance_prefs FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_finance_records_updated_at BEFORE UPDATE ON public.finance_records FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_finance_files_updated_at BEFORE UPDATE ON public.finance_files FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_finance_prefs_updated_at BEFORE UPDATE ON public.finance_prefs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();