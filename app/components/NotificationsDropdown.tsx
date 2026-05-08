"use client";

import { useState, useEffect } from "react";
import { Bell, X, Trophy, UserPlus } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
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
    if (data) setNotifications(data as Notification[]);
  };

  useEffect(() => {
    fetchNotifications();
    const channel = supabase
      .channel(`notifications_${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` }, (payload) => {
        setNotifications((prev) => [payload.new as Notification, ...prev]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllAsRead = async () => {
    if (unreadCount === 0) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    await supabase.from("notifications").update({ read: true }).eq("user_id", userId).eq("read", false);
  };

  const handleOpen = () => {
    setIsOpen(true);
    if (unreadCount > 0) markAllAsRead();
  };

  const handleClose = () => setIsOpen(false);

  const handleNotificationClick = async (notification: Notification) => {
    handleClose();
    if (!notification.read) {
      setNotifications((prev) => prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n)));
      await supabase.from("notifications").update({ read: true }).eq("id", notification.id);
    }
    if (notification.link) router.push(notification.link);
  };

  return (
    <div className="relative">
      {/* Bell button */}
      <button
        onClick={handleOpen}
        className="p-2 text-brand-muted hover:text-brand-white transition-colors rounded-[2px] relative"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-2 h-2 bg-brand-lime rounded-full animate-pulse" />
        )}
      </button>

      {isOpen && (
        <>
          {/* ── Desktop dropdown (md+) ─────────────────────────────────── */}
          <div
            className="fixed inset-0 z-40 hidden md:block"
            onClick={handleClose}
          />
          <div className="absolute top-full right-0 mt-2 w-80 bg-brand-surface border border-brand-border rounded-[2px] shadow-2xl z-50 overflow-hidden flex-col max-h-[420px] hidden md:flex">
            <NotificationsContent
              notifications={notifications}
              unreadCount={unreadCount}
              onClose={handleClose}
              onClickItem={handleNotificationClick}
              isMobile={false}
            />
          </div>

          {/* ── Mobile full-screen panel ───────────────────────────────── */}
          <div className="md:hidden fixed inset-0 z-50 bg-brand-black flex flex-col">
            <NotificationsContent
              notifications={notifications}
              unreadCount={unreadCount}
              onClose={handleClose}
              onClickItem={handleNotificationClick}
              isMobile={true}
            />
          </div>
        </>
      )}
    </div>
  );
}

function NotificationsContent({
  notifications,
  unreadCount,
  onClose,
  onClickItem,
  isMobile,
}: {
  notifications: Notification[];
  unreadCount: number;
  onClose: () => void;
  onClickItem: (n: Notification) => void;
  isMobile: boolean;
}) {
  return (
    <>
      {/* Header */}
      <div className={`flex items-center justify-between border-b border-brand-border bg-brand-surface shrink-0 ${isMobile ? "px-5 py-5" : "px-4 py-3 bg-brand-black/50"}`}>
        <div className="flex items-center gap-3">
          <h3 className={`font-display font-bold ${isMobile ? "text-xl" : "text-base"}`}>Notifications</h3>
          {unreadCount > 0 && (
            <span className="text-[10px] uppercase tracking-widest text-brand-lime bg-brand-lime/10 px-2 py-0.5 rounded-[2px] border border-brand-lime/30">
              {unreadCount} New
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className={`flex items-center justify-center rounded-[2px] text-brand-muted hover:text-brand-white hover:bg-brand-card transition-colors ${isMobile ? "w-10 h-10" : "w-7 h-7"}`}
          aria-label="Close notifications"
        >
          <X className={isMobile ? "w-5 h-5" : "w-4 h-4"} />
        </button>
      </div>

      {/* List */}
      <div className={`overflow-y-auto flex-1 flex flex-col ${isMobile ? "min-h-[100dvh]" : "max-h-[420px]"}`}>
        {notifications.length === 0 ? (
          <div className={`flex-1 flex flex-col items-center justify-center text-brand-muted ${isMobile ? "bg-brand-black py-0 text-base" : "py-8 text-sm"}`}>
            <Bell className={`mb-4 opacity-20 ${isMobile ? "w-16 h-16" : "w-8 h-8"}`} />
            <p className={isMobile ? "text-lg font-medium" : "text-sm"}>You&apos;re all caught up!</p>
            {isMobile && (
              <p className="text-sm text-brand-muted/50 mt-1">No new notifications</p>
            )}
          </div>
        ) : (
          <div className="flex flex-col">
            {notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => onClickItem(n)}
                className={`text-left border-b border-brand-border/50 hover:bg-brand-card active:bg-brand-card/80 transition-colors flex gap-3 w-full ${!n.read ? "bg-brand-lime/5" : ""} ${isMobile ? "px-5 py-5" : "px-4 py-4"}`}
              >
                <div className={`shrink-0 mt-0.5 ${n.type === "game_win" ? "text-status-warning" : "text-brand-lime"}`}>
                  {n.type === "game_win"
                    ? <Trophy className={isMobile ? "w-5 h-5" : "w-4 h-4"} />
                    : <UserPlus className={isMobile ? "w-5 h-5" : "w-4 h-4"} />}
                </div>
                <div className="flex flex-col gap-1 flex-1 min-w-0">
                  <p className={`${!n.read ? "text-brand-white font-semibold" : "text-brand-muted"} ${isMobile ? "text-base" : "text-sm"}`}>
                    {n.message}
                  </p>
                  <span className={`text-brand-muted/60 font-mono ${isMobile ? "text-xs" : "text-[10px]"}`}>
                    {new Date(n.created_at).toLocaleDateString()}
                  </span>
                </div>
                {!n.read && (
                  <span className="w-2 h-2 rounded-full bg-brand-lime shrink-0 mt-2" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
