import React from 'react';

const TopBar = ({ business, summary, todayRevenue }) => {
  const date = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const StatPill = ({ label, value }) => (
    <div className="glass-card px-4 py-2 flex flex-col items-center min-w-[120px]">
      <span className="text-[10px] uppercase text-text-muted font-bold tracking-wider">{label}</span>
      <span className="text-sm font-bold text-white uppercase">{value || '---'}</span>
    </div>
  );

  return (
    <header className="px-8 py-6 flex items-center justify-between z-10">
      <div>
        <p className="text-text-muted text-sm font-medium">{date}</p>
        <div className="flex items-center gap-3 mt-1">
           <h3 className={`text-xl font-bold ${todayRevenue > 0 ? 'text-orange' : 'text-text-muted'}`}>
              {todayRevenue > 0 ? `₹${todayRevenue.toLocaleString()} today` : 'Not logged yet'}
           </h3>
           <div className={`w-2 h-2 rounded-full ${todayRevenue > 0 ? 'bg-green-500 shadow-[0_0_10px_#22c55e]' : 'bg-white/20'}`} />
        </div>
      </div>

      <div className="flex gap-4">
        <StatPill label="Month Revenue" value={summary ? `₹${summary.monthRevenue.toLocaleString()}` : null} />
        <StatPill label="Days Logged" value={summary ? `${summary.monthDaysLogged}` : null} />
        <StatPill label="Top Product" value={summary ? summary.topProduct.name : null} />
      </div>
    </header>
  );
};

export default TopBar;
