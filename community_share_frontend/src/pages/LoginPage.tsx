import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { api } from "../api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Home, ArrowLeft } from "lucide-react";

type View = "login" | "forgot" | "reset" | "success";

export default function LoginPage({ onSwitch, onShowTerms, onShowPrivacy }: { onSwitch: () => void; onShowTerms?: () => void; onShowPrivacy?: () => void }) {
  const { login } = useAuth();
  const [view, setView] = useState<View>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");

  // Check for reset_token in URL (from password reset email link)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("reset_token");
    if (token) {
      setResetToken(token);
      setView("reset");
      setMessage("Enter your new password below.");
      // Clean up the URL without reloading
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    try {
      await api.forgotPassword(email);
      setMessage("If an account with that email exists, a password reset link has been sent. Please check your email (including spam/junk folder).");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process request");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    try {
      await api.resetPassword(resetToken, newPassword);
      setView("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  const resetState = () => {
    setView("login");
    setError("");
    setMessage("");
    setResetToken("");
    setNewPassword("");
    setConfirmPassword("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
            <Home className="w-8 h-8 text-emerald-600" />
          </div>
          {view === "login" && (
            <>
              <CardTitle className="text-2xl">Welcome Back</CardTitle>
              <CardDescription>Sign in to ViciLend</CardDescription>
            </>
          )}
          {view === "forgot" && (
            <>
              <CardTitle className="text-2xl">Forgot Password</CardTitle>
              <CardDescription>Enter your email to reset your password</CardDescription>
            </>
          )}
          {view === "reset" && (
            <>
              <CardTitle className="text-2xl">Reset Password</CardTitle>
              <CardDescription>Enter your new password</CardDescription>
            </>
          )}
          {view === "success" && (
            <>
              <CardTitle className="text-2xl">Password Reset</CardTitle>
              <CardDescription>Your password has been updated</CardDescription>
            </>
          )}
        </CardHeader>
        <CardContent>
          {view === "login" && (
            <>
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">{error}</div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
                </div>
                <div className="text-right">
                  <button type="button" onClick={() => { setError(""); setView("forgot"); }} className="text-sm text-emerald-600 hover:underline">
                    Forgot password?
                  </button>
                </div>
                <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={loading}>
                  {loading ? "Signing in..." : "Sign In"}
                </Button>
              </form>
              <p className="text-center text-sm text-gray-500 mt-4">
                Don't have an account?{" "}
                <button onClick={onSwitch} className="text-emerald-600 hover:underline font-medium">Sign up</button>
              </p>
            </>
          )}

          {view === "forgot" && (
            <>
              <form onSubmit={handleForgotPassword} className="space-y-4">
                {error && (
                  <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">{error}</div>
                )}
                {message && (
                  <div className="bg-emerald-50 text-emerald-700 text-sm p-3 rounded-lg">{message}</div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="reset-email">Email</Label>
                  <Input id="reset-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
                </div>
                <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={loading}>
                  {loading ? "Sending..." : "Reset Password"}
                </Button>
              </form>
              <button onClick={resetState} className="flex items-center gap-1 text-sm text-emerald-600 hover:underline mt-4 mx-auto">
                <ArrowLeft className="w-3 h-3" /> Back to sign in
              </button>
            </>
          )}

          {view === "reset" && (
            <>
              <form onSubmit={handleResetPassword} className="space-y-4">
                {error && (
                  <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">{error}</div>
                )}
                {message && (
                  <div className="bg-emerald-50 text-emerald-700 text-sm p-3 rounded-lg">{message}</div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <Input id="new-password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" required minLength={6} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm Password</Label>
                  <Input id="confirm-password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" required minLength={6} />
                </div>
                <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={loading}>
                  {loading ? "Resetting..." : "Set New Password"}
                </Button>
              </form>
              <button onClick={resetState} className="flex items-center gap-1 text-sm text-emerald-600 hover:underline mt-4 mx-auto">
                <ArrowLeft className="w-3 h-3" /> Back to sign in
              </button>
            </>
          )}

          {view === "success" && (
            <div className="text-center space-y-4">
              <div className="bg-emerald-50 text-emerald-700 text-sm p-3 rounded-lg">
                Your password has been reset successfully. You can now sign in with your new password.
              </div>
              <Button onClick={resetState} className="w-full bg-emerald-600 hover:bg-emerald-700">
                Back to Sign In
              </Button>
            </div>
          )}

          <div className="flex justify-center gap-3 mt-4 text-xs text-gray-400">
            <button onClick={onShowTerms} className="hover:text-emerald-600 hover:underline">Terms of Service</button>
            <span>|</span>
            <button onClick={onShowPrivacy} className="hover:text-emerald-600 hover:underline">Privacy Policy</button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
