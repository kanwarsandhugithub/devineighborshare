import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { Home, MessageSquare, User, ClipboardList } from "lucide-react";

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();

  const tabs = [
    { path: "/", icon: Home, label: "Home" },
    { path: "/requests", icon: ClipboardList, label: "Requests" },
    { path: "/messages", icon: MessageSquare, label: "Messages" },
    { path: "/profile", icon: User, label: "Profile" },
  ];

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <Outlet />
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
      </nav>
    </div>
  );
}
