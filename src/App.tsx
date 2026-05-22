import { QueryClient, useQueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { useEffect, useMemo } from "react";
import { buildPersister, pruneOtherUserCaches, shouldPersistQuery } from "@/lib/queryPersister";
import { BrowserRouter, Route, Routes, Navigate, Outlet } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import OfflineBanner from "@/components/OfflineBanner";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ViewModeProvider, useViewMode } from "@/contexts/ViewModeContext";
import { NavHistoryProvider } from "@/contexts/NavHistoryContext";
import { ActiveCompanyProvider } from "@/contexts/ActiveCompanyContext";
import { useMyProfile } from "@/hooks/useProfile";
import { useMyCompanies } from "@/hooks/useMyCompanies";
import BottomNav from "@/components/BottomNav";
import DesktopShell from "@/components/DesktopShell";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Registration from "./pages/Registration";
import Discover from "./pages/Discover";
import Profile from "./pages/Profile";
import EditProfile from "./pages/EditProfile";
import FreelancerDetail from "./pages/FreelancerDetail";
import Market from "./pages/Market";
import XitoEvents from "./pages/XitoEvents";
import KeepAliveOutlet from "@/components/KeepAliveOutlet";
import PersistentIframeHost from "@/components/PersistentIframeHost";

import Dashboard from "./pages/Dashboard";
import Lagan from "./pages/Lagan";
import PostDetail from "./pages/PostDetail";
import UserPostsFeed from "./pages/UserPostsFeed";
import Settings from "./pages/Settings";
import Chat from "./pages/Chat";
import ChatRoom from "./pages/ChatRoom";
import GroupChatRoom from "./pages/GroupChatRoom";
import FollowRequests from "./pages/FollowRequests";
import EventForm from "./pages/EventForm";
import ClientPortal from "./pages/ClientPortal";
import CompanySuiteShell from "./components/company/CompanySuiteShell";
import CompanyHome from "./pages/CompanyHome";
import CompanyQuickAdd from "./pages/CompanyQuickAdd";
import CompanyBooked from "./pages/CompanyBooked";
import CompanyFinance from "./pages/CompanyFinance";
import CompanySettings from "./pages/CompanySettings";
import CompanyStaffDetail from "./pages/CompanyStaffDetail";
import CompanyAllClients from "./pages/CompanyAllClients";
import CompanyMyFreelancers from "./pages/CompanyMyFreelancers";
import CompanyClientDetail from "./pages/CompanyClientDetail";
import CompanyFileManagement from "./pages/CompanyFileManagement";
import CompanyFileClientDetail from "./pages/CompanyFileClientDetail";
import FreelancerListView from "./components/company/FreelancerListView";
import PermissionGate from "./components/company/PermissionGate";
import NotFound from "./pages/NotFound";
import GuestSignUpPrompt from "./components/GuestSignUpPrompt";
import ScrollToTop from "./components/ScrollToTop";
import BookingReminderPopup from "./components/BookingReminderPopup";
import BroadcastPopup from "./components/BroadcastPopup";
import SuspendedBanner from "./components/SuspendedBanner";
import Admin from "./pages/Admin";
import { useIsAdmin } from "@/hooks/useIsAdmin";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10_000,
      // Hold data for as long as the browser keeps it — persisted entries
      // remain rehydratable indefinitely so the app keeps working offline.
      gcTime: Infinity,
      refetchOnWindowFocus: false,
      // Don't hammer the network with retries when offline; first failure surfaces fast.
      retry: (failureCount) => (navigator.onLine ? failureCount < 2 : false),
      networkMode: "offlineFirst",
    },
    mutations: {
      // Queue mutations while offline; they'll resume automatically when back online.
      networkMode: "offlineFirst",
      retry: 1,
    },
  },
});

function AppShell({ children }: { children: React.ReactNode }) {
  const { effectiveMode } = useViewMode();
  if (effectiveMode === 'desktop') {
    return <DesktopShell>{children}</DesktopShell>;
  }
  return <>{children}</>;
}

