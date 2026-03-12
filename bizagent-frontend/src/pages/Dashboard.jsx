import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import TopBar from '../components/TopBar';
import ChatArea from '../components/ChatArea';
import SettingsModal from '../components/SettingsModal';
import { apiCall } from '../utils/api';
import { useToast } from '../contexts/ToastContext';

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [business, setBusiness] = useState(null);
  const [summary, setSummary] = useState(null);
  const [todayRevenue, setTodayRevenue] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [chatTrigger, setChatTrigger] = useState("");
  const { showToast } = useToast();

  const fetchData = async () => {
    try {
      const me = await apiCall('/api/auth/me', 'POST'); 
      setUser(me.user);
      setBusiness(me.business);

      const summaryData = await apiCall('/api/data/summary', 'GET');
      setSummary(summaryData.summary);

      const todayData = await apiCall('/api/data/today', 'GET');
      // todayData.data is array from sheets service
      const rev = todayData.data?.reduce((acc, row) => {
         const r = parseFloat(row['Total Revenue']) || 0;
         return acc + r;
      }, 0) || 0;
      setTodayRevenue(rev);
    } catch (err) {
      showToast(err.message);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleQuickAction = (text) => {
    setChatTrigger(text);
  };

  if (!user || !business) return (
    <div className="min-h-screen bg-bg-dark flex items-center justify-center">
       <div className="animate-pulse text-orange font-bold text-xl">Loading BizAgent...</div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-bg-dark text-white font-jakarta">
      <Sidebar 
        business={business} 
        onAction={handleQuickAction} 
        onOpenSettings={() => setSettingsOpen(true)}
      />
      
      <div className="flex-1 flex flex-col relative overflow-hidden">
        <TopBar 
          business={business} 
          summary={summary} 
          todayRevenue={todayRevenue} 
        />
        
        <main className="flex-1 overflow-hidden">
           <ChatArea 
             business={business} 
             trigger={chatTrigger} 
             onSent={() => {
                setChatTrigger("");
                fetchData(); // Refresh stats after chat (like logging)
             }}
           />
        </main>
      </div>

      {settingsOpen && (
        <SettingsModal 
          business={business} 
          onClose={() => setSettingsOpen(false)} 
          onSave={() => {
             setSettingsOpen(false);
             fetchData();
          }}
        />
      )}
    </div>
  );
};

export default Dashboard;
