"use client";

import { useState, useEffect } from "react";
import { Bell, Check, Trophy, UserPlus } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Notification {
  id: string;
  type: "follow" | "game_win";
  message: string;
  link?: string;
  read: boolean;
  created_at: string;
}

export default function NotificationsDropdown({ userId }: { userId: string }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  const fetchNotifications = async () => {
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);
      
    if (data) {
      setNotifications(data as Notification[]);
    }
  };

  useEffect(() => {
    fetchNotifications();

    // Subscribe to new notifications
    const channel = supabase.channel(`notifications_${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` }, (payload) => {
        setNotifications(prev => [payload.new as Notification, ...prev]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllAsRead = async () => {
    if (unreadCount === 0) return;
    
    // Optimistic UI update
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", userId)
      .eq("read", false);
  };

  const handleNotificationClick = async (notification: Notification) => {
    setIsOpen(false);
    if (!notification.read) {
      setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, read: true } : n));
      await supabase.from("notifications").update({ read: true }).eq("id", notification.id);
    }
    if (notification.link) {
      router.push(notification.link);
    }
  };

  return (
    <div className="relative">
      <button 
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen && unreadCount > 0) markAllAsRead();
        }}
        className="p-2 text-brand-muted hover:text-brand-white transition-colors rounded-[2px] relative"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-2 h-2 bg-brand-lime rounded-full animate-pulse"></span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)}></div>
          <div className="absolute top-full right-0 mt-2 w-80 bg-brand-surface border border-brand-border rounded-[2px] shadow-2xl z-50 overflow-hidden flex flex-col max-h-[400px]">
            <div className="flex items-center justify-between p-4 border-b border-brand-border bg-brand-black/50">
              <h3 className="font-display font-bold">Notifications</h3>
              {unreadCount > 0 && (
                <span className="text-[10px] uppercase tracking-widest text-brand-lime bg-brand-lime/10 px-2 py-0.5 rounded-[2px] border border-brand-lime/30">
                  {unreadCount} New
                </span>
              )}
            </div>
            
            <div className="overflow-y-auto flex-1">
              {notifications.length === 0 ? (
                <div className="p-6 text-center text-sm text-brand-muted">
                  You're all caught up!
                </div>
              ) : (
                <div className="flex flex-col">
                  {notifications.map(n => (
                    <button 
                      key={n.id}
                      onClick={() => handleNotificationClick(n)}
                      className={`text-left p-4 border-b border-brand-border/50 hover:bg-brand-black/50 transition-colors flex gap-3 ${!n.read ? 'bg-brand-lime/5' : ''}`}
                    >
                      <div className={`mt-0.5 shrink-0 ${n.type === 'game_win' ? 'text-status-warning' : 'text-brand-lime'}`}>
                        {n.type === 'game_win' ? <Trophy className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                      </div>
                      <div className="flex flex-col gap-1">
                        <p className={`text-sm ${!n.read ? 'text-brand-white font-medium' : 'text-brand-muted'}`}>
                          {n.message}
                        </p>
                        <span className="text-[10px] text-brand-muted/70">
                          {new Date(n.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
