import { useState, useEffect } from "react"
import { Lock, Upload, Users, FileText, Download, Trash2 } from "lucide-react"
import { supabase } from "../services/supabaseClient"

function Sharing() {
  const [selectedFile, setSelectedFile] = useState(null)
  const [title, setTitle] = useState("")
  const [classification, setClassification] = useState("Confidential")
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState("")
  const [reports, setReports] = useState([])
  const [currentUser, setCurrentUser] = useState(null)

  const canUpload =
    currentUser?.role === "Admin" || currentUser?.role === "Analyst"

  const canDelete = currentUser?.role === "Admin"

  useEffect(() => {
    loadCurrentUser()
    fetchReports()
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

  async function loadCurrentUser() {
    const savedUser = localStorage.getItem("geoint_user")

    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser))
    }
  }

  async function fetchReports() {
    const { data, error } = await supabase
      .from("intelligence_reports")
      .select("*")
      .order("created_at", { ascending: false })

    if (!error) {
      setReports(data)
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
        classification,
        file_path: filePath,
        uploaded_by: user.id,
      })

    if (dbError) {
      setMessage(dbError.message)
      setUploading(false)
      return
    }

    await logAudit(
      "UPLOAD_REPORT",
      `${currentUser?.name || user.email} uploaded report "${title}" with classification "${classification}"`
    )

    setMessage("Report uploaded successfully.")
    setSelectedFile(null)
    setTitle("")
    setClassification("Confidential")
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

    setMessage("Report deleted successfully.")
    fetchReports()
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-2">
        Secure Intelligence Sharing
      </h1>

      <p className="text-slate-400 mb-4">
        Share classified reports, manage access levels,
        and control intelligence distribution between authorized units.
      </p>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-8">
        <p className="text-sm text-slate-400">Current Access Level</p>
        <p className="font-semibold text-emerald-400">
          {currentUser?.role || "Loading"} • {currentUser?.clearance || "Loading"}
        </p>

        <p className="text-xs text-slate-500 mt-2">
          Admin can view, upload and delete. Analyst can view and upload. Viewer can only view.
        </p>
      </div>

      <div className="grid md:grid-cols-4 gap-5 mb-8">
        <Card icon={<FileText />} title="Shared Reports" value={reports.length} color="text-blue-400" />
        <Card icon={<Users />} title="Authorized Users" value="124" color="text-emerald-400" />
        <Card icon={<Lock />} title="Encrypted Files" value={reports.length} color="text-purple-400" />
        <Card icon={<Upload />} title="Uploads Today" value={reports.length} color="text-yellow-400" />
      </div>

      {message && (
        <div className="bg-slate-900 border border-slate-700 text-slate-300 p-3 rounded-xl mb-6 text-sm">
          {message}
        </div>
      )}

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <h2 className="font-bold text-lg mb-5">
          Intelligence Sharing Log
        </h2>

        <table className="w-full">
          <thead className="border-b border-slate-700 text-slate-400">
            <tr>
              <th className="text-left p-3">Report</th>
              <th className="text-left p-3">Classification</th>
              <th className="text-left p-3">Status</th>
              <th className="text-left p-3">Action</th>
            </tr>
          </thead>

          <tbody>
            {reports.length === 0 ? (
              <tr>
                <td className="p-3 text-slate-500" colSpan="4">
                  No uploaded intelligence reports yet.
                </td>
              </tr>
            ) : (
              reports.map((report) => (
                <Row
                  key={report.id}
                  report={report}
                  canDelete={canDelete}
                  onDownload={() => handleDownload(report)}
                  onDelete={() => handleDelete(report)}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {canUpload ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mt-8">
          <h2 className="font-bold text-lg mb-4">
            Classified Report Upload
          </h2>

          <div className="border-2 border-dashed border-slate-700 rounded-2xl p-10">
            <Upload className="mx-auto text-emerald-400 mb-4" size={42} />

            <p className="text-slate-300 mb-6 text-center">
              Upload intelligence reports securely to Supabase Storage
            </p>

            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Report title"
              className="w-full p-3 rounded-xl bg-slate-800 text-white mb-4 outline-none"
            />

            <select
              value={classification}
              onChange={(e) => setClassification(e.target.value)}
              className="w-full p-3 rounded-xl bg-slate-800 text-white mb-4 outline-none"
            >
              <option>Confidential</option>
              <option>Secret</option>
              <option>Top Secret</option>
            </select>

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
              {uploading ? "Uploading..." : "Upload Classified Report"}
            </button>

            <p className="text-slate-500 mt-4 text-xs text-center">
              Accepted: PDF • DOCX • Images • Intelligence Reports
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mt-8">
          <h2 className="font-bold text-lg mb-2">
            Upload Restricted
          </h2>
          <p className="text-slate-400">
            Viewer access is read-only. Contact an Admin for upload permissions.
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

function Row({ report, canDelete, onDownload, onDelete }) {
  return (
    <tr className="border-b border-slate-800">
      <td className="p-3">{report.title}</td>
      <td className="p-3">{report.classification}</td>
      <td className="p-3 text-emerald-400">Encrypted</td>
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

export default Sharing