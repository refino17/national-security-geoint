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
  Clock,
  Plus,
  MapPin,
  Target,
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
  const [timeline, setTimeline] = useState([])
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

  async function createNotification(
    title,
    message,
    notificationType,
    recipientId = null
  ) {
    await supabase.from("notifications").insert({
      title,
      message,
      notification_type: notificationType,
      recipient_id: recipientId,
      is_read: false,
    })
  }

  async function createTimelineEvent(threatId, eventType, eventMessage) {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return

    await supabase.from("threat_timeline").insert({
      threat_id: threatId,
      event_type: eventType,
      event_message: eventMessage,
      created_by: user.id,
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

    const { data: timelineData } = await supabase
      .from("threat_timeline")
      .select("*")
      .eq("threat_id", threatId)
      .order("created_at", { ascending: false })

    setNotes(notesData || [])
    setEvidenceFiles(evidenceData || [])
    setTimeline(timelineData || [])
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

    const { data: createdThreat, error } = await supabase
      .from("threats")
      .insert({
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
      .select()
      .single()

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

    await createTimelineEvent(
      createdThreat.id,
      "THREAT_CREATED",
      `Threat "${title}" was created at ${location}. Priority: ${priority}. Assigned to ${assignedName}.`
    )

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

    await createTimelineEvent(
      threat.id,
      "STATUS_UPDATED",
      `Status changed to ${newStatus}.`
    )

    setMessage("Threat status updated.")
    fetchThreats()

    if (selectedThreat?.id === threat.id) {
      fetchCaseData(threat.id)
    }
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

    await createTimelineEvent(
      threat.id,
      "ASSIGNMENT_UPDATED",
      `Threat assigned to ${assignedName}.`
    )

    setMessage("Threat assignment updated.")
    fetchThreats()

    if (selectedThreat?.id === threat.id) {
      fetchCaseData(threat.id)
    }
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

    await createTimelineEvent(
      selectedThreat.id,
      "NOTE_ADDED",
      `Investigation note added by ${currentUser?.name || user.email}.`
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

    await createTimelineEvent(
      selectedThreat.id,
      "EVIDENCE_UPLOADED",
      `Evidence "${evidenceTitle}" uploaded by ${currentUser?.name || user.email}.`
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
      <section className="mb-8 rounded-3xl bg-slate-900/70 border border-white/10 p-5 md:p-7 shadow-card relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-72 h-72 bg-red-500/10 rounded-full blur-3xl"></div>

        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <p className="text-red-300 text-sm font-bold mb-2 flex items-center gap-2">
              <Target size={16} />
              Threat Operations
            </p>

            <h1 className="text-3xl md:text-5xl font-black tracking-tight">
              Threat Management Center
            </h1>

            <p className="text-slate-400 mt-3 max-w-3xl">
              Create, assign, investigate and resolve operational threats with
              evidence, timeline history, alerts and audit tracking.
            </p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-3xl p-4 min-w-[240px]">
            <p className="text-xs text-slate-500">ACCESS MODE</p>
            <p className="text-lg font-black text-emerald-300 mt-1">
              {canCreate ? "Operations Enabled" : "Read Only"}
            </p>
          </div>
        </div>
      </section>

      <div className="grid md:grid-cols-4 gap-5 mb-8">
        <Card icon={<AlertTriangle />} title="Total Threats" value={threats.length} color="text-red-300" />
        <Card icon={<Shield />} title="Open Cases" value={openCount} color="text-yellow-300" />
        <Card icon={<Activity />} title="Critical Priority" value={criticalCount} color="text-orange-300" />
        <Card icon={<UserCheck />} title="Assigned Cases" value={assignedCount} color="text-emerald-300" />
      </div>

      {message && (
        <div className="bg-slate-900/80 border border-white/10 text-slate-300 p-4 rounded-2xl mb-6 text-sm shadow-card">
          {message}
        </div>
      )}

      {canCreate && (
        <div className="bg-slate-900/80 border border-white/10 rounded-3xl p-5 md:p-6 mb-8 shadow-card">
          <h2 className="font-black text-xl mb-5 flex items-center gap-2">
            <Plus size={20} className="text-emerald-300" />
            Create New Threat
          </h2>

          <div className="grid md:grid-cols-2 gap-4">
            <FormInput value={title} onChange={setTitle} placeholder="Threat title" />
            <FormInput value={location} onChange={setLocation} placeholder="Location" />
            <FormInput value={latitude} onChange={setLatitude} placeholder="Latitude e.g. 6.5244" />
            <FormInput value={longitude} onChange={setLongitude} placeholder="Longitude e.g. 3.3792" />

            <Select value={priority} onChange={setPriority} options={["Low", "Medium", "High", "Critical"]} />
            <Select value={status} onChange={setStatus} options={["Open", "Investigating", "Resolved"]} />

            <select
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              className="p-4 rounded-2xl bg-slate-950/80 border border-white/10 text-white outline-none focus:border-emerald-400/60 md:col-span-2"
            >
              <option value="">Assign to agent</option>
              {profiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.full_name} — {profile.role}
                </option>
              ))}
            </select>
          </div>

          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Threat description"
            className="w-full mt-4 p-4 rounded-2xl bg-slate-950/80 border border-white/10 text-white outline-none focus:border-emerald-400/60 h-28"
          />

          <button
            onClick={handleCreateThreat}
            className="mt-4 bg-gradient-to-r from-emerald-400 to-cyan-400 text-slate-950 font-black px-6 py-3 rounded-2xl hover:opacity-90 transition shadow-glow"
          >
            Create Threat
          </button>
        </div>
      )}

      <div className="bg-slate-900/80 border border-white/10 rounded-3xl p-5 md:p-6 shadow-card overflow-x-auto">
        <h2 className="font-black text-xl mb-5">
          Threat Records
        </h2>

        <table className="w-full min-w-[950px]">
          <thead className="border-b border-white/10 text-slate-400">
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
                <tr key={threat.id} className="border-b border-white/5 hover:bg-white/[0.03]">
                  <td className="p-3">
                    <p className="font-bold">{threat.title}</p>
                    <p className="text-xs text-slate-500 mt-1 max-w-xs truncate">
                      {threat.description}
                    </p>
                  </td>

                  <td className="p-3 text-slate-300">
                    <div className="flex items-center gap-2">
                      <MapPin size={15} className="text-slate-500" />
                      {threat.location}
                    </div>
                  </td>

                  <td className="p-3">
                    <Badge label={threat.priority} type={threat.priority} />
                  </td>

                  <td className="p-3">
                    <select value={threat.status} onChange={(e) => handleStatusChange(threat, e.target.value)} className="bg-slate-950 border border-white/10 text-white p-2 rounded-xl outline-none">
                      <option>Open</option>
                      <option>Investigating</option>
                      <option>Resolved</option>
                    </select>
                  </td>

                  <td className="p-3">
                    <select value={threat.assigned_to || ""} onChange={(e) => handleAssignmentChange(threat, e.target.value)} className="bg-slate-950 border border-white/10 text-white p-2 rounded-xl outline-none">
                      <option value="">Unassigned</option>
                      {profiles.map((profile) => (
                        <option key={profile.id} value={profile.id}>
                          {profile.full_name}
                        </option>
                      ))}
                    </select>
                  </td>

                  <td className="p-3">
                    <button onClick={() => openCase(threat)} className="flex items-center gap-2 bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 px-4 py-2 rounded-xl text-sm hover:bg-emerald-500/20 transition">
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
        <CaseModal
          selectedThreat={selectedThreat}
          setSelectedThreat={setSelectedThreat}
          notes={notes}
          newNote={newNote}
          setNewNote={setNewNote}
          handleAddNote={handleAddNote}
          evidenceTitle={evidenceTitle}
          setEvidenceTitle={setEvidenceTitle}
          setSelectedEvidence={setSelectedEvidence}
          handleEvidenceUpload={handleEvidenceUpload}
          uploadingEvidence={uploadingEvidence}
          evidenceFiles={evidenceFiles}
          handleViewEvidence={handleViewEvidence}
          timeline={timeline}
        />
      )}
    </div>
  )
}

