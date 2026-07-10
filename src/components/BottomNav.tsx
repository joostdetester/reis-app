import { NavLink } from 'react-router-dom'

const ITEMS = [
  { to: '/today', icon: '☀️', label: 'Vandaag' },
  { to: '/trip', icon: '🗺️', label: 'Reis' },
  { to: '/hotels', icon: '🏨', label: 'Hotels' },
  { to: '/transport', icon: '✈️', label: 'Vervoer' },
]

export function BottomNav() {
  return (
    <nav className="bottom-nav">
      {ITEMS.map((item) => (
        <NavLink key={item.to} to={item.to} className={({ isActive }) => (isActive ? 'active' : '')}>
          <span>{item.icon}</span>
          {item.label}
        </NavLink>
      ))}
    </nav>
  )
}
