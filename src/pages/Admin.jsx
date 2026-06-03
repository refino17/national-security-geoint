import { useEffect, useState } from "react"
import {
  Users,
  Shield,
  Lock,
  Save,
  UserPlus,
  KeyRound,
} from "lucide-react"
import { supabase } from "../services/supabaseClient"

function Admin() {
  const [profiles, setProfiles] = useState([])
  const [message, setMessage] = useState("")
  const [currentUser, setCurrentUser] = useState(null)
  const [creatingUser, setCreatingUser] = useState(false)

  const [newFullName, setNewFullName] = useState("")
  const [newEmail, setNewEmail] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [newRole, setNewRole] = useState("Viewer")
  const [newClearance, setNewClearance] = useState("Level 1")

  useEffect(() => {
    loadCurrentUser()
    fetchProfiles()
  }, [])

  function loadCurrentUser() {
    const savedUser = localStorage.getItem("geoint_user")
    if (savedUser) setCurrentUser(JSON.parse(savedUser))
  }

  async function fetchProfiles() {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false })

    if (!error) setProfiles(data)
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

  async function createUser() {
    setMessage("")

    if (currentUser?.role !== "Admin") {
      setMessage("Only Admin users can create accounts.")
      return
    }

    if (!newFullName || !newEmail || !newPassword) {
      setMessage("Please enter full name, email and temporary password.")
      return
    }

    if (newPassword.length < 6) {
      setMessage("Password must be at least 6 characters.")
      return
    }

    setCreatingUser(true)

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      setMessage("Your session has expired. Please login again.")
      setCreatingUser(false)
      return
    }

    const { data, error } = await supabase.functions.invoke("create-user", {
      body: {
        full_name: newFullName,
        email: newEmail,
        password: newPassword,
        role: newRole,
        clearance_level: newClearance,
      },
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    })

    if (error || data?.success === false) {
      setMessage(data?.error || error?.message || "User creation failed.")
      setCreatingUser(false)
      return
    }

    setMessage("User created successfully.")
    setNewFullName("")
    setNewEmail("")
    setNewPassword("")
    setNewRole("Viewer")
    setNewClearance("Level 1")
    setCreatingUser(false)
    fetchProfiles()
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
      <section className="mb-8 rounded-3xl bg-slate-900/70 border border-white/10 p-5 md:p-7 shadow-card relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl"></div>

        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <p className="text-blue-300 text-sm font-bold mb-2 flex items-center gap-2">
              <KeyRound size={16} />
              Access Control
            </p>

            <h1 className="text-3xl md:text-5xl font-black tracking-tight">
              Admin User Management
            </h1>

            <p className="text-slate-400 mt-3 max-w-3xl">
              Create secure accounts, assign roles, manage clearance levels,
              and control access across the GEOINT platform.
            </p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-3xl p-4 min-w-[240px]">
            <p className="text-xs text-slate-500">CURRENT PERMISSION</p>
            <p className="text-lg font-black text-emerald-300 mt-1">
              {currentUser?.role === "Admin" ? "Admin Enabled" : "Read Only"}
            </p>
          </div>
        </div>
      </section>

      <div className="grid md:grid-cols-4 gap-5 mb-8">
        <Card icon={<Users />} title="Total Users" value={profiles.length} color="text-blue-300" />
        <Card icon={<Shield />} title="Admins" value={adminCount} color="text-emerald-300" />
        <Card icon={<Lock />} title="Analysts" value={analystCount} color="text-yellow-300" />
        <Card icon={<Users />} title="Viewers" value={viewerCount} color="text-purple-300" />
      </div>

      {message && (
        <div className="bg-slate-900/80 border border-white/10 text-slate-300 p-4 rounded-2xl mb-6 text-sm shadow-card">
          {message}
        </div>
      )}

      {currentUser?.role !== "Admin" && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-300 p-4 rounded-2xl mb-6">
          You are not an Admin. You can view users, but you cannot create users or change roles.
        </div>
      )}

      {currentUser?.role === "Admin" && (
        <div className="bg-slate-900/80 border border-white/10 rounded-3xl p-5 md:p-6 mb-8 shadow-card">
          <h2 className="font-black text-xl mb-5 flex items-center gap-2">
            <UserPlus size={20} className="text-emerald-300" />
            Create New User
          </h2>

          <div className="grid md:grid-cols-2 gap-4">
            <FormInput
              value={newFullName}
              onChange={setNewFullName}
              placeholder="Full name"
            />

            <FormInput
              value={newEmail}
              onChange={setNewEmail}
              placeholder="Email address"
            />

            <FormInput
              value={newPassword}
              onChange={setNewPassword}
              placeholder="Temporary password"
              type="password"
            />

            <Select
              value={newRole}
              onChange={setNewRole}
              options={["Viewer", "Analyst", "Admin"]}
            />

            <select
              value={newClearance}
              onChange={(e) => setNewClearance(e.target.value)}
              className="p-4 rounded-2xl bg-slate-950/80 border border-white/10 text-white outline-none focus:border-emerald-400/60 md:col-span-2"
            >
              <option>Level 1</option>
              <option>Level 2</option>
              <option>Level 3</option>
              <option>Level 4</option>
              <option>Level 5</option>
            </select>
          </div>

          <button
            onClick={createUser}
            disabled={creatingUser}
            className="mt-4 bg-gradient-to-r from-emerald-400 to-cyan-400 text-slate-950 font-black px-6 py-3 rounded-2xl hover:opacity-90 transition disabled:opacity-60 shadow-glow"
          >
            {creatingUser ? "Creating User..." : "Create User"}
          </button>

          <p className="text-slate-500 text-xs mt-4">
            Recommended: create new users as Viewer first, then promote them only when needed.
          </p>
        </div>
      )}

      <div className="bg-slate-900/80 border border-white/10 rounded-3xl p-5 md:p-6 shadow-card overflow-x-auto">
        <h2 className="font-black text-xl mb-5">
          User Access Control
        </h2>

        <table className="w-full min-w-[800px]">
          <thead className="border-b border-white/10 text-slate-400">
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
                <tr key={profile.id} className="border-b border-white/5 hover:bg-white/[0.03]">
                  <td className="p-3 font-bold">
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
                      className="bg-slate-950 border border-white/10 text-white p-2 rounded-xl outline-none disabled:opacity-50"
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
                      className="bg-slate-950 border border-white/10 text-white p-2 rounded-xl outline-none disabled:opacity-50"
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
          User creation, role updates and clearance changes are recorded in Audit Center.
        </p>
      </div>
    </div>
  )
}

function FormInput({ value, onChange, placeholder, type = "text" }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      type={type}
      className="p-4 rounded-2xl bg-slate-950/80 border border-white/10 text-white outline-none focus:border-emerald-400/60"
    />
  )
}

function Select({ value, onChange, options }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="p-4 rounded-2xl bg-slate-950/80 border border-white/10 text-white outline-none focus:border-emerald-400/60"
    >
      {options.map((option) => (
        <option key={option}>{option}</option>
      ))}
    </select>
  )
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

export default Admin