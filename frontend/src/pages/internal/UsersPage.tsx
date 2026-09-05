import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UserFormDialog } from "@/components/master-data/UserFormDialog";
import { listUsers, type AppUser } from "@/lib/api/users";
import { Plus, UserCog } from "lucide-react";

const ROLE_STYLES: Record<string, string> = {
  Admin: "border-slate-300 bg-slate-100 text-slate-800",
  Accountant: "border-blue-200 bg-blue-50 text-blue-700",
  Contact: "border-emerald-200 bg-emerald-50 text-emerald-700",
};

export function UsersPage() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);

  function load() {
    setLoading(true);
    listUsers().then((data) => {
      setUsers(data);
      setLoading(false);
    });
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <Button
          onClick={() => setFormOpen(true)}
          size="sm"
          className="h-9 gap-1.5 bg-slate-900 text-xs font-semibold text-white shadow-subtle hover:bg-slate-800"
        >
          <Plus className="h-3.5 w-3.5" />
          New User
        </Button>
      </div>

      <UserFormDialog open={formOpen} onOpenChange={setFormOpen} onSaved={load} />

      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400">Loading users...</div>
      ) : users.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-200 bg-white p-12 text-center shadow-card">
          <UserCog className="mx-auto mb-2 h-8 w-8 text-slate-400" />
          <p className="text-sm font-semibold text-slate-900">No users yet</p>
          <p className="mt-1 text-xs text-slate-500">Create application users and assign their access role.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-card">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow className="border-slate-200 hover:bg-transparent">
                <TableHead className="h-10 px-4 text-xs font-semibold text-slate-700">Email</TableHead>
                <TableHead className="h-10 px-4 text-xs font-semibold text-slate-700">Role</TableHead>
                <TableHead className="h-10 px-4 text-xs font-semibold text-slate-700">Linked Contact</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id} className="border-slate-100 transition-colors hover:bg-slate-50">
                  <TableCell className="px-4 py-3 text-xs font-medium text-slate-900">{user.email}</TableCell>
                  <TableCell className="px-4 py-3">
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-semibold ${ROLE_STYLES[user.role] ?? "border-slate-200 bg-slate-50 text-slate-600"}`}
                    >
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-xs text-slate-600">{user.contactName ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
