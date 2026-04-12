import { useLocation } from 'react-router-dom';
import { navItems } from '../navigation/navConfig';

const sectionSubtitle: Record<string, string> = {
  '/dashboard': 'Monitor your workspace at a glance.',
  '/chat': 'Collaborate with your AI companion in real-time.',
  '/agents': 'Manage agents, roles, and deployments.',
  '/create-agent': 'Configure and launch a new agent experience.',
  '/lab': 'Test new prompts, tools, and experiments.',
  '/intelligence': 'Review analytics and capability insights.',
  '/settings': 'Control workspace and profile preferences.'
};

export const Topbar = () => {
  const { pathname } = useLocation();
  const currentItem = navItems.find((item) => item.path === pathname);

  return (
    <header className="topbar">
      <div>
        <h1>{currentItem?.label ?? 'Workspace'}</h1>
        <p>{sectionSubtitle[pathname] ?? 'Navigate your AI workspace.'}</p>
      </div>
      <button className="primary-action" type="button">
        Upgrade
      </button>
    </header>
  );
};
