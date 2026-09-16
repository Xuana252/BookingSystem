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
            <Route path="/admin/rooms" element={<ManageRoomsPage />} />
            <Route path="/admin/users" element={<ManageUsersPage />} />
            <Route path="/admin/analytics" element={<AdminAnalyticsPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}
