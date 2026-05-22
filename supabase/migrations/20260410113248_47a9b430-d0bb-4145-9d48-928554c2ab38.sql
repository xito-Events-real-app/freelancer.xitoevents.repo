
CREATE TABLE public.agency_clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  client_name TEXT NOT NULL,
  contact_number TEXT,
  whatsapp_number TEXT,
  email TEXT,
  event_name TEXT,
  event_date_bs TEXT,
  event_date_ad DATE,
  event_city TEXT,
  event_area TEXT,
  package_amount INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'booked',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.agency_clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own clients" ON public.agency_clients FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own clients" ON public.agency_clients FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own clients" ON public.agency_clients FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own clients" ON public.agency_clients FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_agency_clients_updated_at
  BEFORE UPDATE ON public.agency_clients
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
