import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { MoreVertical, Search, Shield, ShieldOff, Ban, CheckCircle2, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";

type AdminUser = {
  user_id: string;
  email: string;
  full_name: string;
  account_type: string;
  profile_photo_url: string;
  contact_number: string;
  is_admin: boolean;
  is_suspended: boolean;
  suspension_reason: string | null;
  created_at: string;
};

export default function UsersPanel() {
  const { user: me } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [suspendTarget, setSuspendTarget] = useState<AdminUser | null>(null);
  const [reason, setReason] = useState("");

  // Debounce search
  useState(() => {
    const t = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(t);
  });

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin-users", debounced],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_list_users", {
        _search: debounced,
        _limit: 200,
      });
      if (error) throw error;
      return (data ?? []) as AdminUser[];
    },
  });

  const setRole = useMutation({
    mutationFn: async ({ userId, makeAdmin }: { userId: string; makeAdmin: boolean }) => {
      const { error } = await supabase.rpc("admin_set_role", {
        _target_user: userId,
        _make_admin: makeAdmin,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Role updated");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  const setSuspension = useMutation({
    mutationFn: async ({
      userId,
      suspend,
      reason,
    }: {
      userId: string;
      suspend: boolean;
      reason?: string;
    }) => {
      const { error } = await supabase.rpc("admin_set_suspension", {
        _target_user: userId,
        _suspend: suspend,
        _reason: reason ?? null,
      });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      toast.success(vars.suspend ? "User suspended" : "User unsuspended");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      setSuspendTarget(null);
      setReason("");
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>All Users ({users.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative mb-4">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, phone, business..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setDebounced(e.target.value);
            }}
            className="pl-9"
          />
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading users...</p>
        ) : users.length === 0 ? (
          <p className="text-sm text-muted-foreground">No users found.</p>
        ) : (
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {users.map((u) => {
              const isMe = u.user_id === me?.id;
              return (
                <div
                  key={u.user_id}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/30 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-muted flex-shrink-0 overflow-hidden">
                    {u.profile_photo_url ? (
                      <img
                        src={u.profile_photo_url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-sm font-semibold">
                        {(u.full_name || u.email || "?").charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium truncate">
                        {u.full_name || "(no profile)"}
                      </span>
                      {u.is_admin && (
                        <Badge variant="default" className="gap-1">
                          <Shield className="w-3 h-3" /> Admin
                        </Badge>
                      )}
                      {u.is_suspended && (
                        <Badge variant="destructive">Suspended</Badge>
                      )}
                      {u.account_type === "agency" && (
                        <Badge variant="secondary">Agency</Badge>
                      )}
                      {isMe && <Badge variant="outline">You</Badge>}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {u.email} {u.contact_number && `• ${u.contact_number}`}
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" disabled={isMe}>
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => navigate(`/freelancer/${u.user_id}`)}
                      >
                        <ExternalLink className="w-4 h-4 mr-2" /> View profile
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {u.is_admin ? (
                        <DropdownMenuItem
                          onClick={() =>
                            setRole.mutate({ userId: u.user_id, makeAdmin: false })
                          }
                        >
                          <ShieldOff className="w-4 h-4 mr-2" /> Remove admin
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem
                          onClick={() =>
                            setRole.mutate({ userId: u.user_id, makeAdmin: true })
                          }
                        >
                          <Shield className="w-4 h-4 mr-2" /> Make admin
                        </DropdownMenuItem>
                      )}
                      {u.is_suspended ? (
                        <DropdownMenuItem
                          onClick={() =>
                            setSuspension.mutate({
                              userId: u.user_id,
                              suspend: false,
                            })
                          }
                        >
                          <CheckCircle2 className="w-4 h-4 mr-2" /> Unsuspend
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem
                          onClick={() => setSuspendTarget(u)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Ban className="w-4 h-4 mr-2" /> Suspend (read-only)
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      <AlertDialog
        open={!!suspendTarget}
        onOpenChange={(o) => !o && setSuspendTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Suspend {suspendTarget?.full_name || suspendTarget?.email}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              They will be put in read-only mode — they can still browse but
              cannot post, message, book, or edit data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reason">Reason (optional, shown to user)</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Repeated spam reports"
              rows={3}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                suspendTarget &&
                setSuspension.mutate({
                  userId: suspendTarget.user_id,
                  suspend: true,
                  reason: reason.trim() || undefined,
                })
              }
            >
              Confirm suspension
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
