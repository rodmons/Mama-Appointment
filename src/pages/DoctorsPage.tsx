import type { Doctor } from '../types'
import { EmptyState, PageIntro } from '../components/Layout'
import { Icon } from '../components/Icon'

export function DoctorsPage({ doctors, adminMode, onEdit, onAdd }: { doctors: Doctor[]; adminMode: boolean; onEdit: (doctor: Doctor) => void; onAdd: () => void }) {
  return <div>
    <PageIntro eyebrow="Care team" title="Doctors" text="Your care providers and clinic contacts." action={adminMode ? <button className="button small secondary desktop-add" type="button" onClick={onAdd}><Icon name="plus" />Add doctor</button> : undefined} />
    {doctors.length ? <div className="doctor-grid">{doctors.map((doctor) => <article className="doctor-card" key={doctor.id}>
      <div className="doctor-avatar" aria-hidden="true">{doctor.name.replace('Dr. ', '').charAt(0)}</div>
      <div className="doctor-info"><h2>{doctor.name}</h2><p className="specialty">{doctor.specialty}</p>{doctor.hospital && <p><Icon name="pin" />{doctor.hospital}</p>}{doctor.phone && <a href={`tel:${doctor.phone.replace(/[^+\d]/g, '')}`}><Icon name="phone" />{doctor.phone}</a>}</div>
      {adminMode && <button className="edit-doctor" type="button" onClick={() => onEdit(doctor)} aria-label={`Edit ${doctor.name}`}><Icon name="edit" /></button>}
    </article>)}</div> : <EmptyState title="No doctors yet" text={adminMode ? 'Use Add doctor to create the first care provider.' : 'Care provider information will appear here.'} />}
  </div>
}