function CaseModal({
  selectedThreat,
  setSelectedThreat,
  notes,
  newNote,
  setNewNote,
  handleAddNote,
  evidenceTitle,
  setEvidenceTitle,
  setSelectedEvidence,
  handleEvidenceUpload,
  uploadingEvidence,
  evidenceFiles,
  handleViewEvidence,
  timeline,
}) {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 md:p-6">
      <div className="bg-slate-950 border border-white/10 rounded-[2rem] p-5 md:p-6 w-full max-w-6xl max-h-[90vh] overflow-y-auto shadow-card">
        <div className="flex items-start justify-between gap-5 mb-6">
          <div>
            <p className="text-emerald-300 text-xs font-black mb-2">
              CASE FILE
            </p>

            <h2 className="text-2xl md:text-3xl font-black">
              {selectedThreat.title}
            </h2>

            <p className="text-slate-400 text-sm mt-2">
              {selectedThreat.location} • {selectedThreat.priority} • {selectedThreat.status}
            </p>
          </div>

          <button
            onClick={() => setSelectedThreat(null)}
            className="text-slate-400 hover:text-white bg-white/5 border border-white/10 p-2 rounded-xl"
          >
            <X />
          </button>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <Panel title="Investigation Notes" icon={<FileText size={18} />}>
            <textarea value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="Write investigation note..." className="w-full p-4 rounded-2xl bg-slate-900 border border-white/10 text-white outline-none focus:border-emerald-400/60 h-28 mb-4" />

            <button onClick={handleAddNote} className="bg-gradient-to-r from-emerald-400 to-cyan-400 text-slate-950 font-black px-5 py-2.5 rounded-2xl hover:opacity-90 transition">
              Add Note
            </button>

            <div className="mt-5 space-y-3">
              {notes.length === 0 ? (
                <p className="text-slate-500 text-sm">No notes yet.</p>
              ) : (
                notes.map((note) => (
                  <div key={note.id} className="bg-slate-900/80 border border-white/10 rounded-2xl p-4">
                    <p className="text-slate-300 text-sm">{note.note}</p>
                    <p className="text-slate-500 text-xs mt-2">
                      {new Date(note.created_at).toLocaleString()}
                    </p>
                  </div>
                ))
              )}
            </div>
          </Panel>

          <Panel title="Evidence Files" icon={<Upload size={18} />}>
            <input value={evidenceTitle} onChange={(e) => setEvidenceTitle(e.target.value)} placeholder="Evidence title" className="w-full p-4 rounded-2xl bg-slate-900 border border-white/10 text-white outline-none focus:border-emerald-400/60 mb-4" />

            <input type="file" onChange={(e) => setSelectedEvidence(e.target.files[0])} className="w-full text-sm text-slate-300 mb-4" />

            <button onClick={handleEvidenceUpload} disabled={uploadingEvidence} className="bg-gradient-to-r from-emerald-400 to-cyan-400 text-slate-950 font-black px-5 py-2.5 rounded-2xl hover:opacity-90 transition disabled:opacity-60">
              {uploadingEvidence ? "Uploading..." : "Upload Evidence"}
            </button>

            <div className="mt-5 space-y-3">
              {evidenceFiles.length === 0 ? (
                <p className="text-slate-500 text-sm">No evidence uploaded yet.</p>
              ) : (
                evidenceFiles.map((file) => (
                  <div key={file.id} className="bg-slate-900/80 border border-white/10 rounded-2xl p-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-slate-300 text-sm font-bold">{file.title}</p>
                      <p className="text-slate-500 text-xs">
                        {new Date(file.created_at).toLocaleString()}
                      </p>
                    </div>

                    <button onClick={() => handleViewEvidence(file.file_path, file.title)} className="bg-blue-500/10 text-blue-300 border border-blue-500/20 px-3 py-2 rounded-xl text-sm">
                      View
                    </button>
                  </div>
                ))
              )}
            </div>
          </Panel>
        </div>

        <Panel title="Intelligence Timeline" icon={<Clock size={18} />} extraClass="mt-6">
          <div className="space-y-4">
            {timeline.length === 0 ? (
              <p className="text-slate-500 text-sm">
                No timeline events yet.
              </p>
            ) : (
              timeline.map((event) => (
                <div
                  key={event.id}
                  className="border-l-2 border-emerald-400 pl-4 py-2"
                >
                  <p className="text-emerald-300 font-black text-sm">
                    {event.event_type}
                  </p>

                  <p className="text-slate-300 text-sm mt-1">
                    {event.event_message}
                  </p>

                  <p className="text-slate-500 text-xs mt-2">
                    {new Date(event.created_at).toLocaleString()}
                  </p>
                </div>
              ))
            )}
          </div>
        </Panel>
      </div>
    </div>
  )
}

function FormInput({ value, onChange, placeholder }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
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

function Badge({ label, type }) {
  const styles = {
    Critical: "bg-red-500/10 text-red-300 border-red-500/20",
    High: "bg-orange-500/10 text-orange-300 border-orange-500/20",
    Medium: "bg-yellow-500/10 text-yellow-300 border-yellow-500/20",
    Low: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
  }

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-black border ${styles[type] || styles.Low}`}>
      {label}
    </span>
  )
}

function Panel({ title, icon, children, extraClass = "" }) {
  return (
    <div className={`bg-slate-900/80 border border-white/10 rounded-3xl p-5 shadow-card ${extraClass}`}>
      <h3 className="font-black mb-4 flex items-center gap-2">
        <span className="text-emerald-300">{icon}</span>
        {title}
      </h3>

      {children}
    </div>
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

export default Threats