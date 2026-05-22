import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users,
  Building2,
  CalendarCheck,
  MessageSquare,
  Newspaper,
  Briefcase,
  Megaphone,
  Ban,
  Shield,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: any;
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              {label}
            </p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
          </div>
          <Icon className="w-5 h-5 text-primary" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function AnalyticsPanel() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_platform_stats");
      if (error) throw error;
      return data as any;
    },
  });

  const { data: signups = [] } = useQuery({
    queryKey: ["admin-signups-30"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_signups_by_day", {
        _days: 30,
      });
      if (error) throw error;
      return (data ?? []) as { day: string; signups: number }[];
    },
  });

  if (isLoading || !stats) {
    return <p className="text-sm text-muted-foreground">Loading analytics...</p>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard
          icon={Users}
          label="Total users"
          value={stats.total_users}
          hint={`${stats.signups_last_7d} new this week`}
        />
        <StatCard icon={Building2} label="Agencies" value={stats.total_agencies} />
        <StatCard icon={Users} label="Solo creatives" value={stats.total_solo} />
        <StatCard icon={CalendarCheck} label="Bookings" value={stats.total_bookings} />
        <StatCard icon={Newspaper} label="Feed posts" value={stats.total_feed_posts} />
        <StatCard icon={Briefcase} label="Market jobs" value={stats.total_market_posts} />
        <StatCard
          icon={MessageSquare}
          label="Messages"
          value={Number(stats.total_messages) + Number(stats.total_group_messages)}
          hint={`${stats.total_messages} DMs + ${stats.total_group_messages} group`}
        />
        <StatCard icon={Megaphone} label="Active broadcasts" value={stats.active_broadcasts} />
        <StatCard
          icon={Ban}
          label="Suspended"
          value={stats.suspended_users}
          hint={`${stats.admin_count} admin(s)`}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Signups — last 30 days</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={signups}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="day"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  tickFormatter={(d) =>
                    new Date(d).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })
                  }
                />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                  labelFormatter={(d) => new Date(d).toLocaleDateString()}
                />
                <Line
                  type="monotone"
                  dataKey="signups"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
