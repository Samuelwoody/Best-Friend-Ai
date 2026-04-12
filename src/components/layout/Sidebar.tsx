import { NavLink } from 'react-router-dom';
import { navItems } from '../navigation/navConfig';

export const Sidebar = () => {
  return (
    <aside className="sidebar">
      <div className="brand-block">
        <span className="brand-dot" />
        <div>
          <strong>Best Friend AI</strong>
          <p>Control Center</p>
        </div>
      </div>

      <nav className="side-nav" aria-label="Primary Navigation">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `nav-item${isActive ? ' nav-item-active' : ''}`
            }
          >
            <span className="nav-icon">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};
