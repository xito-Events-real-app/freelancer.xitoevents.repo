ALTER TABLE public.agency_client_payments
  ADD CONSTRAINT agency_client_payments_client_id_fkey
    FOREIGN KEY (client_id) REFERENCES public.agency_clients(id) ON DELETE CASCADE;

ALTER TABLE public.agency_client_payments
  ADD CONSTRAINT agency_client_payments_bank_id_fkey
    FOREIGN KEY (bank_id) REFERENCES public.agency_finance_banks(id) ON DELETE SET NULL;