import type { ContactType } from "@urban-furniture/shared";
import { Button } from "@/components/ui/button";
import type { Contact } from "@/lib/api/contacts";

const COLUMNS: ContactType[] = ["Vendor", "Customer", "Both"];

interface ContactKanbanBoardProps {
  contacts: Contact[];
  onEdit: (contact: Contact) => void;
  onArchive: (id: string) => void;
}

export function ContactKanbanBoard({ contacts, onEdit, onArchive }: ContactKanbanBoardProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {COLUMNS.map((type) => {
        const columnContacts = contacts.filter((contact) => contact.type === type);
        return (
          <div key={type} className="flex flex-col gap-2 rounded-md border border-border bg-secondary/20 p-3">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-sm font-semibold">{type}</h2>
              <span className="text-xs text-muted-foreground">{columnContacts.length}</span>
            </div>
            <div className="flex flex-col gap-2">
              {columnContacts.length === 0 ? (
                <p className="px-1 text-xs text-muted-foreground">No contacts</p>
              ) : (
                columnContacts.map((contact) => (
                  <div key={contact.id} className="flex flex-col gap-1 rounded-md border border-border bg-background p-3 shadow-sm">
                    <p className="text-sm font-medium">{contact.name}</p>
                    <p className="text-xs text-muted-foreground">{contact.email}</p>
                    <div className="mt-1 flex justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => onEdit(contact)}>
                        Edit
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => onArchive(contact.id)}>
                        Archive
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
