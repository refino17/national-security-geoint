import { useState } from "react"
import { Shield, Lock } from "lucide-react"
import { supabase } from "../services/supabaseClient"

function Login() {
  const [email, setEmail] = useState("refino@gmail.com")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleLogin() {
    setLoading(true)
    setError("")

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("full_name, email, role, clearance_level")
      .eq("id", data.user.id)
      .single()

    if (profileError) {
      setError("Login successful, but profile was not found.")
      setLoading(false)
      return
    }

    const userSession = {
      id: data.user.id,
      name: profile.full_name,
      email: profile.email,
      role: profile.role,
      clearance: profile.clearance_level,
      initial: profile.full_name.charAt(0).toUpperCase(),
    }

    await supabase.from("audit_logs").insert({
      user_id: data.user.id,
      user_email: data.user.email,
      action: "LOGIN",
      details: `${profile.full_name} logged into the GEOINT platform`,
    })

    localStorage.setItem("geoint_user", JSON.stringify(userSession))
    window.location.href = "/"
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl w-[400px]">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Shield className="text-emerald-400" size={50} />
          </div>

          <h1 className="text-2xl text-white font-bold">
            GEOINT Secure Access
          </h1>

          <p className="text-slate-400 mt-2">
            National Security Operations Center
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-xl mb-4 text-sm">
            {error}
          </div>
        )}

        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="w-full p-3 rounded-xl bg-slate-800 text-white mb-4 outline-none"
        />

        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          placeholder="Password"
          className="w-full p-3 rounded-xl bg-slate-800 text-white mb-6 outline-none"
        />

        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full bg-emerald-500 text-slate-950 font-bold p-3 rounded-xl flex items-center justify-center gap-2 hover:bg-emerald-400 transition disabled:opacity-60"
        >
          <Lock size={18} />
          {loading ? "Authenticating..." : "Secure Login"}
        </button>
      </div>
    </div>
  )
}

export default Login