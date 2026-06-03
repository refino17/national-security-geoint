import { useState, useEffect } from "react"
import {
  Lock,
  Upload,
  FileText,
  Download,
  Trash2,
  ShieldCheck,
  ScrollText,
} from "lucide-react"
import { supabase } from "../services/supabaseClient"

function Sharing() {
  const [selectedFile, setSelectedFile] = useState(null)
  const [title, setTitle] = useState("")
  const [summary, setSummary] = useState("")
  const [classification, setClassification] = useState("Confidential")
  const [reportType, setReportType] = useState("Operational")
  const [status, setStatus] = useState("Draft")
  const [linkedThreatId, setLinkedThreatId] = useState("")
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState("")
  const [reports, setReports] = useState([])
  const [threats, setThreats] = useState([])
  const [currentUser, setCurrentUser] = useState(null)

  const canUpload =
    currentUser?.role === "Admin" || currentUser?.role === "Analyst"

  const canDelete = currentUser?.role === "Admin"
  const canApprove = currentUser?.role === "Admin"

  useEffect(() => {
    loadCurrentUser()
    fetchReports()
    fetchThreats()
  }, [])

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

  async function createNotification(title, message, notificationType) {
    await supabase.from("notifications").insert({
      title,
      message,
      notification_type: notificationType,
      recipient_id: null,
      is_read: false,
    })
  }

  function loadCurrentUser() {
    const savedUser = localStorage.getItem("geoint_user")
    if (savedUser) setCurrentUser(JSON.parse(savedUser))
  }

  async function fetchReports() {
    const { data, error } = await supabase
      .from("intelligence_reports")
      .select(`
        *,
        linked_threat:threats(
          id,
          title,
          location,
          priority,
          status
        )
      `)
      .order("created_at", { ascending: false })

    if (!error) setReports(data)
  }

  async function fetchThreats() {
    const { data, error } = await supabase
      .from("threats")
      .select("id, title, location, priority, status")
      .order("created_at", { ascending: false })

    if (!error) setThreats(data)
  }

  async function handleUpload() {
    setMessage("")

    if (!canUpload) {
      setMessage("Your role does not have permission to upload reports.")
      return
    }

    if (!selectedFile) {
      setMessage("Please choose a file first.")
      return
    }

    if (!title) {
      setMessage("Please enter a report title.")
      return
    }

    if (!summary) {
      setMessage("Please enter a report summary.")
      return
    }

    setUploading(true)

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      setMessage("You must be logged in to upload reports.")
      setUploading(false)
      return
    }

    const filePath = `${user.id}/${Date.now()}-${selectedFile.name}`

    const { error: uploadError } = await supabase.storage
      .from("classified-reports")
      .upload(filePath, selectedFile)

    if (uploadError) {
      setMessage(uploadError.message)
      setUploading(false)
      return
    }

    const { error: dbError } = await supabase
      .from("intelligence_reports")
      .insert({
        title,
        summary,
        classification,
        report_type: reportType,
        status,
        linked_threat_id: linkedThreatId || null,
        file_path: filePath,
        uploaded_by: user.id,
      })

    if (dbError) {
      setMessage(dbError.message)
      setUploading(false)
      return
    }

    await logAudit(
      "CREATE_INTELLIGENCE_REPORT",
      `${currentUser?.name || user.email} created intelligence report "${title}" with classification "${classification}"`
    )

    await createNotification(
      "New Intelligence Report",
      `${currentUser?.name || user.email} created report "${title}". Classification: ${classification}.`,
      "report"
    )

    setMessage("Intelligence report created successfully.")
    setSelectedFile(null)
    setTitle("")
    setSummary("")
    setClassification("Confidential")
    setReportType("Operational")
    setStatus("Draft")
    setLinkedThreatId("")
    setUploading(false)
    fetchReports()
  }

  async function handleDownload(report) {
    const { data, error } = await supabase.storage
      .from("classified-reports")
      .createSignedUrl(report.file_path, 60)

    if (error) {
      setMessage(error.message)
      return
    }

    await logAudit(
      "VIEW_REPORT",
      `${currentUser?.name || "User"} viewed report "${report.title}"`
    )

    window.open(data.signedUrl, "_blank")
  }

  async function handleDelete(report) {
    if (!canDelete) {
      setMessage("Only Admin users can delete reports.")
      return
    }

    const confirmDelete = window.confirm(
      `Delete "${report.title}" permanently?`
    )

    if (!confirmDelete) return

    const { error: storageError } = await supabase.storage
      .from("classified-reports")
      .remove([report.file_path])

    if (storageError) {
      setMessage(storageError.message)
      return
    }

    const { error: dbError } = await supabase
      .from("intelligence_reports")
      .delete()
      .eq("id", report.id)

    if (dbError) {
      setMessage(dbError.message)
      return
    }

    await logAudit(
      "DELETE_REPORT",
      `${currentUser?.name || "Admin"} deleted report "${report.title}"`
    )

    await createNotification(
      "Intelligence Report Deleted",
      `${currentUser?.name || "Admin"} deleted report "${report.title}".`,
      "report"
    )

    setMessage("Report deleted successfully.")
    fetchReports()
  }

  async function handleStatusChange(report, newStatus) {
    if (!canApprove) {
      setMessage("Only Admin users can update report approval status.")
      return
    }

    const { error } = await supabase
      .from("intelligence_reports")
      .update({ status: newStatus })
      .eq("id", report.id)

    if (error) {
      setMessage(error.message)
      return
    }

    await logAudit(
      "UPDATE_REPORT_STATUS",
      `${currentUser?.name || "Admin"} changed report "${report.title}" status to "${newStatus}"`
    )

    await createNotification(
      "Report Status Updated",
      `Report "${report.title}" status changed to ${newStatus}.`,
      "report"
    )

    setMessage("Report status updated.")
    fetchReports()
  }

  const approvedCount = reports.filter((report) => report.status === "Approved").length
  const draftCount = reports.filter((report) => report.status === "Draft").length
  const topSecretCount = reports.filter((report) => report.classification === "Top Secret").length

  return (
    <div>
      <section className="mb-8 rounded-3xl bg-slate-900/70 border border-white/10 p-5 md:p-7 shadow-card relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl"></div>

        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <p className="text-purple-300 text-sm font-bold mb-2 flex items-center gap-2">
              <ScrollText size={16} />
              Secure Intelligence Registry
            </p>

            <h1 className="text-3xl md:text-5xl font-black tracking-tight">
              Intelligence Reports Center
            </h1>

            <p className="text-slate-400 mt-3 max-w-3xl">
              Create, classify, approve, link and securely distribute
              intelligence reports between authorized operational units.
            </p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-3xl p-4 min-w-[240px]">
            <p className="text-xs text-slate-500">CURRENT ACCESS</p>
            <p className="text-lg font-black text-emerald-300 mt-1">
              {currentUser?.role || "Loading"} • {currentUser?.clearance || "Loading"}
            </p>
          </div>
        </div>
      </section>

      <div className="grid md:grid-cols-4 gap-5 mb-8">
        <Card icon={<FileText />} title="Total Reports" value={reports.length} color="text-blue-300" />
        <Card icon={<ShieldCheck />} title="Approved" value={approvedCount} color="text-emerald-300" />
        <Card icon={<Lock />} title="Top Secret" value={topSecretCount} color="text-purple-300" />
        <Card icon={<Upload />} title="Draft Reports" value={draftCount} color="text-yellow-300" />
      </div>

      {message && (
        <div className="bg-slate-900/80 border border-white/10 text-slate-300 p-4 rounded-2xl mb-6 text-sm shadow-card">
          {message}
        </div>
      )}

      <div className="bg-slate-900/80 border border-white/10 rounded-3xl p-5 md:p-6 shadow-card overflow-x-auto">
        <h2 className="font-black text-xl mb-5">
          Intelligence Report Registry
        </h2>

        <table className="w-full min-w-[1000px]">
          <thead className="border-b border-white/10 text-slate-400">
            <tr>
              <th className="text-left p-3">Report</th>
              <th className="text-left p-3">Classification</th>
              <th className="text-left p-3">Type</th>
              <th className="text-left p-3">Linked Threat</th>
              <th className="text-left p-3">Approval</th>
              <th className="text-left p-3">Action</th>
            </tr>
          </thead>

          <tbody>
            {reports.length === 0 ? (
              <tr>
                <td className="p-3 text-slate-500" colSpan="6">
                  No intelligence reports created yet.
                </td>
              </tr>
            ) : (
              reports.map((report) => (
                <Row
                  key={report.id}
                  report={report}
                  canDelete={canDelete}
                  canApprove={canApprove}
                  onDownload={() => handleDownload(report)}
                  onDelete={() => handleDelete(report)}
                  onStatusChange={(newStatus) =>
                    handleStatusChange(report, newStatus)
                  }
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {canUpload ? (
        <div className="bg-slate-900/80 border border-white/10 rounded-3xl p-5 md:p-6 mt-8 shadow-card">
          <h2 className="font-black text-xl mb-5 flex items-center gap-2">
            <Upload size={20} className="text-emerald-300" />
            Create Intelligence Report
          </h2>

          <div className="border-2 border-dashed border-white/10 rounded-3xl p-6 md:p-10 bg-slate-950/40">
            <Upload className="mx-auto text-emerald-300 mb-4" size={42} />

            <p className="text-slate-300 mb-6 text-center">
              Upload intelligence reports securely to Supabase Storage and link them to operational threats.
            </p>

            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Report title"
              className="w-full p-4 rounded-2xl bg-slate-950/80 border border-white/10 text-white mb-4 outline-none focus:border-emerald-400/60"
            />

            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Report summary / analyst assessment"
              className="w-full p-4 rounded-2xl bg-slate-950/80 border border-white/10 text-white mb-4 outline-none focus:border-emerald-400/60 h-28"
            />

            <div className="grid md:grid-cols-2 gap-4">
              <Select value={classification} onChange={setClassification} options={["Confidential", "Secret", "Top Secret"]} />
              <Select value={reportType} onChange={setReportType} options={["Operational", "Strategic", "Tactical", "Satellite", "Weather", "Incident"]} />
              <Select value={status} onChange={setStatus} options={["Draft", "Reviewed", "Approved"]} />

              <select
                value={linkedThreatId}
                onChange={(e) => setLinkedThreatId(e.target.value)}
                className="w-full p-4 rounded-2xl bg-slate-950/80 border border-white/10 text-white mb-4 outline-none focus:border-emerald-400/60"
              >
                <option value="">Link to threat case</option>
                {threats.map((threat) => (
                  <option key={threat.id} value={threat.id}>
                    {threat.title} — {threat.location}
                  </option>
                ))}
              </select>
            </div>

            <input
              type="file"
              onChange={(e) => setSelectedFile(e.target.files[0])}
              className="w-full text-sm text-slate-300 mb-6"
            />

            <button
              onClick={handleUpload}
              disabled={uploading}
              className="w-full bg-gradient-to-r from-emerald-400 to-cyan-400 text-slate-950 font-black p-4 rounded-2xl hover:opacity-90 transition disabled:opacity-60 shadow-glow"
            >
              {uploading ? "Creating Report..." : "Create Intelligence Report"}
            </button>

            <p className="text-slate-500 mt-4 text-xs text-center">
              Accepted: PDF • DOCX • Images • Intelligence Reports
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-slate-900/80 border border-white/10 rounded-3xl p-6 mt-8 shadow-card">
          <h2 className="font-black text-xl mb-2">
            Report Creation Restricted
          </h2>
          <p className="text-slate-400">
            Viewer access is read-only. Contact an Admin for report creation permissions.
          </p>
        </div>
      )}
    </div>
  )
}

function Select({ value, onChange, options }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full p-4 rounded-2xl bg-slate-950/80 border border-white/10 text-white mb-4 outline-none focus:border-emerald-400/60"
    >
      {options.map((option) => (
        <option key={option}>{option}</option>
      ))}
    </select>
  )
}

function Row({
  report,
  canDelete,
  canApprove,
  onDownload,
  onDelete,
  onStatusChange,
}) {
  return (
    <tr className="border-b border-white/5 hover:bg-white/[0.03]">
      <td className="p-3">
        <p className="font-black">{report.title}</p>
        <p className="text-xs text-slate-500 mt-1 max-w-md truncate">
          {report.summary || "No summary provided."}
        </p>
      </td>

      <td className="p-3">
        <ClassificationBadge classification={report.classification} />
      </td>

      <td className="p-3 text-slate-300">
        {report.report_type || "Operational"}
      </td>

      <td className="p-3 text-slate-300">
        {report.linked_threat
          ? `${report.linked_threat.title} (${report.linked_threat.location})`
          : "Not linked"}
      </td>

      <td className="p-3">
        <select
          value={report.status || "Draft"}
          onChange={(e) => onStatusChange(e.target.value)}
          disabled={!canApprove}
          className="bg-slate-950 border border-white/10 text-white p-2 rounded-xl outline-none disabled:opacity-50"
        >
          <option>Draft</option>
          <option>Reviewed</option>
          <option>Approved</option>
        </select>
      </td>

      <td className="p-3">
        <div className="flex gap-2">
          <button
            onClick={onDownload}
            className="flex items-center gap-2 bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 px-3 py-2 rounded-xl text-sm hover:bg-emerald-500/20 transition"
          >
            <Download size={15} />
            View
          </button>

          {canDelete && (
            <button
              onClick={onDelete}
              className="flex items-center gap-2 bg-red-500/10 text-red-300 border border-red-500/20 px-3 py-2 rounded-xl text-sm hover:bg-red-500/20 transition"
            >
              <Trash2 size={15} />
              Delete
            </button>
          )}
        </div>
      </td>
    </tr>
  )
}

function ClassificationBadge({ classification }) {
  const styles = {
    "Top Secret": "bg-red-500/10 text-red-300 border-red-500/20",
    Secret: "bg-orange-500/10 text-orange-300 border-orange-500/20",
    Confidential: "bg-yellow-500/10 text-yellow-300 border-yellow-500/20",
  }

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-black border ${styles[classification] || styles.Confidential}`}>
      {classification}
    </span>
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

export default Sharing