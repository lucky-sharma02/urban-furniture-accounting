import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { archiveContact, listContacts, type Contact } from "@/lib/api/contacts";

export function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Contacts</h1>
        <Button>New Contact</Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : contacts.length === 0 ? (
        <p className="text-muted-foreground">No contacts yet.</p>
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
            {contacts.map((contact) => (
              <TableRow key={contact.id}>
                <TableCell className="font-medium">{contact.name}</TableCell>
                <TableCell>
                  <Badge variant="outline">{contact.type}</Badge>
                </TableCell>
                <TableCell>{contact.email}</TableCell>
                <TableCell>{contact.phone ?? "—"}</TableCell>
                <TableCell className="text-right">
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
