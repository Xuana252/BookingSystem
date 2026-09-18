import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthWatcher } from "./components/AuthWatcher";
import { Layout } from "./components/Layout";
import { HomePage } from "./pages/HomePage";
import { MyBookingsPage } from "./pages/MyBookingsPage";
import { LoginPage } from "./pages/LoginPage";
import { ManageRoomsPage } from "./pages/ManageRoomsPage";
import { ManageUsersPage } from "./pages/ManageUsersPage";
import { AdminAnalyticsPage } from "./pages/AdminAnalyticsPage";
import { ColleagueDirectoryPage } from "./pages/ColleagueDirectoryPage";
import { MyPreferencesPage } from "./pages/MyPreferencesPage";
import { AdminSettingsPage } from "./pages/AdminSettingsPage";
import { AdminAuditLogsPage } from "./pages/AdminAuditLogsPage";
import { AdminMaintenancePage } from "./pages/AdminMaintenancePage";

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthWatcher />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<Layout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/my-bookings" element={<MyBookingsPage />} />
            <Route path="/directory" element={<ColleagueDirectoryPage />} />
            <Route path="/preferences" element={<MyPreferencesPage />} />
            <Route path="/admin/rooms" element={<ManageRoomsPage />} />
            <Route path="/admin/users" element={<ManageUsersPage />} />
            <Route path="/admin/analytics" element={<AdminAnalyticsPage />} />
            <Route path="/admin/settings" element={<AdminSettingsPage />} />
            <Route path="/admin/logs" element={<AdminAuditLogsPage />} />
            <Route path="/admin/maintenance" element={<AdminMaintenancePage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}
