import React from 'react';
import { MessageSquare, BarChart3, Trophy, Megaphone, Calendar, Settings, LogOut } from 'lucide-react';

const Sidebar = ({ business, onAction, onOpenSettings }) => {
  const actions = [
    { icon: <MessageSquare size={18} />, label: "Log Today's Sales", text: "Log today's sales for me." },
    { icon: <BarChart3 size={18} />, label: "This Month's Chart", text: "Show me this month's revenue chart." },
    { icon: <Trophy size={18} />, label: "Top Performing Product", text: "What is my top performing product so far?" },
    { icon: <Megaphone size={18} />, label: "Marketing Report", text: "Give me a marketing report for my business." },
    { icon: <Calendar size={18} />, label: "Weekly Summary", text: "Generate a weekly summary of my performance." },
  ];

  const handleLogout = () => {
    localStorage.removeItem('bizagent_token');
    window.location.href = '/login';
  };

  return (
    <aside className="w-[260px] h-full glass-card rounded-none border-y-0 border-l-0 flex flex-col z-20">
      <div className="p-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <span className="text-white">Biz</span>
            <span className="text-gradient-orange">Agent</span>
          </h1>
          <p className="text-[10px] text-text-muted uppercase tracking-[0.2em] -mt-1">by Octavium</p>
        </div>

        <div className="mb-8">
           <h2 className="text-lg font-bold text-gradient-orange truncate">{business.name}</h2>
           <div className="h-[1px] w-full bg-orange/30 mt-2" />
        </div>

        <nav className="space-y-2">
          {actions.map((action, i) => (
            <button 
              key={i}
              onClick={() => onAction(action.text)}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-white/70 hover:text-orange hover:bg-orange/5 rounded-xl transition-all group"
            >
              <span className="group-hover:scale-110 transition-transform">{action.icon}</span>
              {action.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="mt-auto p-6 space-y-4">
        <div className="px-4 py-2 bg-orange/10 border border-orange/20 rounded-full w-max mx-auto">
          <span className="text-[10px] uppercase font-bold text-orange tracking-widest">{business.type}</span>
        </div>

        <div className="h-[1px] w-full bg-white/5" />

        <div className="flex items-center justify-between">
          <button 
            onClick={onOpenSettings}
            className="p-2 hover:bg-white/5 rounded-lg transition-colors text-white/50 hover:text-white"
          >
            <Settings size={20} />
          </button>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 text-xs text-white/30 hover:text-red-400 transition-colors font-semibold uppercase tracking-wider"
          >
            Logout <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
