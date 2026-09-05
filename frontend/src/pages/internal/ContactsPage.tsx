import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ContactFormDialog } from "@/components/master-data/ContactFormDialog";
import { ContactKanbanBoard } from "@/components/master-data/ContactKanbanBoard";
import { archiveContact, listContacts, type Contact } from "@/lib/api/contacts";

type ViewMode = "list" | "kanban";

export function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | undefined>(undefined);
  const [view, setView] = useState<ViewMode>("list");
  const [search, setSearch] = useState("");

  async function load() {
    setLoading(true);
    const data = await listContacts();
    setContacts(data);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleArchive(id: string) {
    await archiveContact(id);
    load();
  }

  function openCreateForm() {
    setEditingContact(undefined);
    setFormOpen(true);
  }

  function openEditForm(contact: Contact) {
    setEditingContact(contact);
    setFormOpen(true);
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter(
      (contact) =>
        contact.name.toLowerCase().includes(q) ||
        contact.email.toLowerCase().includes(q) ||
        contact.type.toLowerCase().includes(q),
    );
  }, [contacts, search]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Contacts</h1>
        <div className="flex items-center gap-2">
          <Button
            variant={view === "list" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setView("list")}
          >
            List
          </Button>
          <Button
            variant={view === "kanban" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setView("kanban")}
          >
            Kanban
          </Button>
          <Button onClick={openCreateForm}>New Contact</Button>
        </div>
      </div>

      <Input
        placeholder="Search by name, email, or type..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

      <ContactFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        contact={editingContact}
        onSaved={load}
      />

      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : filtered.length === 0 ? (
        <p className="text-muted-foreground">No contacts found.</p>
      ) : view === "kanban" ? (
        <ContactKanbanBoard contacts={filtered} onEdit={openEditForm} onArchive={handleArchive} />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((contact) => (
              <TableRow key={contact.id}>
                <TableCell className="font-medium">{contact.name}</TableCell>
                <TableCell>
                  <Badge variant="outline">{contact.type}</Badge>
                </TableCell>
                <TableCell>{contact.email}</TableCell>
                <TableCell>{contact.phone ?? "—"}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => openEditForm(contact)}>
                    Edit
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleArchive(contact.id)}>
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
