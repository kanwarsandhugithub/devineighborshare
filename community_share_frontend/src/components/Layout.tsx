import { useState, useEffect } from "react";
import { Outlet, useNavigate, useLocation, Link } from "react-router-dom";
import { Home, MessageSquare, User, ClipboardList, Shield } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { api } from "../api";
import NotificationBell from "./NotificationBell";

declare const __BUILD_VERSION__: string;
declare const __BUILD_TIME__: string;

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [adminCommunityId, setAdminCommunityId] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const data = await api.getMyCommunities();
        const adminComm = data.find((c: any) => c.created_by === user?.id);
        if (adminComm) setAdminCommunityId(adminComm.id);
      } catch {
        // ignore
      }
    };
    load();
  }, [user]);

  const tabs = [
    { path: "/", icon: Home, label: "Home" },
    { path: "/requests", icon: ClipboardList, label: "Requests" },
    { path: "/messages", icon: MessageSquare, label: "Messages" },
    { path: "/profile", icon: User, label: "Profile" },
  ];

  const adminTabs = [
    { path: "/admin", icon: Shield, label: "Admin" },
  ];

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="fixed top-3 right-3 z-50">
        <NotificationBell />
      </div>
      <Outlet />
      <div className="flex justify-center gap-3 py-3 text-xs text-gray-400 max-w-2xl mx-auto">
        <Link to="/terms" className="hover:text-emerald-600 hover:underline">Terms of Service</Link>
        <span>|</span>
        <Link to="/privacy" className="hover:text-emerald-600 hover:underline">Privacy Policy</Link>
      </div>
      <div className="text-center text-[10px] text-gray-300 pb-2 max-w-2xl mx-auto">
        Build {__BUILD_VERSION__} · {new Date(__BUILD_TIME__).toLocaleString()}
      </div>
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around py-2 max-w-2xl mx-auto">
        {tabs.map((tab) => (
          <button
            key={tab.path}
            onClick={() => navigate(tab.path)}
            className={`flex flex-col items-center gap-0.5 px-4 py-1 rounded-lg transition-colors ${
              isActive(tab.path) ? "text-emerald-600" : "text-gray-400 hover:text-gray-600"
            }`}
          >
            <tab.icon className="w-5 h-5" />
            <span className="text-xs">{tab.label}</span>
          </button>
        ))}
        {adminCommunityId && (
          <button
            onClick={() => navigate(`/community/${adminCommunityId}/admin`)}
            className={`flex flex-col items-center gap-0.5 px-4 py-1 rounded-lg transition-colors ${
              isActive(`/community/${adminCommunityId}/admin`) ? "text-emerald-600" : "text-gray-400 hover:text-gray-600"
            }`}
          >
            <Shield className="w-5 h-5" />
            <span className="text-xs">Admin</span>
          </button>
        )}
        {user?.email === "kanwarsandhu@gmail.com" && adminTabs.map((tab) => (
          <button
            key={tab.path}
            onClick={() => navigate(tab.path)}
            className={`flex flex-col items-center gap-0.5 px-4 py-1 rounded-lg transition-colors ${
              isActive(tab.path) ? "text-emerald-600" : "text-gray-400 hover:text-gray-600"
            }`}
          >
            <tab.icon className="w-5 h-5" />
            <span className="text-xs">{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
