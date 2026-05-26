import { QueryClient } from "@tanstack/react-query";
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
import GuestPortal from "./pages/GuestPortal";
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
import CompanyVideoEditTracker from "./pages/CompanyVideoEditTracker";
import CompanyPhotoEditTracker from "./pages/CompanyPhotoEditTracker";
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

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { isAdmin, isLoading: adminLoading } = useIsAdmin();
  const { data: profile, isLoading: profileLoading, isFetching: profileFetching, fetchStatus } = useMyProfile();
  const profileNotResolved = !!user && (profileLoading || profileFetching || fetchStatus === 'idle' && profile === undefined);

  if (loading || (!!user && adminLoading) || profileNotResolved) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

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
  const { isAdmin, isLoading: adminLoading } = useIsAdmin();
  const { data: profile, isLoading: profileLoading, isFetching: profileFetching, fetchStatus } = useMyProfile();
  const profileNotResolved = !!user && (profileLoading || profileFetching || (fetchStatus === 'idle' && profile === undefined));

  if (loading || (!!user && adminLoading) || profileNotResolved) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  if (user && isAdmin) return <Navigate to="/admin" replace />;
  if (user && !profile) return <Navigate to="/register" replace />;

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

function RegisterGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { isAdmin, isLoading: adminLoading } = useIsAdmin();
  if (loading || (!!user && adminLoading)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;
  if (isAdmin) return <Navigate to="/admin" replace />;
  return <>{children}</>;
}

/** Company suite routes bypass the main app shell entirely */
function CompanyGate() {
  const { user, loading } = useAuth();
  const { isAdmin, isLoading: adminLoading } = useIsAdmin();
  const { data: profile, isLoading, isFetching, fetchStatus } = useMyProfile();
  const { data: myCompanies = [], isLoading: companiesLoading } = useMyCompanies();
  const profileNotResolved = !!user && (isLoading || isFetching || (fetchStatus === 'idle' && profile === undefined));

  if (loading || (!!user && adminLoading) || profileNotResolved || (!!user && companiesLoading)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
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
  const { data: profile, isLoading, isFetching, fetchStatus } = useMyProfile();
  const profileNotResolved = !!user && (isLoading || isFetching || (fetchStatus === 'idle' && profile === undefined));

  if (loading || profileNotResolved) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
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
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <NavHistoryProvider>
              <ActiveCompanyProvider>
              <OAuthHashCleaner />
              <ScrollToTop />
              <PersistentIframeHost />
              <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/guest" element={<GuestPortal />} />
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
                <Route path="video-edit" element={<PermissionGate section="all_clients"><CompanyVideoEditTracker /></PermissionGate>} />
                <Route path="photo-edit" element={<PermissionGate section="all_clients"><CompanyPhotoEditTracker /></PermissionGate>} />
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
