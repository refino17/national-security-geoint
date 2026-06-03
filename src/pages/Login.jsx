import { useState } from "react"
import {
  Shield,
  Lock,
  Satellite,
  Radar,
  Eye,
  EyeOff,
  Radio,
} from "lucide-react"
import { supabase } from "../services/supabaseClient"

function Login() {
  const [email, setEmail] = useState("refino@gmail.com")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
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
    <div className="min-h-screen bg-slate-950 bg-ops-gradient text-white flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl"></div>
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>

      <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-8 items-center relative z-10">
        <div className="hidden lg:block">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm font-semibold mb-6">
            <Radio size={16} />
            Secure Operations Network
          </div>

          <h1 className="text-5xl font-black tracking-tight leading-tight">
            GEOINT Secure
            <span className="block text-emerald-300">
              Command Platform
            </span>
          </h1>

          <p className="text-slate-400 mt-5 max-w-xl leading-relaxed">
            Access a secured intelligence workspace for threat monitoring,
            satellite visualization, operational alerts, evidence management,
            and role-based national security workflows.
          </p>

          <div className="grid grid-cols-3 gap-4 mt-10 max-w-xl">
            <FeatureCard icon={<Satellite />} title="Satellite" />
            <FeatureCard icon={<Radar />} title="Realtime" />
            <FeatureCard icon={<Shield />} title="RBAC" />
          </div>
        </div>

        <div className="bg-slate-900/80 backdrop-blur-xl border border-white/10 p-6 md:p-8 rounded-[2rem] shadow-card w-full max-w-md mx-auto">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-5">
              <div className="bg-gradient-to-br from-emerald-400 to-cyan-400 p-4 rounded-3xl shadow-glow">
                <Shield className="text-slate-950" size={42} />
              </div>
            </div>

            <h1 className="text-3xl text-white font-black tracking-tight">
              Secure Access
            </h1>

            <p className="text-slate-400 mt-2">
              National Security Operations Center
            </p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-300 p-4 rounded-2xl mb-5 text-sm">
              {error}
            </div>
          )}

          <label className="text-sm text-slate-400 mb-2 block">
            Authorized Email
          </label>

          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full p-4 rounded-2xl bg-slate-950/80 border border-white/10 text-white mb-5 outline-none focus:border-emerald-400/60 transition"
          />

          <label className="text-sm text-slate-400 mb-2 block">
            Secure Password
          </label>

          <div className="relative mb-6">
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              className="w-full p-4 pr-12 rounded-2xl bg-slate-950/80 border border-white/10 text-white outline-none focus:border-emerald-400/60 transition"
            />

            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full bg-gradient-to-r from-emerald-400 to-cyan-400 text-slate-950 font-black p-4 rounded-2xl flex items-center justify-center gap-2 hover:opacity-90 transition disabled:opacity-60 shadow-glow"
          >
            <Lock size={18} />
            {loading ? "Authenticating..." : "Enter Command Center"}
          </button>

          <div className="mt-6 rounded-2xl bg-white/5 border border-white/10 p-4">
            <p className="text-xs text-slate-500 mb-2">
              ACCESS POLICY
            </p>

            <p className="text-sm text-slate-300">
              Public signup is disabled. Accounts are created by authorized Admin users only.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function FeatureCard({ icon, title }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-3xl p-5">
      <div className="text-emerald-300 mb-3">
        {icon}
      </div>

      <p className="font-bold">
        {title}
      </p>

      <p className="text-xs text-slate-500 mt-1">
        Intelligence Layer
      </p>
    </div>
  )
}

export default Login