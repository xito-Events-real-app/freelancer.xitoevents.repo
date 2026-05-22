CREATE TABLE public.global_lagan_dates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bs_year integer NOT NULL,
  bs_month integer NOT NULL CHECK (bs_month BETWEEN 1 AND 12),
  bs_day integer NOT NULL CHECK (bs_day BETWEEN 1 AND 32),
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (bs_year, bs_month, bs_day)
);

CREATE INDEX idx_global_lagan_year_month ON public.global_lagan_dates (bs_year, bs_month);

ALTER TABLE public.global_lagan_dates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view global lagan dates"
  ON public.global_lagan_dates FOR SELECT TO authenticated USING (true);

CREATE POLICY "Anon can view global lagan dates"
  ON public.global_lagan_dates FOR SELECT TO anon USING (true);

CREATE POLICY "Admins can insert global lagan dates"
  ON public.global_lagan_dates FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete global lagan dates"
  ON public.global_lagan_dates FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));