import { Link } from 'react-router-dom';
import { PageContainer } from '../components/common/PageContainer';

export const LabPage = () => (
  <PageContainer
    title="Human Complexity Lab"
    description="Run structured interpersonal simulations and inspect post-session outcomes."
  >
    <div className="lab-card">
      <p>Use the lab workflow to select scenarios, run simulations, and review results.</p>
      <div className="lab-link-row">
        <Link className="lab-link" to="/lab/scenarios">Go to Scenario List</Link>
      </div>
    </div>
  </PageContainer>
);
