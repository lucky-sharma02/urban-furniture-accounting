import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AccountFormDialog } from "@/components/master-data/AccountFormDialog";
import { archiveAccount, listAccounts, type Account } from "@/lib/api/accounts";

export function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | undefined>(undefined);

  async function load() {
    setLoading(true);
    const data = await listAccounts();
    setAccounts(data);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleArchive(id: string) {
    await archiveAccount(id);
    load();
  }

  function openCreateForm() {
    setEditingAccount(undefined);
    setFormOpen(true);
  }

  function openEditForm(account: Account) {
    setEditingAccount(account);
    setFormOpen(true);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Chart of Accounts</h1>
        <Button onClick={openCreateForm}>New Account</Button>
      </div>

      <AccountFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        account={editingAccount}
        onSaved={load}
      />

      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : accounts.length === 0 ? (
        <p className="text-muted-foreground">No accounts yet.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {accounts.map((account) => (
              <TableRow key={account.id}>
                <TableCell className="font-medium">{account.name}</TableCell>
                <TableCell>
                  <Badge variant="outline">{account.type}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => openEditForm(account)}>
                    Edit
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleArchive(account.id)}>
                    Archive
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
