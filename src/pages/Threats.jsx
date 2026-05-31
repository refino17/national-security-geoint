import { useEffect, useState } from "react"
import {
  AlertTriangle,
  Shield,
  Activity,
  UserCheck,
  FileText,
  Upload,
  Eye,
  X,
} from "lucide-react"
import { supabase } from "../services/supabaseClient"

function Threats() {
  const [title, setTitle] = useState("")
  const [location, setLocation] = useState("")
  const [latitude, setLatitude] = useState("")
  const [longitude, setLongitude] = useState("")
  const [priority, setPriority] = useState("Medium")
  const [status, setStatus] = useState("Open")
  const [description, setDescription] = useState("")
  const [assignedTo, setAssignedTo] = useState("")

  const [threats, setThreats] = useState([])
  const [profiles, setProfiles] = useState([])
  const [message, setMessage] = useState("")
  const [currentUser, setCurrentUser] = useState(null)

  const [selectedThreat, setSelectedThreat] = useState(null)
  const [notes, setNotes] = useState([])
  const [evidenceFiles, setEvidenceFiles] = useState([])
  const [newNote, setNewNote] = useState("")
  const [evidenceTitle, setEvidenceTitle] = useState("")
  const [selectedEvidence, setSelectedEvidence] = useState(null)
  const [uploadingEvidence, setUploadingEvidence] = useState(false)

  const canCreate =
    currentUser?.role === "Admin" || currentUser?.role === "Analyst"

  useEffect(() => {
    loadCurrentUser()
    fetchProfiles()
    fetchThreats()
  }, [])

  function loadCurrentUser() {
    const savedUser = localStorage.getItem("geoint_user")
    if (savedUser) setCurrentUser(JSON.parse(savedUser))
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

  async function createNotification(title, message, notificationType, recipientId = null) {
    await supabase.from("notifications").insert({
      title,
      message,
      notification_type: notificationType,
      recipient_id: recipientId,
      is_read: false,
    })
  }

  async function fetchProfiles() {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, email, role")
      .order("full_name", { ascending: true })

    if (!error) setProfiles(data)
  }

  async function fetchThreats() {
    const { data, error } = await supabase
      .from("threats")
      .select("*")
      .order("created_at", { ascending: false })

    if (!error) setThreats(data)
  }

  async function fetchCaseData(threatId) {
    const { data: notesData } = await supabase
      .from("investigation_notes")
      .select("*")
      .eq("threat_id", threatId)
      .order("created_at", { ascending: false })

    const { data: evidenceData } = await supabase
      .from("evidence_files")
      .select("*")
      .eq("threat_id", threatId)
      .order("created_at", { ascending: false })

    setNotes(notesData || [])
    setEvidenceFiles(evidenceData || [])
  }

  function getProfileName(profileId) {
    const profile = profiles.find((item) => item.id === profileId)
    return profile ? profile.full_name : "Unassigned"
  }

  async function handleCreateThreat() {
    setMessage("")

    if (!canCreate) {
      setMessage("Your role does not have permission to create threats.")
      return
    }

    if (!title || !location || !latitude || !longitude) {
      setMessage("Please enter title, location, latitude and longitude.")
      return
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      setMessage("You must be logged in.")
      return
    }

    const { error } = await supabase.from("threats").insert({
      title,
      location,
      latitude: Number(latitude),
      longitude: Number(longitude),
      priority,
      status,
      description,
      assigned_to: assignedTo || null,
      created_by: user.id,
    })

    if (error) {
      setMessage(error.message)
      return
    }

    const assignedName = assignedTo ? getProfileName(assignedTo) : "Unassigned"

    await logAudit(
      "CREATE_THREAT",
      `${currentUser?.name || user.email} created threat "${title}" at "${location}" and assigned it to "${assignedName}"`
    )

    await createNotification(
      "New Threat Created",
      `${currentUser?.name || user.email} created "${title}" at ${location}. Priority: ${priority}.`,
      "threat",
      null
    )

    if (assignedTo) {
      await createNotification(
        "Threat Assigned To You",
        `You have been assigned to threat "${title}" at ${location}.`,
        "assignment",
        assignedTo
      )
    }

    setMessage("Threat created successfully.")
    setTitle("")
    setLocation("")
    setLatitude("")
    setLongitude("")
    setPriority("Medium")
    setStatus("Open")
    setDescription("")
    setAssignedTo("")
    fetchThreats()
  }

  async function handleStatusChange(threat, newStatus) {
    const { error } = await supabase
      .from("threats")
      .update({ status: newStatus })
      .eq("id", threat.id)

    if (error) {
      setMessage(error.message)
      return
    }

    await logAudit(
      "UPDATE_THREAT_STATUS",
      `${currentUser?.name || "User"} changed threat "${threat.title}" status to "${newStatus}"`
    )

    await createNotification(
      "Threat Status Updated",
      `Threat "${threat.title}" status changed to ${newStatus}.`,
      "status",
      threat.assigned_to || null
    )

    setMessage("Threat status updated.")
    fetchThreats()
  }

  async function handleAssignmentChange(threat, newAssignedTo) {
    const { error } = await supabase
      .from("threats")
      .update({ assigned_to: newAssignedTo || null })
      .eq("id", threat.id)

    if (error) {
      setMessage(error.message)
      return
    }

    const assignedName = newAssignedTo
      ? getProfileName(newAssignedTo)
      : "Unassigned"

    await logAudit(
      "ASSIGN_THREAT",
      `${currentUser?.name || "User"} assigned threat "${threat.title}" to "${assignedName}"`
    )

    await createNotification(
      "Threat Assignment Updated",
      `Threat "${threat.title}" was assigned to ${assignedName}.`,
      "assignment",
      newAssignedTo || null
    )

    setMessage("Threat assignment updated.")
    fetchThreats()
  }

  async function openCase(threat) {
    setSelectedThreat(threat)
    setNewNote("")
    setEvidenceTitle("")
    setSelectedEvidence(null)
    await fetchCaseData(threat.id)

    await logAudit(
      "VIEW_THREAT_CASE",
      `${currentUser?.name || "User"} opened case file for threat "${threat.title}"`
    )
  }

  async function handleAddNote() {
    if (!selectedThreat) return

    if (!newNote.trim()) {
      setMessage("Please enter an investigation note.")
      return
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      setMessage("You must be logged in.")
      return
    }

    const { error } = await supabase.from("investigation_notes").insert({
      threat_id: selectedThreat.id,
      note: newNote,
      created_by: user.id,
    })

    if (error) {
      setMessage(error.message)
      return
    }

    await logAudit(
      "ADD_INVESTIGATION_NOTE",
      `${currentUser?.name || user.email} added note to threat "${selectedThreat.title}"`
    )

    await createNotification(
      "Investigation Note Added",
      `${currentUser?.name || user.email} added a note to "${selectedThreat.title}".`,
      "note",
      selectedThreat.assigned_to || null
    )

    setNewNote("")
    setMessage("Investigation note added.")
    fetchCaseData(selectedThreat.id)
  }

  async function handleEvidenceUpload() {
    if (!selectedThreat) return

    if (!evidenceTitle || !selectedEvidence) {
      setMessage("Please enter evidence title and choose a file.")
      return
    }

    setUploadingEvidence(true)

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      setMessage("You must be logged in.")
      setUploadingEvidence(false)
      return
    }

    const filePath = `${selectedThreat.id}/${Date.now()}-${selectedEvidence.name}`

    const { error: uploadError } = await supabase.storage
      .from("evidence-files")
      .upload(filePath, selectedEvidence)

    if (uploadError) {
      setMessage(uploadError.message)
      setUploadingEvidence(false)
      return
    }

    const { error: dbError } = await supabase.from("evidence_files").insert({
      threat_id: selectedThreat.id,
      title: evidenceTitle,
      file_path: filePath,
      uploaded_by: user.id,
    })

    if (dbError) {
      setMessage(dbError.message)
      setUploadingEvidence(false)
      return
    }

    await logAudit(
      "UPLOAD_EVIDENCE",
      `${currentUser?.name || user.email} uploaded evidence "${evidenceTitle}" for threat "${selectedThreat.title}"`
    )

    await createNotification(
      "Evidence Uploaded",
      `${currentUser?.name || user.email} uploaded evidence "${evidenceTitle}" for "${selectedThreat.title}".`,
      "evidence",
      selectedThreat.assigned_to || null
    )

    setEvidenceTitle("")
    setSelectedEvidence(null)
    setUploadingEvidence(false)
    setMessage("Evidence uploaded successfully.")
    fetchCaseData(selectedThreat.id)
  }

  async function handleViewEvidence(filePath, title) {
    const { data, error } = await supabase.storage
      .from("evidence-files")
      .createSignedUrl(filePath, 60)

    if (error) {
      setMessage(error.message)
      return
    }

    await logAudit(
      "VIEW_EVIDENCE",
      `${currentUser?.name || "User"} viewed evidence "${title}"`
    )

    window.open(data.signedUrl, "_blank")
  }

  const criticalCount = threats.filter((item) => item.priority === "Critical").length
  const openCount = threats.filter((item) => item.status === "Open").length
  const assignedCount = threats.filter((item) => item.assigned_to).length

  return (
    <div>
      <h1 className="text-3xl font-bold mb-2">
        Threat Management Center
      </h1>

      <p className="text-slate-400 mb-8">
        Create, monitor, assign and investigate operational threat records.
      </p>

      <div className="grid md:grid-cols-4 gap-5 mb-8">
        <Card icon={<AlertTriangle />} title="Total Threats" value={threats.length} color="text-red-400" />
        <Card icon={<Shield />} title="Open Cases" value={openCount} color="text-yellow-400" />
        <Card icon={<Activity />} title="Critical Priority" value={criticalCount} color="text-orange-400" />
        <Card icon={<UserCheck />} title="Assigned Cases" value={assignedCount} color="text-emerald-400" />
      </div>

      {message && (
        <div className="bg-slate-900 border border-slate-700 text-slate-300 p-3 rounded-xl mb-6 text-sm">
          {message}
        </div>
      )}

      {canCreate && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-8">
          <h2 className="font-bold text-lg mb-5">Create New Threat</h2>

          <div className="grid md:grid-cols-2 gap-4">
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Threat title" className="p-3 rounded-xl bg-slate-800 text-white outline-none" />
            <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Location" className="p-3 rounded-xl bg-slate-800 text-white outline-none" />
            <input value={latitude} onChange={(e) => setLatitude(e.target.value)} placeholder="Latitude e.g. 6.5244" className="p-3 rounded-xl bg-slate-800 text-white outline-none" />
            <input value={longitude} onChange={(e) => setLongitude(e.target.value)} placeholder="Longitude e.g. 3.3792" className="p-3 rounded-xl bg-slate-800 text-white outline-none" />

            <select value={priority} onChange={(e) => setPriority(e.target.value)} className="p-3 rounded-xl bg-slate-800 text-white outline-none">
              <option>Low</option>
              <option>Medium</option>
              <option>High</option>
              <option>Critical</option>
            </select>

            <select value={status} onChange={(e) => setStatus(e.target.value)} className="p-3 rounded-xl bg-slate-800 text-white outline-none">
              <option>Open</option>
              <option>Investigating</option>
              <option>Resolved</option>
            </select>

            <select value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} className="p-3 rounded-xl bg-slate-800 text-white outline-none md:col-span-2">
              <option value="">Assign to agent</option>
              {profiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.full_name} — {profile.role}
                </option>
              ))}
            </select>
          </div>

          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Threat description" className="w-full mt-4 p-3 rounded-xl bg-slate-800 text-white outline-none h-28" />

          <button onClick={handleCreateThreat} className="mt-4 bg-emerald-500 text-slate-950 font-bold px-6 py-3 rounded-xl hover:bg-emerald-400 transition">
            Create Threat
          </button>
        </div>
      )}

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <h2 className="font-bold text-lg mb-5">Threat Records</h2>

        <table className="w-full">
          <thead className="border-b border-slate-700 text-slate-400">
            <tr>
              <th className="text-left p-3">Threat</th>
              <th className="text-left p-3">Location</th>
              <th className="text-left p-3">Priority</th>
              <th className="text-left p-3">Status</th>
              <th className="text-left p-3">Assigned To</th>
              <th className="text-left p-3">Actions</th>
            </tr>
          </thead>

          <tbody>
            {threats.length === 0 ? (
              <tr>
                <td className="p-3 text-slate-500" colSpan="6">
                  No threat records yet.
                </td>
              </tr>
            ) : (
              threats.map((threat) => (
                <tr key={threat.id} className="border-b border-slate-800">
                  <td className="p-3">
                    <p className="font-semibold">{threat.title}</p>
                    <p className="text-xs text-slate-500">{threat.description}</p>
                  </td>

                  <td className="p-3">{threat.location}</td>

                  <td className={`p-3 font-semibold ${priorityColor(threat.priority)}`}>
                    {threat.priority}
                  </td>

                  <td className="p-3">
                    <select value={threat.status} onChange={(e) => handleStatusChange(threat, e.target.value)} className="bg-slate-800 text-white p-2 rounded-lg outline-none">
                      <option>Open</option>
                      <option>Investigating</option>
                      <option>Resolved</option>
                    </select>
                  </td>

                  <td className="p-3">
                    <select value={threat.assigned_to || ""} onChange={(e) => handleAssignmentChange(threat, e.target.value)} className="bg-slate-800 text-white p-2 rounded-lg outline-none">
                      <option value="">Unassigned</option>
                      {profiles.map((profile) => (
                        <option key={profile.id} value={profile.id}>
                          {profile.full_name}
                        </option>
                      ))}
                    </select>
                  </td>

                  <td className="p-3">
                    <button onClick={() => openCase(threat)} className="flex items-center gap-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-3 py-2 rounded-lg text-sm hover:bg-emerald-500/20 transition">
                      <Eye size={15} />
                      View Case
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selectedThreat && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-6">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 w-full max-w-5xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold">{selectedThreat.title}</h2>
                <p className="text-slate-400 text-sm">
                  {selectedThreat.location} • {selectedThreat.priority} • {selectedThreat.status}
                </p>
              </div>

              <button onClick={() => setSelectedThreat(null)} className="text-slate-400 hover:text-white">
                <X />
              </button>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5">
                <h3 className="font-bold mb-4 flex items-center gap-2">
                  <FileText size={18} />
                  Investigation Notes
                </h3>

                <textarea value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="Write investigation note..." className="w-full p-3 rounded-xl bg-slate-800 text-white outline-none h-28 mb-4" />

                <button onClick={handleAddNote} className="bg-emerald-500 text-slate-950 font-bold px-5 py-2 rounded-xl hover:bg-emerald-400 transition">
                  Add Note
                </button>

                <div className="mt-5 space-y-3">
                  {notes.length === 0 ? (
                    <p className="text-slate-500 text-sm">No notes yet.</p>
                  ) : (
                    notes.map((note) => (
                      <div key={note.id} className="bg-slate-900 border border-slate-800 rounded-xl p-3">
                        <p className="text-slate-300 text-sm">{note.note}</p>
                        <p className="text-slate-500 text-xs mt-2">
                          {new Date(note.created_at).toLocaleString()}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5">
                <h3 className="font-bold mb-4 flex items-center gap-2">
                  <Upload size={18} />
                  Evidence Files
                </h3>

                <input value={evidenceTitle} onChange={(e) => setEvidenceTitle(e.target.value)} placeholder="Evidence title" className="w-full p-3 rounded-xl bg-slate-800 text-white outline-none mb-4" />

                <input type="file" onChange={(e) => setSelectedEvidence(e.target.files[0])} className="w-full text-sm text-slate-300 mb-4" />

                <button onClick={handleEvidenceUpload} disabled={uploadingEvidence} className="bg-emerald-500 text-slate-950 font-bold px-5 py-2 rounded-xl hover:bg-emerald-400 transition disabled:opacity-60">
                  {uploadingEvidence ? "Uploading..." : "Upload Evidence"}
                </button>

                <div className="mt-5 space-y-3">
                  {evidenceFiles.length === 0 ? (
                    <p className="text-slate-500 text-sm">No evidence uploaded yet.</p>
                  ) : (
                    evidenceFiles.map((file) => (
                      <div key={file.id} className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-slate-300 text-sm">{file.title}</p>
                          <p className="text-slate-500 text-xs">
                            {new Date(file.created_at).toLocaleString()}
                          </p>
                        </div>

                        <button onClick={() => handleViewEvidence(file.file_path, file.title)} className="bg-blue-500/10 text-blue-400 border border-blue-500/30 px-3 py-2 rounded-lg text-sm">
                          View
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function priorityColor(priority) {
  if (priority === "Critical") return "text-red-400"
  if (priority === "High") return "text-orange-400"
  if (priority === "Medium") return "text-yellow-400"
  return "text-emerald-400"
}

function Card({ icon, title, value, color }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
      <div className={`${color} mb-3`}>{icon}</div>
      <p className="text-slate-400">{title}</p>
      <h2 className="text-3xl font-bold mt-2">{value}</h2>
    </div>
  )
}

export default Threats