import type { Contact, ContactType } from '../types'
import { EmptyState, PageIntro } from '../components/Layout'
import { Icon } from '../components/Icon'
import { contactTypeLabels } from '../components/Forms'

const sections: Array<{ title: string; types: ContactType[] }> = [
  { title: 'Doctors', types: ['doctor'] },
  { title: 'Nurses', types: ['nurse'] },
  { title: 'Clinics & services', types: ['clinic', 'hospital', 'pharmacy'] },
  { title: 'Other contacts', types: ['personal', 'transportation', 'other'] },
]

export function ContactsPage({ contacts, adminMode, onEdit, onAdd }: { contacts: Contact[]; adminMode: boolean; onEdit: (contact: Contact) => void; onAdd: () => void }) {
  return <div>
    <PageIntro eyebrow="People & places" title="Contacts" text="Care providers, clinics, and other useful numbers." action={adminMode ? <button className="button small secondary desktop-add" type="button" onClick={onAdd}><Icon name="plus" />Add contact</button> : undefined} />
    {contacts.length ? <div className="contact-sections">{sections.map((section) => {
      const items = contacts.filter((contact) => section.types.includes(contact.contactType))
      if (!items.length) return null
      return <section className="contact-section" key={section.title}><h2>{section.title}</h2><div className="doctor-grid">{items.map((contact) => <article className="doctor-card" key={contact.id}>
        <div className="doctor-avatar" aria-hidden="true">{contact.name.replace('Dr. ', '').charAt(0)}</div>
        <div className="doctor-info"><h3>{contact.name}</h3><p className="specialty">{contact.roleOrSpecialty || contactTypeLabels[contact.contactType]}</p>{contact.organization && <p><Icon name="pin" />{contact.organization}</p>}{contact.phone && <a href={`tel:${contact.phone.replace(/[^+\d]/g, '')}`}><Icon name="phone" />{contact.phone}</a>}</div>
        {adminMode && <button className="edit-doctor" type="button" onClick={() => onEdit(contact)} aria-label={`Edit ${contact.name}`}><Icon name="edit" /></button>}
      </article>)}</div></section>
    })}</div> : <EmptyState title="No contacts yet" text={adminMode ? 'Use Add contact to create the first entry.' : 'Contact information will appear here.'} />}
  </div>
}
