import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ContactFormDialog } from "@/components/master-data/ContactFormDialog";
import { ContactKanbanBoard } from "@/components/master-data/ContactKanbanBoard";
import { archiveContact, listContacts, type Contact } from "@/lib/api/contacts";
import { Search, Plus, LayoutGrid, List, Edit, Archive, Users } from "lucide-react";
import type { ContactType } from "@urban-furniture/shared";

type ViewMode = "list" | "kanban";
type FilterType = "ALL" | ContactType;

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | undefined>(undefined);
  const [view, setView] = useState<ViewMode>("kanban");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<FilterType>("ALL");

  async function load() {
    setLoading(true);
    try {
      const data = await listContacts();
      setContacts(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleArchive(id: string) {
    if (confirm("Are you sure you want to archive this contact?")) {
      await archiveContact(id);
      load();
    }
  }

  function openCreateForm() {
    setEditingContact(undefined);
    setFormOpen(true);
  }

  function openEditForm(contact: Contact) {
    setEditingContact(contact);
    setFormOpen(true);
  }

  const filteredContacts = contacts.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      (c.phone && c.phone.includes(search)) ||
      (c.address && c.address.toLowerCase().includes(search.toLowerCase()));

    const matchesType = typeFilter === "ALL" || c.type === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      {/* Top Toolbar: Search, Filters, and New Contact */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search contacts by name, email, phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs bg-white border-slate-200 focus:border-slate-400 shadow-2xs"
          />
        </div>

        {/* View Toggles & Create Button */}
        <div className="flex items-center gap-2">
          {/* Filter Pills */}
          <div className="hidden md:flex items-center rounded-md border border-slate-200 bg-slate-100 p-0.5">
            {(["ALL", "Vendor", "Customer", "Both"] as FilterType[]).map((ft) => (
              <Button
                key={ft}
                variant="ghost"
                size="sm"
                onClick={() => setTypeFilter(ft)}
                className={`h-7 text-xs px-2.5 transition-all ${
                  typeFilter === ft
                    ? "bg-white text-slate-900 shadow-2xs font-semibold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {ft === "ALL" ? "All Contacts" : `${ft}s`}
              </Button>
            ))}
          </div>

          {/* View Switcher */}
          <div className="flex items-center rounded-md border border-slate-200 bg-slate-100 p-0.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setView("kanban")}
              className={`h-7 px-2.5 transition-all ${
                view === "kanban"
                  ? "bg-white text-slate-900 shadow-2xs font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
              title="Kanban Board View"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setView("list")}
              className={`h-7 px-2.5 transition-all ${
                view === "list"
                  ? "bg-white text-slate-900 shadow-2xs font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
              title="Data Table View"
            >
              <List className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Add Contact Button */}
          <Button onClick={openCreateForm} size="sm" className="h-9 gap-1.5 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white shadow-subtle">
            <Plus className="h-3.5 w-3.5" />
            <span>New Contact</span>
          </Button>
        </div>
      </div>

      <ContactFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        contact={editingContact}
        onSaved={load}
      />

      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400">Loading contacts directory...</div>
      ) : filteredContacts.length === 0 ? (
        <div className="p-12 text-center rounded-lg border border-dashed border-slate-200 bg-white shadow-card">
          <Users className="h-8 w-8 text-slate-400 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-900">No contacts found</p>
          <p className="text-xs text-slate-500 mt-1">Create your first vendor or customer to establish accounts payable and receivable ledgers.</p>
        </div>
      ) : view === "kanban" ? (
        <ContactKanbanBoard contacts={filteredContacts} onEdit={openEditForm} onArchive={handleArchive} />
      ) : (
        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden shadow-card">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow className="border-slate-200">
                <TableHead className="text-xs font-semibold text-slate-700">Entity Name</TableHead>
                <TableHead className="text-xs font-semibold text-slate-700">Classification</TableHead>
                <TableHead className="text-xs font-semibold text-slate-700">Email Address</TableHead>
                <TableHead className="text-xs font-semibold text-slate-700">Phone</TableHead>
                <TableHead className="text-xs font-semibold text-slate-700">Billing Address</TableHead>
                <TableHead className="text-right text-xs font-semibold text-slate-700">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredContacts.map((contact) => (
                <TableRow key={contact.id} className="border-slate-100 hover:bg-slate-50 transition-colors">
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <div className="h-7 w-7 rounded-md bg-slate-100 text-slate-800 border border-slate-200 flex items-center justify-center text-[10px] font-bold shrink-0">
                        {getInitials(contact.name)}
                      </div>
                      <span className="font-medium text-xs text-slate-900">{contact.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-medium ${
                        contact.type === "Customer"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : contact.type === "Vendor"
                          ? "bg-blue-50 text-blue-700 border-blue-200"
                          : "bg-purple-50 text-purple-700 border-purple-200"
                      }`}
                    >
                      {contact.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-slate-600 font-mono">{contact.email}</TableCell>
                  <TableCell className="text-xs text-slate-600 font-mono">{contact.phone ?? "—"}</TableCell>
                  <TableCell className="text-xs text-slate-600 max-w-[180px] truncate">
                    {contact.address ?? "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEditForm(contact)} className="h-7 px-2 text-xs text-slate-700 hover:bg-slate-100">
                        <Edit className="h-3 w-3 mr-1" /> Edit
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleArchive(contact.id)} className="h-7 px-2 text-xs text-rose-600 hover:bg-rose-50">
                        <Archive className="h-3 w-3 mr-1" /> Archive
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

