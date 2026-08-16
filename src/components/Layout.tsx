import type { ReactNode } from 'react'
import type { AppView } from '../types'
import { Icon } from './Icon'

interface HeaderProps {
  adminMode: boolean
  onSettings: () => void
}

export function AppHeader({ adminMode, onSettings }: HeaderProps) {
  return (
    <header className="app-header">
      <button className="brand" type="button" aria-label="Go to home">
        <span className="brand-mark"><span>♥</span></span>
        <span><strong>Mama Mona</strong><small>Appointments</small></span>
      </button>
      <button className={`mode-button ${adminMode ? 'is-admin' : ''}`} type="button" onClick={onSettings}>
        <Icon name={adminMode ? 'check' : 'settings'} />
        <span>{adminMode ? 'Admin' : 'Settings'}</span>
      </button>
    </header>
  )
}

const navItems: Array<{ view: AppView; label: string; icon: 'home' | 'calendar' | 'doctors' }> = [
  { view: 'home', label: 'Home', icon: 'home' },
  { view: 'calendar', label: 'Calendar', icon: 'calendar' },
  { view: 'doctors', label: 'Doctors', icon: 'doctors' },
]

export function BottomNavigation({ current, onChange }: { current: AppView; onChange: (view: AppView) => void }) {
  return (
    <nav className="bottom-nav" aria-label="Main navigation">
      {navItems.map((item) => (
        <button key={item.view} className={current === item.view ? 'active' : ''} type="button" onClick={() => onChange(item.view)} aria-current={current === item.view ? 'page' : undefined}>
          <Icon name={item.icon} /><span>{item.label}</span>
        </button>
      ))}
    </nav>
  )
}

export function PageIntro({ eyebrow, title, text, action }: { eyebrow?: string; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="page-intro">
      <div>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h1>{title}</h1>{text && <p>{text}</p>}</div>
      {action}
    </div>
  )
}

export function FloatingAddButton({ onClick, label = 'Add appointment' }: { onClick: () => void; label?: string }) {
  return <button className="floating-add" type="button" onClick={onClick} aria-label={label}><Icon name="plus" /></button>
}

export function Notice({ children, tone = 'info' }: { children: ReactNode; tone?: 'info' | 'error' | 'success' }) {
  return <div className={`notice notice-${tone}`} role={tone === 'error' ? 'alert' : 'status'}>{children}</div>
}

export function EmptyState({ title, text }: { title: string; text: string }) {
  return <div className="empty-state"><span className="empty-icon">✓</span><h3>{title}</h3><p>{text}</p></div>
}
