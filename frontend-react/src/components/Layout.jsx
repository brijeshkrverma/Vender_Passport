import { useState } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

export default function Layout({ children, onAssistantToggle }) {
  const [pageTitle, setPageTitle] = useState('Dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      <Sidebar onNavigate={setPageTitle} mobileOpen={sidebarOpen} onMobileClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar title={pageTitle} onAssistantToggle={onAssistantToggle} onHamburgerClick={() => setSidebarOpen(v => !v)} />
        <main className="flex-1" style={{ padding: '24px 26px 60px', maxWidth: '1400px' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
