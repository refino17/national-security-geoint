import { useEffect, useState } from "react"
import {
  Bell,
  CheckCircle,
  AlertTriangle,
  Shield,
  Radio,
  CheckCheck,
} from "lucide-react"
import { supabase } from "../services/supabaseClient"

function Notifications() {
  const [notifications, setNotifications] = useState([])
  const [currentUser, setCurrentUser] = useState(null)
  const [message, setMessage] = useState("")

  useEffect(() => {
    loadCurrentUser()
    fetchNotifications()

    const channel = supabase
      .channel("notifications-center")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
        },
        () => {
          fetchNotifications()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  function loadCurrentUser() {
    const savedUser = localStorage.getItem("geoint_user")
    if (savedUser) setCurrentUser(JSON.parse(savedUser))
  }

  async function fetchNotifications() {
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })

    if (!error) setNotifications(data)
  }

  async function markAsRead(notificationId) {
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", notificationId)

    if (error) {
      setMessage(error.message)
      return
    }

    setMessage("Notification marked as read.")
    fetchNotifications()
  }

  async function markAllAsRead() {
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("is_read", false)

    if (error) {
      setMessage(error.message)
      return
    }

    setMessage("All notifications marked as read.")
    fetchNotifications()
  }

  const unreadCount = notifications.filter((item) => !item.is_read).length
  const threatCount = notifications.filter((item) => item.notification_type === "threat").length
  const assignmentCount = notifications.filter((item) => item.notification_type === "assignment").length

  return (
    <div>
      <section className="mb-8 rounded-3xl bg-slate-900/70 border border-white/10 p-5 md:p-7 shadow-card relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl"></div>

        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <p className="text-emerald-300 text-sm font-bold mb-2 flex items-center gap-2">
              <Radio size={16} />
              Realtime Event Stream
            </p>

            <h1 className="text-3xl md:text-5xl font-black tracking-tight">
              Notifications Center
            </h1>

            <p className="text-slate-400 mt-3 max-w-3xl">
              Monitor threat alerts, user actions, assignments, reports,
              NASA events and operational updates delivered in real time.
            </p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-3xl p-4 min-w-[240px]">
            <p className="text-xs text-slate-500">CURRENT USER</p>
            <p className="text-lg font-black text-emerald-300 mt-1">
              {currentUser?.role || "Loading"}
            </p>
          </div>
        </div>
      </section>

      <div className="grid md:grid-cols-4 gap-5 mb-8">
        <Card icon={<Bell />} title="Total Notifications" value={notifications.length} color="text-blue-300" />
        <Card icon={<AlertTriangle />} title="Unread" value={unreadCount} color="text-red-300" />
        <Card icon={<Shield />} title="Threat Alerts" value={threatCount} color="text-yellow-300" />
        <Card icon={<CheckCircle />} title="Assignments" value={assignmentCount} color="text-emerald-300" />
      </div>

      {message && (
        <div className="bg-slate-900/80 border border-white/10 text-slate-300 p-4 rounded-2xl mb-6 text-sm shadow-card">
          {message}
        </div>
      )}

      <div className="flex justify-end mb-4">
        <button
          onClick={markAllAsRead}
          className="flex items-center gap-2 bg-gradient-to-r from-emerald-400 to-cyan-400 text-slate-950 font-black px-5 py-3 rounded-2xl hover:opacity-90 transition shadow-glow"
        >
          <CheckCheck size={18} />
          Mark All As Read
        </button>
      </div>

      <div className="bg-slate-900/80 border border-white/10 rounded-3xl p-5 md:p-6 shadow-card">
        <h2 className="font-black text-xl mb-5">
          Activity Notifications
        </h2>

        <div className="space-y-4">
          {notifications.length === 0 ? (
            <p className="text-slate-500">
              No notifications yet.
            </p>
          ) : (
            notifications.map((notification) => (
              <NotificationCard
                key={notification.id}
                notification={notification}
                onMarkRead={() => markAsRead(notification.id)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  )
}

function NotificationCard({ notification, onMarkRead }) {
  return (
    <div
      className={`border rounded-3xl p-5 transition ${
        notification.is_read
          ? "bg-slate-950/80 border-white/10"
          : "bg-emerald-500/10 border-emerald-500/30 shadow-glow"
      }`}
    >
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-5">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <Badge type={notification.notification_type} />

            {!notification.is_read && (
              <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-xs font-black">
                UNREAD
              </span>
            )}
          </div>

          <p className="font-black text-lg">
            {notification.title}
          </p>

          <p className="text-slate-300 mt-2 text-sm">
            {notification.message}
          </p>

          <p className="text-slate-500 text-xs mt-3">
            {new Date(notification.created_at).toLocaleString()}
          </p>
        </div>

        {!notification.is_read && (
          <button
            onClick={onMarkRead}
            className="bg-white/5 text-slate-300 border border-white/10 px-4 py-2 rounded-2xl text-sm hover:bg-white/10 transition"
          >
            Mark Read
          </button>
        )}
      </div>
    </div>
  )
}

function Badge({ type }) {
  const label = formatType(type)

  const styles = {
    threat: "bg-red-500/10 text-red-300 border-red-500/20",
    assignment: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
    status: "bg-blue-500/10 text-blue-300 border-blue-500/20",
    evidence: "bg-purple-500/10 text-purple-300 border-purple-500/20",
    note: "bg-yellow-500/10 text-yellow-300 border-yellow-500/20",
    report: "bg-cyan-500/10 text-cyan-300 border-cyan-500/20",
    user: "bg-indigo-500/10 text-indigo-300 border-indigo-500/20",
    nasa: "bg-orange-500/10 text-orange-300 border-orange-500/20",
    weather: "bg-sky-500/10 text-sky-300 border-sky-500/20",
  }

  return (
    <span className={`px-3 py-1 rounded-full border text-xs font-black ${styles[type] || "bg-slate-500/10 text-slate-300 border-slate-500/20"}`}>
      {label}
    </span>
  )
}

function formatType(type) {
  if (type === "threat") return "THREAT"
  if (type === "assignment") return "ASSIGNMENT"
  if (type === "status") return "STATUS"
  if (type === "evidence") return "EVIDENCE"
  if (type === "note") return "INVESTIGATION"
  if (type === "report") return "REPORT"
  if (type === "user") return "USER"
  if (type === "nasa") return "NASA"
  if (type === "weather") return "WEATHER"
  return "LIVE"
}

function Card({ icon, title, value, color }) {
  return (
    <div className="relative overflow-hidden bg-slate-900/80 border border-white/10 rounded-3xl p-5 shadow-card">
      <div className="absolute -top-10 -right-10 w-28 h-28 bg-white/5 rounded-full blur-2xl"></div>
      <div className={`${color} mb-4 relative`}>{icon}</div>
      <p className="text-slate-400 text-sm relative">{title}</p>
      <h2 className="text-4xl font-black mt-2 relative">{value}</h2>
    </div>
  )
}

export default Notifications