function ErrorRecovery({ message, detail }: { message?: string; detail?: string }) {
  const qc = useQueryClient();
  const handleRetry = () => {
    qc.invalidateQueries({ queryKey: ['my-profile'] });
    qc.invalidateQueries({ queryKey: ['my-companies'] });
    qc.invalidateQueries({ queryKey: ['is-admin'] });
  };
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="flex flex-col items-center gap-5 p-8 rounded-2xl bg-card border border-border shadow-xl max-w-sm mx-4 text-center">
        <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-1">Failed to load</h2>
          <p className="text-sm text-muted-foreground">{message || 'Something went wrong. Please check your connection and try again.'}</p>
          {detail && <p className="text-xs text-destructive/70 mt-2 font-mono break-all">{detail}</p>}
        </div>
        <button
          onClick={handleRetry}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium shadow-sm hover:opacity-90 transition-opacity"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Try Again
        </button>
      </div>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { isAdmin, isLoading: adminLoading, isError: adminError } = useIsAdmin();
  const { data: profile, isPending: profilePending, isError: profileError } = useMyProfile();

  // Show spinner only while genuinely loading (not on error)
  if (loading || (!!user && !adminError && adminLoading) || (!!user && !profileError && profilePending)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (profileError || adminError) return <ErrorRecovery message="Could not load your profile. Please try again." />;
  if (!user) return <Navigate to="/auth" replace />;
  if (isAdmin) return <Navigate to="/admin" replace />;
  if (!profile) return <Navigate to="/register" replace />;

  return (
    <AppShell>
      <SuspendedBanner />
      {children}
      <BottomNav />
      <BookingReminderPopup />
      <BroadcastPopup />
    </AppShell>
  );
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { isAdmin, isLoading: adminLoading, isError: adminError } = useIsAdmin();
  const { data: profile, isPending: profilePending, isError: profileError } = useMyProfile();

  if (loading || (!!user && !adminError && adminLoading) || (!!user && !profileError && profilePending)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (user && (profileError || adminError)) return <ErrorRecovery message="Could not load your profile. Please try again." />;

  if (user && isAdmin) {
    return <Navigate to="/admin" replace />;
  }

  if (user && !profile) {
    return <Navigate to="/register" replace />;
  }

  return (
    <AppShell>
      <SuspendedBanner />
      {children}
      <BottomNav />
      {!user && <GuestSignUpPrompt />}
      <BookingReminderPopup />
      <BroadcastPopup />
    </AppShell>
  );
}

function RegisterGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { isAdmin, isLoading: adminLoading, isError: adminError } = useIsAdmin();
  if (loading || (!!user && !adminError && adminLoading)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (adminError) return <ErrorRecovery message="Could not verify your account. Please try again." />;
  if (!user) return <Navigate to="/auth" replace />;
  if (isAdmin) return <Navigate to="/admin" replace />;
  return <>{children}</>;
}

/** Company suite routes bypass the main app shell entirely */
function CompanyGate() {
  const { user, loading } = useAuth();
  const { isAdmin, isLoading: adminLoading, isError: adminError } = useIsAdmin();
  const profileQuery = useMyProfile();
  const companiesQuery = useMyCompanies();
  const { data: profile, isPending: profilePending, isError: profileError } = profileQuery;
  const { data: myCompanies = [], isPending: companiesPending, isError: companiesError } = companiesQuery;

  const anyError = profileError || companiesError || adminError;
  const stillLoading = loading
    || (!!user && !adminError && adminLoading)
    || (!!user && !profileError && profilePending)
    || (!!user && !companiesError && companiesPending);

  if (!anyError && stillLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (anyError) {
    const errMsg = profileError ? String(profileQuery.error) : companiesError ? String(companiesQuery.error) : 'Admin check failed';
    console.error('[CompanyGate] Query error:', { profileError: profileQuery.error, companiesError: companiesQuery.error, adminError });
    return <ErrorRecovery message="Could not load your company data. Please try again." detail={errMsg} />;
  }
  if (!user) return <Navigate to="/auth" replace />;
  if (isAdmin) return <Navigate to="/admin" replace />;
  if (!profile) return <Navigate to="/register" replace />;
  // Allow agency owners OR staff members of any company
  if (profile.account_type !== 'agency' && myCompanies.length === 0) {
    return <Navigate to="/" replace />;
  }

  return <CompanySuiteShell />;
}

/** File Management runs full-screen WITHOUT the Suite Shell sidebar */
function FileManagementGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { data: profile, isPending: profilePending, isError: profileError } = useMyProfile();

  if (loading || (!!user && !profileError && profilePending)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (profileError) return <ErrorRecovery message="Could not load your profile. Please try again." />;
  if (!user) return <Navigate to="/auth" replace />;
  if (!profile) return <Navigate to="/register" replace />;
  // Owners (account_type=agency) and staff (solo_creative with company access)
  // both reach here; PermissionGate inside enforces the actual file_management
  // section guard against the active company.
  return <>{children}</>;
}

function PersistedQueryProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  useEffect(() => {
    pruneOtherUserCaches(userId);
  }, [userId]);

  const persister = useMemo(() => buildPersister(userId), [userId]);

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: 24 * 60 * 60 * 1000,
        dehydrateOptions: { shouldDehydrateQuery: shouldPersistQuery },
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}

function OAuthHashCleaner() {
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.includes('error=') && !hash.includes('error_description=')) return;

    const params = new URLSearchParams(hash.slice(1));
    const errorDescription = decodeURIComponent(params.get('error_description') || '').toLowerCase();
    if (errorDescription.includes('provider') && errorDescription.includes('google')) {
      window.history.replaceState(null, document.title, `${window.location.pathname}${window.location.search}`);
    }
  }, []);

  return null;
}

