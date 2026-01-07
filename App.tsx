
import React, { useState, useEffect } from 'react';
import { QueueProvider, useQueue } from './context/QueueContext';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { Kiosk } from './pages/Kiosk';
import { CounterView } from './pages/Counter';
import { Display } from './pages/Display';
import { Dashboard } from './pages/Dashboard';
import { SettingsPage } from './pages/Settings';
import { Reports } from './pages/Reports';
import { CounterDisplay } from './pages/CounterDisplay';
import { DoorDisplay } from './pages/DoorDisplay';
import { RoleSelection } from './pages/RoleSelection';
import { Reception } from './pages/Reception';

const AppContent: React.FC = () => {
  const { deviceRole, setDeviceRole } = useQueue();
  const [activeTab, setActiveTab] = useState('dashboard');

  // Handle View Override via URL Parameters (for Secondary Displays)
  const params = new URLSearchParams(window.location.search);
  const viewParam = params.get('view');

  if (viewParam) {
    switch (viewParam) {
      case 'display':
        return <Display onExit={() => window.location.href = window.location.pathname} />;
      case 'kiosk':
        return <Kiosk />;
      case 'counter':
        return <CounterView />;
      case 'counter-display':
        return <CounterDisplay />;
      case 'door-display':
        return <DoorDisplay />;
      case 'reception':
        return <Reception />;
      default:
        // Fallback to standard role routing if view is invalid
        break;
    }
  }

  if (deviceRole === 'UNSET') {
    return <RoleSelection />;
  }

  // Routing based on Role
  switch (deviceRole) {
    case 'KIOSK':
      return <Kiosk />;
    case 'RECEPTION':
      return <Reception />;
    case 'DISPLAY':
      return <Display onExit={() => {
        // Direct exit after hold gesture
        setDeviceRole('UNSET');
      }} />;
    case 'ROOM_DISPLAY':
      return <CounterDisplay />;
    case 'DOOR_DISPLAY':
      return <DoorDisplay />;
    case 'COUNTER':
      return <CounterView />;
    case 'ADMIN':
      // Admin gets the full layout
      const renderAdminContent = () => {
        switch (activeTab) {
          case 'home': return <Home onNavigate={setActiveTab} />;
          case 'dashboard': return <Dashboard />;
          case 'settings': return <SettingsPage />;
          case 'reports': return <Reports />;
          case 'counter': return <CounterView />; // Admins can still access views for testing
          case 'kiosk': return <Kiosk />;
          default: return <Dashboard />;
        }
      };
      return (
        <Layout activeTab={activeTab} onTabChange={setActiveTab}>
          {renderAdminContent()}
        </Layout>
      );
    default:
      return <RoleSelection />;
  }
};

const App: React.FC = () => {
  return (
    <QueueProvider>
      <AppContent />
    </QueueProvider>
  );
};

export default App;
