import { useEffect, useState } from "react"
import { Users, Shield, Lock, Save } from "lucide-react"
import { supabase } from "../services/supabaseClient"

function Admin() {
  const [profiles, setProfiles] = useState([])
  const [message, setMessage] = useState("")
  const [currentUser, setCurrentUser] = useState(null)

  useEffect(() => {
    loadCurrentUser()
    fetchProfiles()
  }, [])

  function loadCurrentUser() {
    const savedUser = localStorage.getItem("geoint_user")

    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser))
    }
  }

  async function fetchProfiles() {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false })

    if (!error) {
      setProfiles(data)
    }
  }

  async function logAudit(action, details) {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return

    await supabase.from("audit_logs").insert({
      user_id: user.id,
      user_email: user.email,
      action,
      details,
    })
  }

  async function updateProfile(profile, field, value) {
    if (currentUser?.role !== "Admin") {
      setMessage("Only Admin users can update roles and clearance levels.")
      return
    }

    const updatedProfile = {
      ...profile,
      [field]: value,
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        role: updatedProfile.role,
        clearance_level: updatedProfile.clearance_level,
      })
      .eq("id", profile.id)

    if (error) {
      setMessage(error.message)
      return
    }

    await logAudit(
      "UPDATE_USER_PROFILE",
      `${currentUser.name} updated ${profile.email}: ${field} changed to ${value}`
    )

    setMessage("User profile updated successfully.")
    fetchProfiles()
  }

  const adminCount = profiles.filter((p) => p.role === "Admin").length
  const analystCount = profiles.filter((p) => p.role === "Analyst").length
  const viewerCount = profiles.filter((p) => p.role === "Viewer").length

  return (
    <div>
      <h1 className="text-3xl font-bold mb-2">
        Admin User Management
      </h1>

      <p className="text-slate-400 mb-8">
        Manage user roles, clearance levels, and access permissions.
      </p>

      <div className="grid md:grid-cols-4 gap-5 mb-8">
        <Card icon={<Users />} title="Total Users" value={profiles.length} color="text-blue-400" />
        <Card icon={<Shield />} title="Admins" value={adminCount} color="text-emerald-400" />
        <Card icon={<Lock />} title="Analysts" value={analystCount} color="text-yellow-400" />
        <Card icon={<Users />} title="Viewers" value={viewerCount} color="text-purple-400" />
      </div>

      {message && (
        <div className="bg-slate-900 border border-slate-700 text-slate-300 p-3 rounded-xl mb-6 text-sm">
          {message}
        </div>
      )}

      {currentUser?.role !== "Admin" && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-2xl mb-6">
          You are not an Admin. You can view users, but you cannot change roles or clearance levels.
        </div>
      )}

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <h2 className="font-bold text-lg mb-5">
          User Access Control
        </h2>

        <table className="w-full">
          <thead className="border-b border-slate-700 text-slate-400">
            <tr>
              <th className="text-left p-3">Full Name</th>
              <th className="text-left p-3">Email</th>
              <th className="text-left p-3">Role</th>
              <th className="text-left p-3">Clearance</th>
            </tr>
          </thead>

          <tbody>
            {profiles.length === 0 ? (
              <tr>
                <td className="p-3 text-slate-500" colSpan="4">
                  No users found.
                </td>
              </tr>
            ) : (
              profiles.map((profile) => (
                <tr key={profile.id} className="border-b border-slate-800">
                  <td className="p-3">
                    {profile.full_name}
                  </td>

                  <td className="p-3 text-slate-300">
                    {profile.email}
                  </td>

                  <td className="p-3">
                    <select
                      value={profile.role}
                      onChange={(e) =>
                        updateProfile(profile, "role", e.target.value)
                      }
                      disabled={currentUser?.role !== "Admin"}
                      className="bg-slate-800 text-white p-2 rounded-lg outline-none disabled:opacity-50"
                    >
                      <option>Admin</option>
                      <option>Analyst</option>
                      <option>Viewer</option>
                    </select>
                  </td>

                  <td className="p-3">
                    <select
                      value={profile.clearance_level}
                      onChange={(e) =>
                        updateProfile(profile, "clearance_level", e.target.value)
                      }
                      disabled={currentUser?.role !== "Admin"}
                      className="bg-slate-800 text-white p-2 rounded-lg outline-none disabled:opacity-50"
                    >
                      <option>Level 1</option>
                      <option>Level 2</option>
                      <option>Level 3</option>
                      <option>Level 4</option>
                      <option>Level 5</option>
                    </select>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <p className="text-slate-500 text-xs mt-5 flex items-center gap-2">
          <Save size={14} />
          Changes are saved instantly and recorded in Audit Center.
        </p>
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

export default Admin