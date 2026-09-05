import type { ContactType } from "@urban-furniture/shared";
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
import { createContact, updateContact, type Contact } from "@/lib/api/contacts";
import { firstError, isEmail, isNonEmpty, isPhone } from "@/lib/validation";

const CONTACT_TYPES: ContactType[] = ["Vendor", "Customer", "Both"];

interface ContactFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact?: Contact;
  onSaved: () => void;
}

const emptyForm = { name: "", type: "Vendor" as ContactType, email: "", phone: "", address: "" };

export function ContactFormDialog({ open, onOpenChange, contact, onSaved }: ContactFormDialogProps) {
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(
        contact
          ? {
              name: contact.name,
              type: contact.type,
              email: contact.email,
              phone: contact.phone ?? "",
              address: contact.address ?? "",
            }
          : emptyForm,
      );
      setError(null);
    }
  }, [open, contact]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const validationError = firstError([
      [isNonEmpty(form.name), "Entity / full name is required."],
      [isNonEmpty(form.email), "Business email is required."],
      [isEmail(form.email), "Enter a valid email address (name@domain.com)."],
      [form.phone.trim() === "" || isPhone(form.phone), "Enter a valid phone number, or leave it blank."],
    ]);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const input = {
        name: form.name,
        type: form.type,
        email: form.email,
        phone: form.phone || undefined,
        address: form.address || undefined,
      };
      if (contact) {
        await updateContact(contact.id, input);
      } else {
        await createContact(input);
      }
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
      <DialogContent className="sm:max-w-lg bg-white border border-slate-200 shadow-elevated">
        <form onSubmit={handleSubmit} noValidate>
          <DialogHeader>
            <DialogTitle className="text-base font-bold font-display text-slate-900">
              {contact ? "Edit Contact & Directory Entry" : "New Contact / Partner"}
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-3.5 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="name" required className="text-xs font-semibold text-slate-700">Entity / Full Name</Label>
                <Input
                  id="name"
                  required
                  placeholder="e.g. Artisans Guild Ltd"
                  className="h-9 text-xs bg-slate-50 border-slate-200 focus:bg-white"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="type" required className="text-xs font-semibold text-slate-700">Partner Role</Label>
                <Select value={form.type} onValueChange={(value) => setForm({ ...form, type: value as ContactType })}>
                  <SelectTrigger id="type" className="h-9 text-xs bg-slate-50 border-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border border-slate-200 shadow-card">
                    {CONTACT_TYPES.map((type) => (
                      <SelectItem key={type} value={type} className="text-xs text-slate-700">
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email" required className="text-xs font-semibold text-slate-700">Business Email</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  placeholder="name@domain.com"
                  className="h-9 text-xs bg-slate-50 border-slate-200 focus:bg-white"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="phone" className="text-xs font-semibold text-slate-700">Phone Number</Label>
                <Input
                  id="phone"
                  placeholder="+91 98765 43210"
                  className="h-9 text-xs bg-slate-50 border-slate-200 focus:bg-white"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="address" className="text-xs font-semibold text-slate-700">Billing / Registered Address</Label>
              <Input
                id="address"
                placeholder="Street address, City, Postal Code"
                className="h-9 text-xs bg-slate-50 border-slate-200 focus:bg-white"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </div>

            {error && (
              <div className="p-2.5 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                {error}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 text-xs font-medium border-slate-200"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={saving}
              className="h-9 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white shadow-subtle ml-2"
            >
              {saving ? "Saving..." : contact ? "Update Contact" : "Create Contact"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
