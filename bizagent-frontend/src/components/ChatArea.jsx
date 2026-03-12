import React, { useState, useEffect, useRef } from 'react';
import { apiCall } from '../utils/api';
import { Send, Bot, User, Sparkles } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const ChatArea = ({ business, trigger, onSent }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    fetchHistory();
  }, []);

  useEffect(() => {
    if (trigger) {
      handleSend(trigger);
    }
  }, [trigger]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const fetchHistory = async () => {
    try {
      const data = await apiCall('/api/data/history', 'GET');
      setMessages(data.history);
    } catch (err) {
      console.error("Failed to fetch chat history", err);
    }
  };

  const handleSend = async (messageText) => {
    const text = messageText || input;
    if (!text.trim()) return;

    if (!messageText) setInput("");
    setLoading(true);

    try {
      const data = await apiCall('/api/chat', 'POST', { message: text });
      // Add local messages or just re-fetch history
      await fetchHistory();
      if (onSent) onSent();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const MessageBubble = ({ msg }) => {
    const isBot = msg.role === 'assistant';
    const content = isBot ? msg.content : msg.content; // Content is already parsed object if bot

    return (
      <div className={`flex ${isBot ? 'justify-start' : 'justify-end'} mb-6 px-4`}>
        <div className={`flex gap-3 max-w-[85%] ${isBot ? 'flex-row' : 'flex-row-reverse'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isBot ? 'bg-orange/20 text-orange' : 'bg-white/10 text-white'}`}>
             {isBot ? <Bot size={18} /> : <User size={18} />}
          </div>
          
          <div className={`px-5 py-3 rounded-2xl ${isBot ? 'glass-card border-l-4 border-l-orange' : 'btn-primary'}`}>
             {isBot ? (
               <div className="space-y-4">
                  {/* Action specific rendering */}
                  {content.action === 'chart' ? (
                     <div className="space-y-2">
                        <p className="font-bold text-orange">{content.title}</p>
                        <div className="h-[200px] w-full min-w-[300px] mt-4">
                           <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={content.labels.map((l, i) => ({ name: l, value: content.values[i] }))}>
                                <XAxis dataKey="name" stroke="rgba(255,255,255,0.3)" fontSize={10} />
                                <YAxis stroke="rgba(255,255,255,0.3)" fontSize={10} />
                                <Tooltip 
                                  contentStyle={{ background: '#1a1a1a', border: '1px solid rgba(255,107,0,0.3)', borderRadius: '8px' }}
                                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                />
                                <Bar dataKey="value" fill="url(#orangeGradient)" radius={[4,4,0,0]} />
                                <defs>
                                  <linearGradient id="orangeGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#ff6b00" />
                                    <stop offset="100%" stopColor="#ff9500" stopOpacity={0.4} />
                                  </linearGradient>
                                </defs>
                              </BarChart>
                           </ResponsiveContainer>
                        </div>
                        <p className="text-sm italic text-white/70">{content.message}</p>
                     </div>
                  ) : content.action === 'report' ? (
                    <div className="space-y-4">
                       <p className="font-bold text-white mb-2">{content.message}</p>
                       {content.sections.map((s, i) => (
                         <div key={i} className="space-y-2">
                            <h4 className="text-orange font-bold text-sm uppercase tracking-wide">{s.heading}</h4>
                            <ul className="list-disc list-inside text-sm text-white/80 space-y-1">
                               {s.points.map((p, j) => <li key={j}>{p}</li>)}
                            </ul>
                         </div>
                       ))}
                    </div>
                  ) : (
                    <p className="text-sm leading-relaxed">{content.message || content.content}</p>
                  )}
               </div>
             ) : (
               <p className="text-sm leading-relaxed">{msg.content}</p>
             )}
             <p className={`text-[10px] mt-2 ${isBot ? 'text-text-muted' : 'text-white/50'}`}>
                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
             </p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col px-8 pb-8 relative">
       <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-2 py-4 custom-scrollbar scroll-smooth"
       >
          {messages.length === 0 && !loading && (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-6">
               <div className="w-20 h-20 glass-card rounded-full flex items-center justify-center animate-bounce shadow-[0_0_40px_rgba(255,107,0,0.2)]">
                  <Sparkles size={40} className="text-orange fill-orange/20" />
               </div>
               <div>
                  <h3 className="text-xl font-bold text-gradient-orange">Good morning!</h3>
                  <p className="text-text-muted text-sm mt-1">Ready to track today's sales?</p>
               </div>
               <div className="flex gap-3">
                  {['Log chai sales', 'Show monthly chart', 'AI marketing tips'].map(tip => (
                    <button 
                      key={tip}
                      onClick={() => handleSend(tip)}
                      className="px-4 py-2 glass-card text-xs hover:border-orange/40 hover:text-orange transition-all"
                    >
                      {tip}
                    </button>
                  ))}
               </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <MessageBubble key={msg.id || i} msg={msg} />
          ))}

          {loading && (
            <div className="flex justify-start mb-6 px-4">
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-orange/20 text-orange flex items-center justify-center shrink-0 animate-pulse">
                  <Bot size={18} />
                </div>
                <div className="glass-card px-5 py-3 rounded-2xl flex items-center gap-2">
                   <div className="w-1.5 h-1.5 bg-orange rounded-full animate-bounce [animation-delay:-0.3s]" />
                   <div className="w-1.5 h-1.5 bg-orange rounded-full animate-bounce [animation-delay:-0.15s]" />
                   <div className="w-1.5 h-1.5 bg-orange rounded-full animate-bounce" />
                </div>
              </div>
            </div>
          )}
       </div>

       <div className="mt-4">
          <form 
            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
            className="glass-card flex items-center p-2 gap-2 shadow-[0_0_50px_rgba(0,0,0,0.5)] border-white/5"
          >
             <input 
               value={input}
               onChange={(e) => setInput(e.target.value)}
               placeholder="Log sales, ask for charts, or request a report..."
               className="flex-1 bg-transparent border-none outline-none px-4 py-2 text-sm placeholder:text-white/20"
             />
             <button 
               type="submit"
               disabled={!input.trim() || loading}
               className="w-10 h-10 btn-primary rounded-full flex items-center justify-center disabled:opacity-50 disabled:grayscale transition-all"
             >
                <Send size={18} />
             </button>
          </form>
       </div>
    </div>
  );
};

export default ChatArea;
