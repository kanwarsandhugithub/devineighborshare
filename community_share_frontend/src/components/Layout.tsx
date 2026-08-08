import { Outlet, useNavigate, useLocation, Link } from "react-router-dom";
import { Home, MessageSquare, User, ClipboardList, Shield, Plus } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useState } from "react";

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [showCreateDialog, setShowCreateDialog] = useState(false);

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

  const handleCreateItem = () => {
    setShowCreateDialog(false);
    navigate("/?create=item");
  };

  const handleCreateService = () => {
    setShowCreateDialog(false);
    navigate("/?create=service");
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Top navigation bar */}
      <div className="fixed top-0 left-0 right-0 bg-white border-b px-4 py-3 flex justify-between items-center max-w-2xl mx-auto z-10">
        <h1 className="text-lg font-bold text-emerald-600">VicinityShare</h1>
        <button
          onClick={() => setShowCreateDialog(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Create Listing
        </button>
      </div>
      
      <div className="pt-16">
        <Outlet />
      </div>
      
      <div className="flex justify-center gap-3 py-3 text-xs text-gray-400 max-w-2xl mx-auto">
        <Link to="/terms" className="hover:text-emerald-600 hover:underline">Terms of Service</Link>
        <span>|</span>
        <Link to="/privacy" className="hover:text-emerald-600 hover:underline">Privacy Policy</Link>
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

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>What would you like to create?</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Button
              onClick={handleCreateItem}
              className="w-full bg-emerald-600 hover:bg-emerald-700"
              size="lg"
            >
              <Plus className="w-5 h-5 mr-2" />
              List an Item
            </Button>
            <Button
              onClick={handleCreateService}
              className="w-full bg-blue-600 hover:bg-blue-700"
              size="lg"
            >
              <Plus className="w-5 h-5 mr-2" />
              Offer a Service
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