const App = () => (
  <AuthProvider>
    <PersistedQueryProvider>
      <ViewModeProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <OfflineBanner />
          <BrowserRouter>
            <NavHistoryProvider>
              <ActiveCompanyProvider>
              <OAuthHashCleaner />
              <ScrollToTop />
              <PersistentIframeHost />
              <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/register" element={<RegisterGate><Registration /></RegisterGate>} />

              {/* Main public routes share a PublicRoute shell + KeepAlive cache for tabs */}
              <Route
                element={
                  <PublicRoute>
                    <KeepAliveOutlet
                      routes={[
                        { path: "/", element: <Dashboard /> },
                        { path: "/bookings", element: <Index /> },
                        { path: "/discover", element: <Discover /> },
                        { path: "/market", element: <Market /> },
                        { path: "/profile", element: <Profile /> },
                        { path: "/xito-events", element: <XitoEvents /> },
                      ]}
                      fallback={<Outlet />}
                    />
                  </PublicRoute>
                }
              >
                <Route path="/" element={null} />
                <Route path="/bookings" element={null} />
                <Route path="/discover" element={null} />
                <Route path="/market" element={null} />
                <Route path="/profile" element={null} />
                <Route path="/xito-events" element={null} />
                <Route path="/lagan" element={<Lagan />} />
                <Route path="/freelancer/:id" element={<FreelancerDetail />} />
                <Route path="/post/:postId" element={<PostDetail />} />
                <Route path="/profile-posts/:userId/:postId" element={<UserPostsFeed />} />
                <Route path="/chat" element={<Chat />} />
              </Route>

              <Route path="/edit-profile" element={<ProtectedRoute><EditProfile /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
              <Route path="/chat/group/wedding" element={<ProtectedRoute><GroupChatRoom /></ProtectedRoute>} />
              <Route path="/chat/:conversationId" element={<ProtectedRoute><ChatRoom /></ProtectedRoute>} />
              <Route path="/follow-requests" element={<ProtectedRoute><FollowRequests /></ProtectedRoute>} />
              <Route path="/event-form/:token" element={<EventForm />} />
              <Route path="/client-portal/:slug/:clientId" element={<ClientPortal />} />
              <Route path="/admin" element={<Admin />} />

              {/* File Management — full-screen, no suite shell */}
              <Route path="/company/files" element={<FileManagementGate><PermissionGate section="file_management"><CompanyFileManagement /></PermissionGate></FileManagementGate>} />
              <Route path="/company/files/client/:clientId" element={<FileManagementGate><PermissionGate section="file_management"><CompanyFileClientDetail /></PermissionGate></FileManagementGate>} />

              {/* Company Suite — full-screen, own shell, no main app nav */}
              <Route path="/company" element={<CompanyGate />}>
                <Route index element={<CompanyHome />} />
                <Route path="all-clients" element={<PermissionGate section="event_management"><CompanyAllClients /></PermissionGate>} />
                <Route path="clients" element={<PermissionGate section="all_clients"><CompanyClientDetail /></PermissionGate>} />
                <Route path="clients/:clientId" element={<PermissionGate section="all_clients"><CompanyClientDetail /></PermissionGate>} />
                <Route path="my-freelancers" element={<PermissionGate section="my_freelancers"><CompanyMyFreelancers /></PermissionGate>} />
                <Route path="my-freelancers/list" element={<PermissionGate section="my_freelancers"><FreelancerListView /></PermissionGate>} />
                <Route path="quick-add" element={<PermissionGate section="add_client"><CompanyQuickAdd /></PermissionGate>} />
                <Route path="booked" element={<PermissionGate section="booked"><CompanyBooked /></PermissionGate>} />
                <Route path="finance" element={<PermissionGate section="finance"><CompanyFinance /></PermissionGate>} />
                <Route path="settings" element={<PermissionGate section="settings"><CompanySettings /></PermissionGate>} />
                <Route path="settings/staff/:invitationId" element={<PermissionGate section="settings"><CompanyStaffDetail /></PermissionGate>} />
              </Route>

              <Route path="*" element={<NotFound />} />
              </Routes>
              </ActiveCompanyProvider>
            </NavHistoryProvider>
          </BrowserRouter>
        </TooltipProvider>
      </ViewModeProvider>
    </PersistedQueryProvider>
  </AuthProvider>
);

export default App;
