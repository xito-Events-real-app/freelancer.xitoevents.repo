import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/contexts/ActiveCompanyContext';
import { withActiveAgency } from '@/lib/withActiveAgency';
import { keyForAgency } from '@/lib/queryKeys';

export type PaymentType = 'advance' | 'partial' | 'final';

export type AgencyFinanceBank = {
  id: string;
  user_id: string;
  bank_name: string;
  account_holder_name: string;
  created_at: string;
  updated_at: string;
};

export type AgencyClientPayment = {
  id: string;
  user_id: string;
  client_id: string;
  amount: number;
  payment_type: PaymentType;
  payment_date: string;
  payment_date_bs: string | null;
  note: string | null;
  bank_id: string | null;
  is_opening_balance: boolean;
  created_at: string;
  updated_at: string;
  bank?: AgencyFinanceBank | null;
};

type RpcResult = {
  success?: boolean;
  needsSetup?: boolean;
  locked?: boolean;
  lockedUntil?: string;
  attemptsRemaining?: number;
  sessionToken?: string;
  expiresAt?: string;
  message?: string;
  advanceAmount?: number;
  packageAmount?: number;
};

type EditablePaymentPayload = {
  id: string;
  amount: number;
  payment_type: PaymentType;
  payment_date: string;
  payment_date_bs: string | null;
  note: string | null;
  bank_id: string | null;
};

const financeRpc = supabase as any;
const SESSION_KEY = 'agency-finance-session';

export function getStoredFinanceSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { token: string; expiresAt: string };
    if (!parsed.token || !parsed.expiresAt || new Date(parsed.expiresAt).getTime() <= Date.now()) {
      sessionStorage.removeItem(SESSION_KEY);
      return null;
    }
    return parsed;
  } catch {
    sessionStorage.removeItem(SESSION_KEY);
    return null;
  }
}

export function storeFinanceSession(result: RpcResult) {
  if (result.sessionToken && result.expiresAt) {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ token: result.sessionToken, expiresAt: result.expiresAt }));
  }
}

export function clearFinanceSession() {
  sessionStorage.removeItem(SESSION_KEY);
}

export function useFinancePinStatus() {
  const { activeAgencyId } = useActiveCompany();
  return useQuery({
    queryKey: keyForAgency('agency-finance-pin-status', activeAgencyId),
    queryFn: async () => {
      if (!activeAgencyId) return false;
      const { data, error } = await financeRpc.rpc('has_agency_finance_pin', { _agency_user_id: activeAgencyId });
      if (error) throw error;
      return Boolean(data);
    },
    enabled: !!activeAgencyId,
  });
}

export function useSetFinancePin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (pin: string) => {
      const { data, error } = await financeRpc.rpc('set_agency_finance_pin', { _pin: pin });
      if (error) throw error;
      const result = data as RpcResult;
      storeFinanceSession(result);
      return result;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['agency-finance-pin-status'] }),
  });
}

export function useVerifyFinancePin() {
  const { activeAgencyId } = useActiveCompany();
  return useMutation({
    mutationFn: async (pin: string) => {
      if (!activeAgencyId) throw new Error('No active company');
      const { data, error } = await financeRpc.rpc('verify_agency_finance_pin', { _pin: pin, _agency_user_id: activeAgencyId });
      if (error) throw error;
      const result = data as RpcResult;
      storeFinanceSession(result);
      return result;
    },
  });
}

export function useVerifyFinanceSession() {
  return useMutation({
    mutationFn: async (token: string) => {
      const { data, error } = await financeRpc.rpc('verify_agency_finance_session', { _token: token });
      if (error) throw error;
      return Boolean(data);
    },
  });
}

export function useAgencyFinanceBanks() {
  const { activeAgencyId, switching } = useActiveCompany();
  return useQuery({
    queryKey: keyForAgency('agency-finance-banks', activeAgencyId),
    queryFn: async () => {
      if (!activeAgencyId) return [];
      const { data, error } = await supabase
        .from('agency_finance_banks' as any)
        .select('*')
        .eq('user_id', activeAgencyId)
        .order('bank_name', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as AgencyFinanceBank[];
    },
    enabled: !!activeAgencyId && !switching,
  });
}

export function useAddAgencyFinanceBank() {
  const qc = useQueryClient();
  const { activeAgencyId } = useActiveCompany();
  return useMutation({
    mutationFn: async (payload: { bankName: string; accountHolderName: string }) => {
      if (!activeAgencyId) throw new Error('No active company');
      const { data, error } = await financeRpc.rpc('add_agency_finance_bank', {
        _agency_user_id: activeAgencyId,
        _bank_name: payload.bankName,
        _account_holder_name: payload.accountHolderName,
      });
      if (error) throw error;
      return data as AgencyFinanceBank;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['agency-finance-banks'] }),
  });
}

