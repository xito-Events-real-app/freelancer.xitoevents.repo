import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import type { AgencyFinanceBank } from '@/hooks/useAgencyFinance';

interface Props {
  banks: AgencyFinanceBank[];
  value: string | null;
  onChange: (bankId: string | null) => void;
  onAddBank: (bankName: string, accountHolderName: string) => Promise<unknown>;
  disabled?: boolean;
}

export default function FinanceBankSelect({ banks, value, onChange, onAddBank, disabled }: Props) {
  const [adding, setAdding] = useState(false);
  const [bankName, setBankName] = useState('');
  const [holderName, setHolderName] = useState('');
  const [saving, setSaving] = useState(false);

  const saveBank = async () => {
    if (!bankName.trim() || !holderName.trim()) return;
    setSaving(true);
    try {
      const created: any = await onAddBank(bankName, holderName);
      onChange(created?.id ?? null);
      setBankName('');
      setHolderName('');
      setAdding(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <Select value={value ?? 'none'} onValueChange={(next) => next === '__add__' ? setAdding(true) : onChange(next === 'none' ? null : next)} disabled={disabled}>
        <SelectTrigger className="h-12 rounded-xl border-border bg-background/70 font-semibold uppercase">
          <SelectValue placeholder="Select bank" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">NO BANK SELECTED</SelectItem>
          {banks.map(bank => (
            <SelectItem key={bank.id} value={bank.id}>{bank.bank_name} ({bank.account_holder_name})</SelectItem>
          ))}
          <SelectItem value="__add__">+ ADD BANK</SelectItem>
        </SelectContent>
      </Select>

      {adding && (
        <div className="animate-in fade-in zoom-in-95 space-y-3 rounded-2xl border border-border bg-muted/60 p-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase">Bank name</Label>
              <Input value={bankName} onChange={e => setBankName(e.target.value.toUpperCase())} placeholder="SUNRISE BANK LTD" className="uppercase" maxLength={100} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase">Account holder</Label>
              <Input value={holderName} onChange={e => setHolderName(e.target.value.toUpperCase())} placeholder="AKASH SHRESTHA" className="uppercase" maxLength={100} />
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="button" size="sm" onClick={saveBank} disabled={saving || !bankName.trim() || !holderName.trim()} className="rounded-full">
              <Plus className="mr-1 h-3 w-3" /> Add Bank
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setAdding(false)} className="rounded-full">Cancel</Button>
          </div>
        </div>
      )}
    </div>
  );
}
