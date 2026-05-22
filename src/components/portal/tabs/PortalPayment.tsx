export default function PortalPayment({ data }: { data: any }) {
  const payments: any[] = data.payments || [];
  const total = payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const pkg = Number(data.client?.package_amount || 0);
  const balance = Math.max(0, pkg - total);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-gradient-to-br from-[#7a4f2a] to-[#a0683a] text-white p-5 shadow-lg">
        <p className="text-[11px] uppercase tracking-[0.2em] opacity-80">Package amount</p>
        <p className="text-3xl mt-1" style={{ fontFamily: '"Cormorant Garamond", serif' }}>NPR {pkg.toLocaleString()}</p>
        <div className="grid grid-cols-2 gap-2 mt-4 text-sm">
          <div className="rounded-lg bg-white/10 p-3">
            <p className="opacity-80 text-xs">Paid</p>
            <p className="font-medium">NPR {total.toLocaleString()}</p>
          </div>
          <div className="rounded-lg bg-white/10 p-3">
            <p className="opacity-80 text-xs">Balance</p>
            <p className="font-medium">NPR {balance.toLocaleString()}</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white border border-slate-100 p-4">
        <h3 className="text-lg mb-2" style={{ fontFamily: '"Cormorant Garamond", serif', fontWeight: 600 }}>Payment history</h3>
        {payments.length === 0 && <p className="text-sm text-slate-500">No payments recorded yet.</p>}
        <ul className="divide-y divide-slate-100">
          {payments.map((p) => (
            <li key={p.id} className="py-2 flex justify-between text-sm">
              <div>
                <div className="font-medium">NPR {Number(p.amount).toLocaleString()}</div>
                <div className="text-xs text-slate-500">{p.payment_date} · {p.payment_type}</div>
                {p.note && <div className="text-xs text-slate-400">{p.note}</div>}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
