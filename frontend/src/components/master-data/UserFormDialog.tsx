import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createUser, type NewUserRole } from "@/lib/api/users";
import { firstError, isEmail, isNonEmpty } from "@/lib/validation";

interface UserFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

const PORTAL_ROLES: NewUserRole[] = ["Vendor", "Customer"];

export function UserFormDialog({ open, onOpenChange, onSaved }: UserFormDialogProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<NewUserRole>("Accountant");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName("");
      setEmail("");
      setPassword("");
      setRole("Accountant");
      setError(null);
    }
  }, [open]);

  const isPortalRole = PORTAL_ROLES.includes(role);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const validationError = firstError([
      [!isPortalRole || isNonEmpty(name), `${role} name is required.`],
      [isNonEmpty(email), "Email is required."],
      [isEmail(email), "Enter a valid email address (name@domain.com)."],
      [password.length >= 6, "Password must be at least 6 characters."],
    ]);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await createUser({
        name: isPortalRole ? name : undefined,
        email,
        password,
        role,
      });
      onSaved();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border border-slate-200 bg-white shadow-elevated sm:max-w-md">
        <form onSubmit={handleSubmit} autoComplete="off" noValidate>
          <DialogHeader>
            <DialogTitle className="font-display text-base font-bold text-slate-900">New User</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-3.5 py-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="user-role" required className="text-xs font-semibold text-slate-700">Access Role</Label>
              <Select value={role} onValueChange={(value) => setRole(value as NewUserRole)}>
                <SelectTrigger id="user-role" className="h-9 border-slate-200 bg-slate-50 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border border-slate-200 bg-white shadow-card">
                  <SelectItem value="Admin" className="text-xs">Admin</SelectItem>
                  <SelectItem value="Accountant" className="text-xs">Accountant</SelectItem>
                  <SelectItem value="Vendor" className="text-xs">Vendor</SelectItem>
                  <SelectItem value="Customer" className="text-xs">Customer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isPortalRole && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="user-name" required className="text-xs font-semibold text-slate-700">{role} name</Label>
                <Input
                  id="user-name"
                  required
                  autoComplete="off"
                  className="h-9 border-slate-200 bg-slate-50 text-xs focus:bg-white"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="user-email" required className="text-xs font-semibold text-slate-700">Email</Label>
              <Input
                id="user-email"
                type="email"
                required
                autoComplete="off"
                className="h-9 border-slate-200 bg-slate-50 text-xs focus:bg-white"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="user-password" required className="text-xs font-semibold text-slate-700">Password</Label>
              <Input
                id="user-password"
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                className="h-9 border-slate-200 bg-slate-50 text-xs focus:bg-white"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error && (
              <div className="rounded-md border border-rose-200 bg-rose-50 p-2.5 text-xs font-medium text-rose-700">
                {error}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 border-slate-200 text-xs font-medium"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={saving}
              className="ml-2 h-9 bg-slate-900 text-xs font-semibold text-white shadow-subtle hover:bg-slate-800"
            >
              {saving ? "Saving..." : "Create User"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
