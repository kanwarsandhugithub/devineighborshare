import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Home } from "lucide-react";

export default function RegisterPage({ onSwitch, onShowTerms, onShowPrivacy }: { onSwitch: () => void; onShowTerms?: () => void; onShowPrivacy?: () => void }) {
  const { register } = useAuth();
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register(email, fullName, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
            <Home className="w-8 h-8 text-emerald-600" />
          </div>
          <CardTitle className="text-2xl">Join VicinityShare</CardTitle>
          <CardDescription>Lending in my vicinity</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">{error}</div>
            )}
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="John Smith" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} />
            </div>
            <p className="text-xs text-gray-400 text-center">
              By creating an account, you agree to our{" "}
              <button type="button" onClick={onShowTerms} className="text-emerald-600 hover:underline">Terms of Service</button>{" "}
              and{" "}
              <button type="button" onClick={onShowPrivacy} className="text-emerald-600 hover:underline">Privacy Policy</button>.
            </p>
            <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={loading}>
              {loading ? "Creating account..." : "Create Account"}
            </Button>
          </form>
          <p className="text-center text-sm text-gray-500 mt-4">
            Already have an account?{" "}
            <button onClick={onSwitch} className="text-emerald-600 hover:underline font-medium">Sign in</button>
          </p>
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
