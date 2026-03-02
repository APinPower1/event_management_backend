import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api";

export default function EditEventPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({
    title: "", description: "", date: "", time: "",
    location: "", total_seats: "", cost: "",
    contact_number: "", poster_url: "", category: "",
  });

  useEffect(() => {
    if (!token) { navigate("/login"); return; }
    api.get(`/events/${id}`).then(res => {
      const e = res.data;
      const raw = e.date.slice(0, 16); // "2026-02-28T02:30"

      setForm({
        title: e.title || "",
        description: e.description || "",
        date: raw.split("T")[0],
        time: raw.split("T")[1],
        location: e.location || "",
        total_seats: e.total_seats || "",
        cost: e.cost || 0,
        contact_number: e.contact_number || "",
        poster_url: e.poster_url || "",
        category: e.category || "",
      });
    }).catch(() => navigate("/events"))
      .finally(() => setLoading(false));
  }, [id]);

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const datetime = new Date(`${form.date}T${form.time}`).toISOString();
      await api.put(`/events/${id}?token=${token}`, {
        title: form.title,
        description: form.description,
        date: datetime,
        location: form.location,
        total_seats: parseInt(form.total_seats),
        cost: parseInt(form.cost) || 0,
        contact_number: form.contact_number,
        poster_url: form.poster_url,
        category: form.category,
      });
      navigate(`/events/${id}`);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to update event");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="text-zinc-500 text-sm">Loading...</div>;

  const inputClass = "w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400";
  const labelClass = "block text-zinc-400 text-xs mb-1";

  return (
    <div className="max-w-xl">
      <button
        onClick={() => navigate(`/events/${id}`)}
        className="text-zinc-500 text-sm hover:text-zinc-300 mb-6 flex items-center gap-1"
      >
        ← Back to event
      </button>

      <h1 className="text-2xl font-bold mb-6">Edit Event</h1>

      {error && (
        <div className="bg-red-900/30 border border-red-800 text-red-400 text-sm px-3 py-2 rounded mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className={labelClass}>Title *</label>
          <input name="title" value={form.title} onChange={handleChange} required className={inputClass} />
        </div>

        <div>
          <label className={labelClass}>Description</label>
          <textarea name="description" value={form.description} onChange={handleChange} rows={3} className={inputClass} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Date *</label>
            <input type="date" name="date" value={form.date} onChange={handleChange} required className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Time *</label>
            <input type="time" name="time" value={form.time} onChange={handleChange} required className={inputClass} />
          </div>
        </div>

        <div>
          <label className={labelClass}>Location *</label>
          <div className="flex gap-2">
            <input name="location" value={form.location} onChange={handleChange} required className={inputClass} />
            {form.location && (
              <a
                href={`https://www.google.com/maps/search/${encodeURIComponent(form.location)}`}
                target="_blank"
                rel="noreferrer"
                className="shrink-0 border border-zinc-700 text-zinc-400 px-3 py-2 rounded text-sm hover:border-amber-400 hover:text-amber-400 transition-colors"
              >
                🗺️
              </a>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Total Seats *</label>
            <input type="number" name="total_seats" value={form.total_seats} onChange={handleChange} required min={1} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Cost (₹)</label>
            <input type="number" name="cost" value={form.cost} onChange={handleChange} min={0} className={inputClass} />
          </div>
        </div>

        <div>
          <label className={labelClass}>Contact Number</label>
          <input name="contact_number" value={form.contact_number} onChange={handleChange} className={inputClass} />
        </div>

        <div>
          <label className={labelClass}>Category</label>
          <select name="category" value={form.category} onChange={handleChange} className={inputClass}>
            <option value="">Select category</option>
            <option>Tech</option>
            <option>Music</option>
            <option>Sports</option>
            <option>Art</option>
            <option>Food</option>
            <option>Business</option>
            <option>Other</option>
          </select>
        </div>

        <div>
          <label className={labelClass}>Poster URL</label>
          <input name="poster_url" value={form.poster_url} onChange={handleChange} className={inputClass} placeholder="Leave blank to keep existing" />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="bg-amber-400 text-zinc-950 font-semibold px-6 py-2 rounded hover:bg-amber-300 transition-colors disabled:opacity-40 mt-2"
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </form>
    </div>
  );
}
