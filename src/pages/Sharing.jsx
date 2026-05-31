import { useState, useEffect } from "react"
import {
  Lock,
  Upload,
  Users,
  FileText,
  Download,
  Trash2,
  ShieldCheck,
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

    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser))
    }
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

    if (!error) {
      setReports(data)
    }
  }

  async function fetchThreats() {
    const { data, error } = await supabase
      .from("threats")
      .select("id, title, location, priority, status")
      .order("created_at", { ascending: false })

    if (!error) {
      setThreats(data)
    }
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
      <h1 className="text-3xl font-bold mb-2">
        Intelligence Reports Center
      </h1>

      <p className="text-slate-400 mb-4">
        Create, classify, approve and securely distribute intelligence reports between authorized units.
      </p>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-8">
        <p className="text-sm text-slate-400">Current Access Level</p>
        <p className="font-semibold text-emerald-400">
          {currentUser?.role || "Loading"} • {currentUser?.clearance || "Loading"}
        </p>

        <p className="text-xs text-slate-500 mt-2">
          Admin can create, approve, view and delete. Analyst can create and view. Viewer can only view.
        </p>
      </div>

      <div className="grid md:grid-cols-4 gap-5 mb-8">
        <Card icon={<FileText />} title="Total Reports" value={reports.length} color="text-blue-400" />
        <Card icon={<ShieldCheck />} title="Approved" value={approvedCount} color="text-emerald-400" />
        <Card icon={<Lock />} title="Top Secret" value={topSecretCount} color="text-purple-400" />
        <Card icon={<Upload />} title="Draft Reports" value={draftCount} color="text-yellow-400" />
      </div>

      {message && (
        <div className="bg-slate-900 border border-slate-700 text-slate-300 p-3 rounded-xl mb-6 text-sm">
          {message}
        </div>
      )}

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <h2 className="font-bold text-lg mb-5">
          Intelligence Report Registry
        </h2>

        <table className="w-full">
          <thead className="border-b border-slate-700 text-slate-400">
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
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mt-8">
          <h2 className="font-bold text-lg mb-4">
            Create Intelligence Report
          </h2>

          <div className="border-2 border-dashed border-slate-700 rounded-2xl p-10">
            <Upload className="mx-auto text-emerald-400 mb-4" size={42} />

            <p className="text-slate-300 mb-6 text-center">
              Upload intelligence reports securely to Supabase Storage and link them to operational threats.
            </p>

            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Report title"
              className="w-full p-3 rounded-xl bg-slate-800 text-white mb-4 outline-none"
            />

            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Report summary / analyst assessment"
              className="w-full p-3 rounded-xl bg-slate-800 text-white mb-4 outline-none h-28"
            />

            <div className="grid md:grid-cols-2 gap-4">
              <select
                value={classification}
                onChange={(e) => setClassification(e.target.value)}
                className="w-full p-3 rounded-xl bg-slate-800 text-white mb-4 outline-none"
              >
                <option>Confidential</option>
                <option>Secret</option>
                <option>Top Secret</option>
              </select>

              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className="w-full p-3 rounded-xl bg-slate-800 text-white mb-4 outline-none"
              >
                <option>Operational</option>
                <option>Strategic</option>
                <option>Tactical</option>
                <option>Satellite</option>
                <option>Weather</option>
                <option>Incident</option>
              </select>

              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full p-3 rounded-xl bg-slate-800 text-white mb-4 outline-none"
              >
                <option>Draft</option>
                <option>Reviewed</option>
                <option>Approved</option>
              </select>

              <select
                value={linkedThreatId}
                onChange={(e) => setLinkedThreatId(e.target.value)}
                className="w-full p-3 rounded-xl bg-slate-800 text-white mb-4 outline-none"
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
              className="w-full bg-emerald-500 text-slate-950 font-bold p-3 rounded-xl hover:bg-emerald-400 transition disabled:opacity-60"
            >
              {uploading ? "Creating Report..." : "Create Intelligence Report"}
            </button>

            <p className="text-slate-500 mt-4 text-xs text-center">
              Accepted: PDF • DOCX • Images • Intelligence Reports
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mt-8">
          <h2 className="font-bold text-lg mb-2">
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

function Card({ icon, title, value, color }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
      <div className={`${color} mb-3`}>
        {icon}
      </div>

      <p className="text-slate-400">
        {title}
      </p>

      <h2 className="text-3xl font-bold mt-2">
        {value}
      </h2>
    </div>
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
    <tr className="border-b border-slate-800">
      <td className="p-3">
        <p className="font-semibold">{report.title}</p>
        <p className="text-xs text-slate-500 mt-1">
          {report.summary || "No summary provided."}
        </p>
      </td>

      <td className={`p-3 font-semibold ${classificationColor(report.classification)}`}>
        {report.classification}
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
          className="bg-slate-800 text-white p-2 rounded-lg outline-none disabled:opacity-50"
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
            className="flex items-center gap-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-3 py-2 rounded-lg text-sm hover:bg-emerald-500/20 transition"
          >
            <Download size={15} />
            View
          </button>

          {canDelete && (
            <button
              onClick={onDelete}
              className="flex items-center gap-2 bg-red-500/10 text-red-400 border border-red-500/30 px-3 py-2 rounded-lg text-sm hover:bg-red-500/20 transition"
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

function classificationColor(classification) {
  if (classification === "Top Secret") return "text-red-400"
  if (classification === "Secret") return "text-orange-400"
  return "text-yellow-400"
}

export default Sharing