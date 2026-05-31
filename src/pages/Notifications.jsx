import { useEffect, useState } from "react"
import { Bell, CheckCircle, AlertTriangle, Shield } from "lucide-react"
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

    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser))
    }
  }

  async function fetchNotifications() {
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })

    if (!error) {
      setNotifications(data)
    }
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
      <h1 className="text-3xl font-bold mb-2">
        Notifications Center
      </h1>

      <p className="text-slate-400 mb-8">
        Monitor alerts, assignments, and operational updates in real time.
      </p>

      <div className="grid md:grid-cols-4 gap-5 mb-8">
        <Card icon={<Bell />} title="Total Notifications" value={notifications.length} color="text-blue-400" />
        <Card icon={<AlertTriangle />} title="Unread" value={unreadCount} color="text-red-400" />
        <Card icon={<Shield />} title="Threat Alerts" value={threatCount} color="text-yellow-400" />
        <Card icon={<CheckCircle />} title="Assignments" value={assignmentCount} color="text-emerald-400" />
      </div>

      {message && (
        <div className="bg-slate-900 border border-slate-700 text-slate-300 p-3 rounded-xl mb-6 text-sm">
          {message}
        </div>
      )}

      <div className="flex justify-end mb-4">
        <button
          onClick={markAllAsRead}
          className="bg-emerald-500 text-slate-950 font-bold px-5 py-2 rounded-xl hover:bg-emerald-400 transition"
        >
          Mark All As Read
        </button>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <h2 className="font-bold text-lg mb-5">
          Activity Notifications
        </h2>

        <div className="space-y-4">
          {notifications.length === 0 ? (
            <p className="text-slate-500">
              No notifications yet.
            </p>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.id}
                className={`border rounded-2xl p-4 ${
                  notification.is_read
                    ? "bg-slate-950 border-slate-800"
                    : "bg-emerald-500/10 border-emerald-500/30"
                }`}
              >
                <div className="flex items-start justify-between gap-5">
                  <div>
                    <p className="font-bold">
                      {notification.title}
                    </p>

                    <p className="text-slate-300 mt-2 text-sm">
                      {notification.message}
                    </p>

                    <p className="text-slate-500 text-xs mt-3">
                      Type: {notification.notification_type} •{" "}
                      {new Date(notification.created_at).toLocaleString()}
                    </p>
                  </div>

                  {!notification.is_read && (
                    <button
                      onClick={() => markAsRead(notification.id)}
                      className="bg-slate-800 text-slate-300 px-4 py-2 rounded-xl text-sm hover:bg-slate-700 transition"
                    >
                      Mark Read
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

function Card({ icon, title, value, color }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
      <div className={`${color} mb-3`}>
        {icon}
      </div>

      <p className="text-slate-400">{title}</p>

      <h2 className="text-3xl font-bold mt-2">{value}</h2>
    </div>
  )
}

export default Notifications