import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Building2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth-context";
import { firstError, isEmail, isNonEmpty } from "@/lib/validation";

export function LoginPage() {
  const { auth, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (auth) {
    return <Navigate to={auth.role === "Contact" ? "/portal" : "/"} replace />;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const validationError = firstError([
      [isNonEmpty(email), "Email is required."],
      [isEmail(email), "Enter a valid email address."],
      [isNonEmpty(password), "Password is required."],
    ]);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const result = await login(email, password);
      navigate(result.role === "Contact" ? "/portal" : "/", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4 font-sans text-slate-900 antialiased">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-800 bg-slate-900 text-white shadow-subtle">
            <Building2 className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-display text-lg font-bold tracking-tight text-slate-900">Urban Furniture</h1>
            <p className="text-xs text-slate-500">Accounting &amp; Enterprise Ledger</p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          noValidate
          className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-card"
        >
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Sign in to continue</h2>
            <p className="mt-0.5 text-xs text-slate-500">Use your accounting workspace credentials.</p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email" required className="text-xs font-medium text-slate-700">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-9 border-slate-200 bg-white text-xs shadow-2xs focus:border-slate-400"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password" required className="text-xs font-medium text-slate-700">
              Password
            </Label>
            <Input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-9 border-slate-200 bg-white text-xs shadow-2xs focus:border-slate-400"
            />
          </div>

          {error && (
            <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
              {error}
            </p>
          )}

          <Button
            type="submit"
            disabled={submitting}
            className="h-9 bg-slate-900 text-xs font-semibold text-white shadow-subtle hover:bg-slate-800"
          >
            {submitting ? "Signing in..." : "Sign in"}
          </Button>
        </form>

        <div className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
          <ShieldCheck className="h-3.5 w-3.5" />
          Double-entry ledger — every posting is balanced
        </div>
      </div>
    </div>
  );
}
