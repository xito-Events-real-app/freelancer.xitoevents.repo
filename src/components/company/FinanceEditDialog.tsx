import { useEffect, useMemo, useState } from 'react';
import { Calendar, CreditCard, Lock, Pencil, Plus, ShieldCheck, Trash2, Wallet } from 'lucide-react';
import type { AgencyClient } from '@/hooks/useAgencyClients';
import {
  clearFinanceSession,
  getStoredFinanceSession,
  type AgencyClientPayment,
  type PaymentType,
  useAddAgencyClientPayment,
  useAddAgencyFinanceBank,
  useAgencyClientPayments,
  useAgencyFinanceBanks,
  useDeleteAgencyClientPayment,
  useEditAgencyClientPayments,
  useFinancePinStatus,
  useSetFinancePin,
  useVerifyFinancePin,
  useVerifyFinanceSession,
} from '@/hooks/useAgencyFinance';
import XitoDatePicker, { makeXitoDateValue, type XitoDateValue } from '@/components/company/XitoDatePicker';
import FinanceBankSelect from '@/components/company/FinanceBankSelect';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface Props {
  client: AgencyClient | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

const isSixDigitPin = (pin: string) => /^\d{6}$/.test(pin);
import { formatNpr } from '@/lib/formatNpr';
const formatMoney = (value: number) => formatNpr(value);

export default function FinanceEditDialog({ client, open, onOpenChange, onSaved }: Props) {
  const { data: hasPin = false, isLoading: pinStatusLoading } = useFinancePinStatus();
  const { data: payments = [], isLoading: paymentsLoading } = useAgencyClientPayments(client?.id);
  const { data: banks = [] } = useAgencyFinanceBanks();
  const setPin = useSetFinancePin();
  const verifyPin = useVerifyFinancePin();
  const verifySession = useVerifyFinanceSession();
  const addBank = useAddAgencyFinanceBank();
  const addPayment = useAddAgencyClientPayment();

  const [pin, setPinValue] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [amount, setAmount] = useState('');
  const [paymentType, setPaymentType] = useState<PaymentType>('partial');
  const [bankId, setBankId] = useState<string | null>(null);
  const [paymentDate, setPaymentDate] = useState<XitoDateValue>(() => makeXitoDateValue());
  const [paymentNote, setPaymentNote] = useState('');

  const ledgerRows = useMemo(() => {
    if (!client) return [];
    let cumulative = 0;
    return [...payments]
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .map(payment => {
        cumulative += payment.amount;
        return { ...payment, remaining: Math.max((client.package_amount || 0) - cumulative, 0) };
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [client, payments]);

  const totalLedgerPaid = useMemo(() => payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0), [payments]);
  const remainingAfterAdd = Math.max((client?.package_amount || 0) - totalLedgerPaid - Number(amount || 0), 0);

  useEffect(() => {
    if (!open || !client) return;
    const stored = getStoredFinanceSession();
    setPinValue('');
    setConfirmPin('');
    setAmount('');
    setPaymentType('partial');
    setBankId(null);
    setPaymentDate(makeXitoDateValue());
    setPaymentNote('');
    if (stored?.token) {
      setSessionToken(stored.token);
      setIsUnlocked(true);
      verifySession.mutate(stored.token, {
        onSuccess: valid => {
          if (!valid) {
            clearFinanceSession();
            setSessionToken(null);
            setIsUnlocked(false);
          }
        },
        onError: () => {
          clearFinanceSession();
          setSessionToken(null);
          setIsUnlocked(false);
        },
      });
    } else {
      setSessionToken(null);
      setIsUnlocked(false);
    }
  }, [open, client?.id]);

  if (!client) return null;

  const handleSetPin = async () => {
    if (!isSixDigitPin(pin) || pin !== confirmPin) {
      toast({ title: 'PIN setup failed', description: 'Enter the same 6 digit PIN in both fields.' });
      return;
    }
    try {
      const result = await setPin.mutateAsync(pin);
      if (!result.success || !result.sessionToken) throw new Error(result.message || 'Please try again.');
      setSessionToken(result.sessionToken);
      setIsUnlocked(true);
      toast({ title: 'Finance PIN set', description: 'Unlocked for 10 minutes.' });
    } catch (error) {
      toast({ title: 'PIN setup failed', description: error instanceof Error ? error.message : 'Please try again.' });
    }
  };

  const handleVerifyPin = async () => {
    if (!isSixDigitPin(pin)) {
      toast({ title: 'Invalid PIN', description: 'Enter your 6 digit finance PIN.' });
      return;
    }
    try {
      const result = await verifyPin.mutateAsync(pin);
      if (!result.success || !result.sessionToken) {
        toast({ title: 'PIN not verified', description: result.message || 'Please try again.' });
        return;
      }
      setSessionToken(result.sessionToken);
      setIsUnlocked(true);
      toast({ title: 'Finance unlocked', description: 'PIN will not be asked again for 10 minutes.' });
    } catch (error) {
      toast({ title: 'PIN not verified', description: error instanceof Error ? error.message : 'Please try again.' });
    }
  };

  const handleAddBank = async (bankName: string, accountHolderName: string) => addBank.mutateAsync({ bankName, accountHolderName });

  const handleAddPayment = async () => {
    if (!sessionToken) return setIsUnlocked(false);
    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      toast({ title: 'Invalid payment', description: 'Payment amount must be greater than 0.' });
      return;
    }
    const result = await addPayment.mutateAsync({
      sessionToken,
      clientId: client.id,
      amount: Math.round(parsedAmount),
      paymentType,
      paymentDate: paymentDate.adDate,
      paymentDateBS: paymentDate.bsDisplay,
      paymentNote: paymentNote.trim() || null,
      bankId,
    });
    if (!result.success) {
      clearFinanceSession();
      setIsUnlocked(false);
      toast({ title: 'Save blocked', description: result.message || 'Please enter PIN again.' });
      return;
    }
    toast({ title: 'Payment added', description: 'The transaction ledger was updated.' });
    setAmount('');
    setPaymentNote('');
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[94vh] overflow-y-auto border-border bg-background p-0 text-foreground sm:max-w-6xl">
        <div className="bg-card/95 p-5 sm:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-black uppercase tracking-wide">
              <Wallet className="h-5 w-5 text-accent" /> {client.client_name}
            </DialogTitle>
            <DialogDescription>Secure finance manager with 10-minute PIN unlock, bank ledger, and editable payments.</DialogDescription>
          </DialogHeader>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <SummaryPill label="Full Package" value={formatMoney(client.package_amount)} />
            <SummaryPill label="Paid" value={formatMoney(client.advance_amount)} />
            <SummaryPill label="Remaining" value={formatMoney(Math.max(client.package_amount - client.advance_amount, 0))} accent />
          </div>
        </div>

        <div className="space-y-5 p-5 sm:p-6">
          {pinStatusLoading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Checking finance security…</div>
          ) : !hasPin && !isUnlocked ? (
            <SecurityPanel title="Set 6 digit finance PIN" icon={ShieldCheck}>
              <div className="grid gap-4 sm:grid-cols-2">
                <PinField label="New PIN" value={pin} onChange={setPinValue} />
                <PinField label="Confirm PIN" value={confirmPin} onChange={setConfirmPin} />
              </div>
              <Button className="h-12 w-full rounded-xl font-black uppercase" onClick={handleSetPin} disabled={setPin.isPending}>Set PIN & Unlock</Button>
            </SecurityPanel>
          ) : !isUnlocked ? (
            <SecurityPanel title="Enter finance PIN" icon={Lock}>
              <PinField label="6 digit PIN" value={pin} onChange={setPinValue} />
              <Button className="h-12 w-full rounded-xl font-black uppercase" onClick={handleVerifyPin} disabled={verifyPin.isPending}>Unlock Editing</Button>
            </SecurityPanel>
          ) : (
            <>
              <div className="animate-in fade-in zoom-in-95 space-y-5 rounded-3xl border border-border bg-card/80 p-4 sm:p-5">
                <h3 className="text-lg font-black uppercase tracking-wide">Add Payment</h3>
                <div className="grid gap-4 lg:grid-cols-[1fr_420px]">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Amount">
                      <Input type="number" min="1" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" className="h-12 rounded-xl bg-background/70 text-lg font-bold" />
                    </Field>
                    <Field label="Payment Type">
                      <Select value={paymentType} onValueChange={(value: PaymentType) => setPaymentType(value)}>
                        <SelectTrigger className="h-12 rounded-xl bg-background/70 font-bold uppercase"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="advance">Advance</SelectItem>
                          <SelectItem value="partial">Partial</SelectItem>
                          <SelectItem value="final">Final</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                    <div className="sm:col-span-2">
                      <Field label="Bank / Payment Method">
                        <FinanceBankSelect banks={banks} value={bankId} onChange={setBankId} onAddBank={handleAddBank} />
                      </Field>
                    </div>
                    <div className="sm:col-span-2">
                      <Field label="Payment Note">
                        <Textarea maxLength={500} value={paymentNote} onChange={e => setPaymentNote(e.target.value)} placeholder="Optional note" className="min-h-24 rounded-xl bg-background/70" />
                      </Field>
                    </div>
                  </div>
                  <XitoDatePicker value={paymentDate} onChange={setPaymentDate} />
                </div>
                <div className="flex flex-col gap-3 rounded-2xl border border-border bg-muted/60 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase text-muted-foreground">Remaining after this payment</p>
                    <p className="text-2xl font-black text-accent">{formatMoney(remainingAfterAdd)}</p>
                  </div>
                  <Button onClick={handleAddPayment} disabled={addPayment.isPending} className="h-12 rounded-xl px-8 font-black uppercase">
                    <Plus className="mr-2 h-4 w-4" /> Add Payment
                  </Button>
                </div>
              </div>

              <LedgerTable
                rows={ledgerRows}
                loading={paymentsLoading}
                clientId={client.id}
                packageAmount={client.package_amount || 0}
                allPayments={payments}
                banks={banks}
                sessionToken={sessionToken}
                onAddBank={handleAddBank}
                onSessionInvalid={() => { clearFinanceSession(); setIsUnlocked(false); }}
                onChanged={onSaved}
              />
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SummaryPill({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return <div className="rounded-2xl border border-border bg-background/60 p-4"><p className="text-xs font-bold uppercase text-muted-foreground">{label}</p><p className={cn('text-xl font-black', accent && 'text-accent')}>{value}</p></div>;
}

function SecurityPanel({ title, icon: Icon, children }: { title: string; icon: typeof Lock; children: React.ReactNode }) {
  return <div className="mx-auto max-w-xl space-y-5 rounded-3xl border border-border bg-card/80 p-5 shadow-sm"><div className="flex items-center gap-2 font-black uppercase"><Icon className="h-4 w-4 text-accent" /> {title}</div>{children}</div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-2"><Label className="text-xs font-black uppercase text-muted-foreground">{label}</Label>{children}</div>;
}

function PinField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <Field label={label}>
      <Input inputMode="numeric" pattern="[0-9]*" maxLength={6} value={value} onChange={(event) => onChange(event.target.value.replace(/\D/g, '').slice(0, 6))} className="h-12 rounded-xl text-center text-lg font-black tracking-[0.5em]" placeholder="••••••" autoComplete="one-time-code" />
    </Field>
  );
}

type LedgerRow = AgencyClientPayment & { remaining: number };

function LedgerTable({
  rows, loading, clientId, packageAmount, allPayments, banks, sessionToken, onAddBank, onSessionInvalid, onChanged,
}: {
  rows: LedgerRow[];
  loading: boolean;
  clientId: string;
  packageAmount: number;
  allPayments: AgencyClientPayment[];
  banks: ReturnType<typeof useAgencyFinanceBanks>['data'] extends infer T ? (T extends undefined ? never : T) : never;
  sessionToken: string | null;
  onAddBank: (bankName: string, accountHolderName: string) => Promise<unknown>;
  onSessionInvalid: () => void;
  onChanged: () => void;
}) {
  const [deleteTarget, setDeleteTarget] = useState<LedgerRow | null>(null);
  const [editTarget, setEditTarget] = useState<LedgerRow | null>(null);
  return (
    <div className="rounded-3xl border border-border bg-card/80 p-4">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-black uppercase"><CreditCard className="h-4 w-4 text-accent" /> Transaction Ledger</h3>
      {loading ? <p className="text-sm text-muted-foreground">Loading transactions…</p> : rows.length === 0 ? <p className="text-sm text-muted-foreground">No transactions yet.</p> : (
        <Table>
          <TableHeader><TableRow><TableHead>Amount</TableHead><TableHead>Type</TableHead><TableHead>BS Date</TableHead><TableHead>AD Date</TableHead><TableHead>Bank</TableHead><TableHead>Remaining</TableHead><TableHead>Time of Entry</TableHead><TableHead>Note</TableHead><TableHead className="w-24 text-right">Actions</TableHead></TableRow></TableHeader>
          <TableBody>
            {rows.map(row => (
              <TableRow key={row.id}>
                <TableCell className="font-black">{formatMoney(row.amount)}</TableCell>
                <TableCell><span className="rounded-full bg-accent/15 px-2 py-1 text-[10px] font-black uppercase text-accent">{row.payment_type}</span></TableCell>
                <TableCell>{row.payment_date_bs || '-'}</TableCell>
                <TableCell>{row.payment_date}</TableCell>
                <TableCell className="min-w-48 uppercase">{row.bank ? `${row.bank.bank_name} (${row.bank.account_holder_name})` : '-'}</TableCell>
                <TableCell className="font-bold text-accent">{formatMoney(row.remaining)}</TableCell>
                <TableCell className="min-w-36"><span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(row.created_at).toLocaleString()}</span></TableCell>
                <TableCell className="min-w-48">{row.note || '-'}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-accent hover:bg-accent/10" onClick={() => setEditTarget(row)} aria-label="Edit transaction">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => setDeleteTarget(row)} aria-label="Delete transaction">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <DeletePaymentDialog
        payment={deleteTarget}
        clientId={clientId}
        onClose={() => setDeleteTarget(null)}
        onDeleted={() => { setDeleteTarget(null); onChanged(); }}
      />
      <EditPaymentDialog
        payment={editTarget}
        clientId={clientId}
        packageAmount={packageAmount}
        allPayments={allPayments}
        banks={banks}
        sessionToken={sessionToken}
        onAddBank={onAddBank}
        onSessionInvalid={onSessionInvalid}
        onClose={() => setEditTarget(null)}
        onSaved={() => { setEditTarget(null); onChanged(); }}
      />
    </div>
  );
}

function EditPaymentDialog({
  payment, clientId, packageAmount, allPayments, banks, sessionToken, onAddBank, onSessionInvalid, onClose, onSaved,
}: {
  payment: LedgerRow | null;
  clientId: string;
  packageAmount: number;
  allPayments: AgencyClientPayment[];
  banks: any;
  sessionToken: string | null;
  onAddBank: (bankName: string, accountHolderName: string) => Promise<unknown>;
  onSessionInvalid: () => void;
  onClose: () => void;
  onSaved: () => void;
}) {
  const editPayments = useEditAgencyClientPayments();
  const [amount, setAmount] = useState('');
  const [paymentType, setPaymentType] = useState<PaymentType>('partial');
  const [adDate, setAdDate] = useState('');
  const [bsDate, setBsDate] = useState('');
  const [bankId, setBankId] = useState<string | null>(null);
  const [note, setNote] = useState('');

  useEffect(() => {
    if (payment) {
      setAmount(String(payment.amount ?? 0));
      setPaymentType(payment.payment_type || 'partial');
      setAdDate(payment.payment_date);
      setBsDate(payment.payment_date_bs || '');
      setBankId(payment.bank_id);
      setNote(payment.note || '');
    }
  }, [payment]);

  const handleSave = async () => {
    if (!payment) return;
    if (!sessionToken) {
      toast({ title: 'Session expired', description: 'Please re-enter your finance PIN.' });
      onSessionInvalid();
      onClose();
      return;
    }
    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      toast({ title: 'Invalid amount', description: 'Amount must be greater than 0.' });
      return;
    }
    const payload = allPayments.map(p => p.id === payment.id ? {
      id: p.id,
      amount: Math.round(parsedAmount),
      payment_type: paymentType,
      payment_date: adDate,
      payment_date_bs: bsDate || null,
      note: note.trim() || null,
      bank_id: bankId,
    } : {
      id: p.id,
      amount: p.amount,
      payment_type: p.payment_type,
      payment_date: p.payment_date,
      payment_date_bs: p.payment_date_bs || null,
      note: p.note || null,
      bank_id: p.bank_id,
    });
    try {
      const result = await editPayments.mutateAsync({ sessionToken, clientId, packageAmount, payments: payload });
      if (!result.success) {
        onSessionInvalid();
        toast({ title: 'Save blocked', description: result.message || 'Please enter PIN again.' });
        return;
      }
      toast({ title: 'Transaction updated', description: 'The ledger was updated.' });
      onSaved();
    } catch (err) {
      toast({ title: 'Save failed', description: err instanceof Error ? err.message : 'Please try again.' });
    }
  };

  return (
    <Dialog open={!!payment} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Pencil className="h-5 w-5 text-accent" /> Edit Transaction</DialogTitle>
          <DialogDescription>Update this payment. Other transactions are unchanged.</DialogDescription>
        </DialogHeader>
        {payment && (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Amount">
                <Input type="number" min="1" value={amount} onChange={e => setAmount(e.target.value)} className="h-11 rounded-xl" />
              </Field>
              <Field label="Type">
                <Select value={paymentType} onValueChange={(v: PaymentType) => setPaymentType(v)}>
                  <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="advance">Advance</SelectItem>
                    <SelectItem value="partial">Partial</SelectItem>
                    <SelectItem value="final">Final</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="AD Date">
                <Input type="date" value={adDate} onChange={e => setAdDate(e.target.value)} className="h-11 rounded-xl" />
              </Field>
              <Field label="BS Date">
                <Input value={bsDate} onChange={e => setBsDate(e.target.value)} placeholder="e.g. 15 Baisakh 2082" className="h-11 rounded-xl" />
              </Field>
            </div>
            <Field label="Bank / Payment Method">
              <FinanceBankSelect banks={banks} value={bankId} onChange={setBankId} onAddBank={onAddBank} />
            </Field>
            <Field label="Note">
              <Textarea maxLength={500} value={note} onChange={e => setNote(e.target.value)} className="min-h-20 rounded-xl" />
            </Field>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={onClose} disabled={editPayments.isPending}>Cancel</Button>
              <Button type="button" onClick={handleSave} disabled={editPayments.isPending}>
                <Pencil className="mr-2 h-4 w-4" /> {editPayments.isPending ? 'Saving…' : 'Save Changes'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function DeletePaymentDialog({ payment, clientId, onClose, onDeleted }: { payment: (AgencyClientPayment & { remaining: number }) | null; clientId: string; onClose: () => void; onDeleted: () => void }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const deleteMutation = useDeleteAgencyClientPayment();

  useEffect(() => {
    if (payment) {
      setPin('');
      setError(null);
    }
  }, [payment]);

  const handleConfirm = async () => {
    if (!payment) return;
    if (!isSixDigitPin(pin)) {
      setError('Enter your 6 digit finance PIN.');
      return;
    }
    setError(null);
    try {
      const result = await deleteMutation.mutateAsync({ pin, paymentId: payment.id, clientId });
      if (!result?.success) {
        setError(result?.message || 'Wrong PIN. Please try again.');
        return;
      }
      toast({ title: 'Transaction deleted', description: 'The ledger and totals were updated.' });
      setPin('');
      onDeleted();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed. Please try again.');
    }
  };

  return (
    <Dialog open={!!payment} onOpenChange={(open) => { if (!open) { setPin(''); setError(null); onClose(); } }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive"><Trash2 className="h-5 w-5" /> Delete Transaction</DialogTitle>
          <DialogDescription>This action is permanent. Re-enter your finance PIN to confirm.</DialogDescription>
        </DialogHeader>
        {payment && (
          <div className="space-y-3">
            <div className="rounded-2xl border border-border bg-muted/40 p-3 text-sm">
              <div className="flex items-center justify-between"><span className="font-bold uppercase text-muted-foreground">Amount</span><span className="font-black">{formatMoney(payment.amount)}</span></div>
              <div className="flex items-center justify-between"><span className="font-bold uppercase text-muted-foreground">Type</span><span className="font-black uppercase">{payment.payment_type}</span></div>
              <div className="flex items-center justify-between"><span className="font-bold uppercase text-muted-foreground">Date</span><span>{payment.payment_date_bs || payment.payment_date}</span></div>
              {payment.bank && <div className="flex items-center justify-between"><span className="font-bold uppercase text-muted-foreground">Bank</span><span className="uppercase">{payment.bank.bank_name}</span></div>}
            </div>
            <Field label="Finance PIN">
              <Input
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="h-12 rounded-xl text-center text-lg font-black tracking-[0.5em]"
                placeholder="••••••"
                autoComplete="one-time-code"
                autoFocus
              />
            </Field>
            {error && <p className="text-sm font-bold text-destructive">{error}</p>}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={onClose} disabled={deleteMutation.isPending}>Cancel</Button>
              <Button type="button" variant="destructive" onClick={handleConfirm} disabled={deleteMutation.isPending}>
                <Trash2 className="mr-2 h-4 w-4" /> {deleteMutation.isPending ? 'Deleting…' : 'Delete Transaction'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
