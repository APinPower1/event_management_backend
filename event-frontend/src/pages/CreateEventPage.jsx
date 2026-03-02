import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import axios from "axios";

const CATEGORIES = ["Tech", "Music", "Sports", "Art", "Food", "Business", "Other"];

export default function CreateEventPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: "",
    description: "",
    date: "",
    time: "",
    location: "",
    total_seats: "",
    cost: 0,
    contact_number: "",
    poster_url: "",
    category: "",
    upi_id: "",
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [extraBlocks, setExtraBlocks] = useState([]);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function handleImageChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  async function uploadImage() {
    if (!imageFile) return null;
    setUploading(true);
    try {
      const data = new FormData();
      data.append("file", imageFile);
      const res = await axios.post("http://127.0.0.1:8000/upload", data);
      return res.data.url;
    } catch {
      setError("Image upload failed");
      return null;
    } finally {
      setUploading(false);
    }
  }

  function openMapsSearch() {
    if (!form.location) return;
    window.open(`https://www.google.com/maps/search/${encodeURIComponent(form.location)}`, "_blank");
  }

  function addBlock(type) {
    setExtraBlocks((prev) => [
      ...prev,
      { id: Date.now(), type, label: "", content: "", file: null, preview: null },
    ]);
  }

  function updateBlock(id, field, value) {
    setExtraBlocks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, [field]: value } : b))
    );
  }

  function removeBlock(id) {
    setExtraBlocks((prev) => prev.filter((b) => b.id !== id));
  }

  function handleBlockImage(id, e) {
    const file = e.target.files[0];
    if (!file) return;
    const preview = URL.createObjectURL(file);
    setExtraBlocks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, file, preview } : b))
    );
  }

  async function uploadBlockImage(block) {
    if (!block.file) return null;
    const data = new FormData();
    data.append("file", block.file);
    const res = await axios.post("http://127.0.0.1:8000/upload", data);
    return res.data.url;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!form.date || !form.time) {
      setError("Please select both date and time");
      return;
    }

    setLoading(true);
    try {
      let poster_url = form.poster_url;
      if (imageFile) {
        const uploadedUrl = await uploadImage();
        if (!uploadedUrl) { setLoading(false); return; }
        poster_url = uploadedUrl;
      }

      let fullDescription = form.description;
      for (const block of extraBlocks) {
        if (block.type === "text" && block.content.trim()) {
          const header = block.label ? `\n\n**${block.label}**\n` : "\n\n";
          fullDescription += header + block.content.trim();
        }
        if (block.type === "image" && block.file) {
          try {
            const url = await uploadBlockImage(block);
            if (url) {
              fullDescription += `\n\n![${block.label || "image"}](${url})`;
            }
          } catch {
            // skip failed blocks
          }
        }
      }

      const payload = {
        title: form.title,
        description: fullDescription,
        date: new Date(`${form.date}T${form.time}`).toISOString(),
        location: form.location,
        total_seats: parseInt(form.total_seats),
        cost: parseInt(form.cost) || 0,
        contact_number: form.contact_number,
        poster_url,
        category: form.category,
        upi_id: form.upi_id || null,
      };

      const res = await api.post("/events/", payload);
      navigate(`/events/${res.data.id}`);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to create event");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold mb-1">Create Event</h1>
      <p className="text-zinc-500 text-sm mb-6">Fill in the details for your event</p>

      {error && (
        <div className="bg-red-900/30 border border-red-800 text-red-400 text-sm px-3 py-2 rounded mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Title *">
          <input required value={form.title} onChange={(e) => set("title", e.target.value)} className={inputClass} />
        </Field>

        <Field label="Description">
          <textarea rows={3} value={form.description} onChange={(e) => set("description", e.target.value)} className={inputClass} />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Date *">
            <input type="date" required value={form.date} onChange={(e) => set("date", e.target.value)} className={inputClass} />
          </Field>
          <Field label="Time *">
            <input type="time" required value={form.time} onChange={(e) => set("time", e.target.value)} className={inputClass} />
          </Field>
        </div>

        <Field label="Location *">
          <div className="flex gap-2">
            <input required value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="e.g. Model Engineering College, Kochi" className={inputClass + " flex-1"} />
            <button type="button" onClick={openMapsSearch} className="shrink-0 bg-zinc-800 border border-zinc-700 px-3 rounded hover:border-zinc-500 transition-colors text-sm">🗺️</button>
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Total Seats *">
            <input type="number" min={1} required value={form.total_seats} onChange={(e) => set("total_seats", e.target.value)} className={inputClass} />
          </Field>
          <Field label="Cost (₹)">
            <input type="number" min={0} value={form.cost} onChange={(e) => set("cost", e.target.value)} className={inputClass} />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Category">
            <select value={form.category} onChange={(e) => set("category", e.target.value)} className={inputClass}>
              <option value="">Select a category</option>
              {CATEGORIES.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </Field>
          <Field label="Contact Number">
            <input value={form.contact_number} onChange={(e) => set("contact_number", e.target.value)} className={inputClass} />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="UPI ID (for paid events)">
            <input
              value={form.upi_id || ""}
              onChange={(e) => set("upi_id", e.target.value)}
              placeholder="e.g. yourname@upi"
              className={inputClass}
            />
          </Field>
        </div>

        <Field label="Event Poster">
          <div className="space-y-2">
            <label className="flex items-center justify-center w-full border-2 border-dashed border-zinc-700 rounded-lg p-4 cursor-pointer hover:border-amber-400 transition-colors">
              <div className="text-center">
                {imagePreview ? (
                  <img src={imagePreview} alt="preview" className="h-32 object-contain mx-auto rounded" />
                ) : (
                  <>
                    <div className="text-2xl mb-1">📷</div>
                    <div className="text-sm text-zinc-400">Click to upload image</div>
                    <div className="text-xs text-zinc-600">PNG, JPG, WEBP</div>
                  </>
                )}
              </div>
              <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
            </label>
            {imagePreview && (
              <button type="button" onClick={() => { setImageFile(null); setImagePreview(null); }} className="text-xs text-red-400 hover:underline">
                Remove image
              </button>
            )}
          </div>
        </Field>

        {/* Extra blocks */}
        {extraBlocks.length > 0 && (
          <div className="space-y-3">
            <div className="text-sm text-zinc-400 font-medium border-t border-zinc-800 pt-4">Additional Details</div>
            {extraBlocks.map((block) => (
              <div key={block.id} className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-500 uppercase tracking-wide">
                    {block.type === "text" ? "📝 Text Block" : "🖼️ Image Block"}
                  </span>
                  <button type="button" onClick={() => removeBlock(block.id)} className="text-xs text-red-400 hover:underline">Remove</button>
                </div>
                <input
                  type="text"
                  placeholder="Section heading (optional)"
                  value={block.label}
                  onChange={(e) => updateBlock(block.id, "label", e.target.value)}
                  className={inputClass}
                />
                {block.type === "text" ? (
                  <textarea
                    rows={3}
                    placeholder="Enter your text here..."
                    value={block.content}
                    onChange={(e) => updateBlock(block.id, "content", e.target.value)}
                    className={inputClass}
                  />
                ) : (
                  <label className="flex items-center justify-center w-full border-2 border-dashed border-zinc-700 rounded-lg p-3 cursor-pointer hover:border-amber-400 transition-colors">
                    <div className="text-center">
                      {block.preview ? (
                        <img src={block.preview} alt="preview" className="h-24 object-contain mx-auto rounded" />
                      ) : (
                        <>
                          <div className="text-xl mb-1">📷</div>
                          <div className="text-xs text-zinc-400">Click to upload</div>
                        </>
                      )}
                    </div>
                    <input type="file" accept="image/*" onChange={(e) => handleBlockImage(block.id, e)} className="hidden" />
                  </label>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <button type="button" onClick={() => addBlock("text")} className="text-xs border border-dashed border-zinc-700 text-zinc-400 px-3 py-1.5 rounded hover:border-amber-400 hover:text-amber-400 transition-colors">
            + Add Text Block
          </button>
          <button type="button" onClick={() => addBlock("image")} className="text-xs border border-dashed border-zinc-700 text-zinc-400 px-3 py-1.5 rounded hover:border-amber-400 hover:text-amber-400 transition-colors">
            + Add Image
          </button>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={loading || uploading} className="bg-amber-400 text-zinc-950 font-semibold px-6 py-2 rounded hover:bg-amber-300 transition-colors disabled:opacity-50">
            {uploading ? "Uploading..." : loading ? "Creating..." : "Create Event"}
          </button>
          <button type="button" onClick={() => navigate("/events")} className="border border-zinc-700 text-zinc-400 px-6 py-2 rounded hover:border-zinc-500 transition-colors">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

const inputClass = "w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-amber-400";

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-sm text-zinc-400 mb-1">{label}</label>
      {children}
    </div>
  );
}