export function useAgencyClientPayments(clientId?: string) {
  const { activeAgencyId, switching } = useActiveCompany();
  return useQuery({
    queryKey: keyForAgency('agency-client-payments', activeAgencyId, clientId ?? null),
    queryFn: async () => {
      if (!activeAgencyId || !clientId) return [];
      const { data, error } = await supabase
        .from('agency_client_payments' as any)
        .select('*, bank:agency_finance_banks(*)')
        .eq('user_id', activeAgencyId)
        .eq('client_id', clientId)
        .order('payment_date', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as AgencyClientPayment[];
    },
    enabled: !!activeAgencyId && !switching && !!clientId,
  });
}

export function useAddAgencyClientPayment() {
  const qc = useQueryClient();
  const { activeAgencyId } = useActiveCompany();
  return useMutation({
    mutationFn: async (payload: {
      sessionToken: string;
      clientId: string;
      amount: number;
      paymentType: PaymentType;
      paymentDate: string;
      paymentDateBS: string | null;
      paymentNote: string | null;
      bankId: string | null;
      isOpeningBalance?: boolean;
    }) => {
      if (!activeAgencyId) throw new Error('No active company');
      const { data, error } = await financeRpc.rpc('update_agency_client_finance_add_payment', {
        _agency_user_id: activeAgencyId,
        _session_token: payload.sessionToken,
        _client_id: payload.clientId,
        _amount: payload.amount,
        _payment_type: payload.paymentType,
        _payment_date: payload.paymentDate,
        _payment_date_bs: payload.paymentDateBS,
        _payment_note: payload.paymentNote,
        _bank_id: payload.bankId,
        _is_opening_balance: payload.isOpeningBalance ?? false,
      });
      if (error) throw error;
      return data as RpcResult;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agency-clients'] });
      qc.invalidateQueries({ queryKey: ['agency-client-payments'] });
    },
  });
}

export function useDeleteAgencyClientPayment() {
  const qc = useQueryClient();
  const { activeAgencyId } = useActiveCompany();
  return useMutation({
    mutationFn: async (payload: { pin: string; paymentId: string; clientId: string }) => {
      if (!activeAgencyId) throw new Error('No active company');
      const { data, error } = await financeRpc.rpc('delete_agency_client_payment', {
        _agency_user_id: activeAgencyId,
        _pin: payload.pin,
        _payment_id: payload.paymentId,
      });
      if (error) throw error;
      return data as RpcResult;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agency-clients'] });
      qc.invalidateQueries({ queryKey: ['agency-client-payments'] });
    },
  });
}

export function useEditAgencyClientPayments() {
  const qc = useQueryClient();
  const { activeAgencyId } = useActiveCompany();
  return useMutation({
    mutationFn: async (payload: {
      sessionToken: string;
      clientId: string;
      packageAmount: number;
      payments: EditablePaymentPayload[];
    }) => {
      if (!activeAgencyId) throw new Error('No active company');
      const { data, error } = await financeRpc.rpc('update_agency_client_finance_edit_payments', {
        _agency_user_id: activeAgencyId,
        _session_token: payload.sessionToken,
        _client_id: payload.clientId,
        _package_amount: payload.packageAmount,
        _payments: payload.payments,
      });
      if (error) throw error;
      return data as RpcResult;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agency-clients'] });
      qc.invalidateQueries({ queryKey: ['agency-client-payments'] });
    },
  });
}

export function useCreateOpeningClientPayment() {
  const qc = useQueryClient();
  const { activeAgencyId } = useActiveCompany();
  return useMutation({
    mutationFn: async (payload: {
      clientId: string;
      amount: number;
      paymentDate: string;
      paymentDateBS: string | null;
      bankId: string | null;
      note?: string | null;
    }) => {
      if (!activeAgencyId) throw new Error('No active company');
      return withActiveAgency(activeAgencyId, async () => {
        const { data, error } = await supabase
          .from('agency_client_payments' as any)
          .insert({
            user_id: activeAgencyId,
            client_id: payload.clientId,
            amount: payload.amount,
            payment_type: 'advance',
            payment_date: payload.paymentDate,
            payment_date_bs: payload.paymentDateBS,
            bank_id: payload.bankId,
            note: payload.note ?? 'Opening advance payment',
            is_opening_balance: true,
          })
          .select()
          .single();
        if (error) throw error;
        return data;
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agency-client-payments'] });
    },
  });
}

export function useUpdateAgencyClientFinance() {
  const addPayment = useAddAgencyClientPayment();
  return useMutation({
    mutationFn: async (payload: {
      clientId: string;
      pin: string;
      packageAmount: number;
      paymentAmount?: number | null;
      paymentDate?: string | null;
      paymentDateBS?: string | null;
      paymentNote?: string | null;
      paymentType?: PaymentType;
    }) => {
      const session = getStoredFinanceSession();
      if (!session?.token) return { success: false, message: 'Finance session expired. Enter PIN again.' } as RpcResult;
      if (!payload.paymentAmount) return { success: true, packageAmount: payload.packageAmount } as RpcResult;
      return addPayment.mutateAsync({
        sessionToken: session.token,
        clientId: payload.clientId,
        amount: payload.paymentAmount,
        paymentType: payload.paymentType ?? 'partial',
        paymentDate: payload.paymentDate ?? new Date().toISOString().slice(0, 10),
        paymentDateBS: payload.paymentDateBS ?? null,
        paymentNote: payload.paymentNote ?? null,
        bankId: null,
      });
    },
  });
}

/** Owner-only finance offboarding: removes the staff's finance role and signs them out. */
export function useRevokeFinanceAccess() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (staffUserId: string) => {
      const { data, error } = await financeRpc.rpc('revoke_finance_access', { _staff: staffUserId });
      if (error) throw error;
      return data as { success?: boolean };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['staff-roles-assigned'] });
      qc.invalidateQueries({ queryKey: ['staff-roles'] });
      qc.invalidateQueries({ queryKey: ['my-companies'] });
    },
  });
}
