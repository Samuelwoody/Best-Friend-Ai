import type { ReactNode } from 'react';
import {
  LayoutGrid,
  MessageSquare,
  Bot,
  Sparkles,
  FlaskConical,
  BrainCircuit,
  Settings
} from '../common/icons';

export interface NavItem {
  label: string;
  path: string;
  icon: ReactNode;
}

export const navItems: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: <LayoutGrid /> },
  { label: 'Chat', path: '/chat', icon: <MessageSquare /> },
  { label: 'Agents', path: '/agents', icon: <Bot /> },
  { label: 'Create Agent', path: '/create-agent', icon: <Sparkles /> },
  { label: 'Lab', path: '/lab', icon: <FlaskConical /> },
  { label: 'Intelligence', path: '/intelligence', icon: <BrainCircuit /> },
  { label: 'Settings', path: '/settings', icon: <Settings /> }
];
