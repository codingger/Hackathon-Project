import { NavLink } from 'react-router';

export default function Navbar() {
  const tabClass = ({ isActive }) => 'navbar-tab' + (isActive ? ' active' : '');

  return (
    <header className="navbar">
      <div className="navbar-brand">
        <span>Studio</span>
        <span className="navbar-brand-badge">AI</span>
      </div>
      <nav className="navbar-tabs">
        <NavLink to="/wireframe" className={tabClass}>Wireframe to React</NavLink>
        <NavLink to="/prompt-ui" className={tabClass}>Prompt UI</NavLink>
        <NavLink to="/code-modifier" className={tabClass}>Component Modifier</NavLink>
      </nav>
    </header>
  );
}
