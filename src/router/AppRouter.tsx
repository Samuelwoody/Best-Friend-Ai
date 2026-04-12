import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';
import { AgentsPage } from '../pages/AgentsPage';
import { ChatPage } from '../pages/ChatPage';
import { CreateAgentPage } from '../pages/CreateAgentPage';
import { DashboardPage } from '../pages/DashboardPage';
import { IntelligencePage } from '../pages/IntelligencePage';
import { LabPage } from '../pages/LabPage';
import { LabScenarioListPage } from '../pages/LabScenarioListPage';
import { LabSimulationPage } from '../pages/LabSimulationPage';
import { LabResultsPage } from '../pages/LabResultsPage';
import { SettingsPage } from '../pages/SettingsPage';

export const AppRouter = () => {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/agents" element={<AgentsPage />} />
        <Route path="/create-agent" element={<CreateAgentPage />} />
        <Route path="/lab" element={<LabPage />} />
        <Route path="/lab/scenarios" element={<LabScenarioListPage />} />
        <Route path="/lab/simulation/:sessionId" element={<LabSimulationPage />} />
        <Route path="/lab/results/:sessionId" element={<LabResultsPage />} />
        <Route path="/intelligence" element={<IntelligencePage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  );
};
