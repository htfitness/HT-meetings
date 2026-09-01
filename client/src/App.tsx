import { Route, Switch } from "wouter";
import { AuthProvider, useAuth } from "./auth";
import Layout from "./components/Layout";
import ActionItemsPage from "./pages/ActionItems";
import AdminPage from "./pages/Admin";
import CurrentMeetingPage from "./pages/CurrentMeeting";
import DashboardPage from "./pages/Dashboard";
import HistoryPage from "./pages/History";
import LoginPage from "./pages/Login";
import MeetingPage from "./pages/Meeting";
import NextAgendaPage from "./pages/NextAgenda";
import SearchPage from "./pages/Search";
import SetupPage from "./pages/Setup";
import TemplatePage from "./pages/Template";
import TopicsPage from "./pages/Topics";

function AppRoutes() {
  const { user, loading, needsSetup } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-ht-teal border-t-transparent" />
      </div>
    );
  }

  if (needsSetup) return <SetupPage />;
  if (!user) return <LoginPage />;

  return (
    <Layout>
      <Switch>
        <Route path="/" component={DashboardPage} />
        <Route path="/current" component={CurrentMeetingPage} />
        <Route path="/next-agenda" component={NextAgendaPage} />
        <Route path="/history" component={HistoryPage} />
        <Route path="/meetings/:id" component={MeetingPage} />
        <Route path="/topics" component={TopicsPage} />
        <Route path="/action-items" component={ActionItemsPage} />
        <Route path="/search" component={SearchPage} />
        <Route path="/template" component={TemplatePage} />
        <Route path="/admin" component={AdminPage} />
        <Route>
          <div className="p-8 text-center text-ht-gray">Page not found.</div>
        </Route>
      </Switch>
    </Layout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
