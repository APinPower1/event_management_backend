import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import axios from "axios";

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
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!form.date || !form.time) {
      setError("Please select both date and time");
      return;
    }

    setLoading(true);
    try {
      // Upload image first if selected
      let poster_url = form.poster_url;
      if (imageFile) {
        const uploadedUrl = await uploadImage();
        if (!uploadedUrl) { setLoading(false); return; }
        poster_url = uploadedUrl;
      }

      const payload = {
        title: form.title,
        description: form.description,
        date: new Date(`${form.date}T${form.time}`).toISOString(),
        location: form.location,
        total_seats: parseInt(form.total_seats),
        cost: parseInt(form.cost) || 0,
        contact_number: form.contact_number,
        poster_url,
        category: form.category,
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

        {/* Title */}
        <Field label="Title *">
          <input
            required
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            className={inputClass}
          />
        </Field>

        {/* Description */}
        <Field label="Description">
          <textarea
            rows={3}
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            className={inputClass}
          />
        </Field>

        {/* Date + Time */}
        <div className="grid grid-cols-2 gap-4">
          <Field label="Date *">
            <input
              type="date"
              required
              value={form.date}
              onChange={(e) => set("date", e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Time *">
            <input
              type="time"
              required
              value={form.time}
              onChange={(e) => set("time", e.target.value)}
              className={inputClass}
            />
          </Field>
        </div>

        {/* Location + Maps */}
        <Field label="Location *">
          <div className="flex gap-2">
            <input
              required
              value={form.location}
              onChange={(e) => set("location", e.target.value)}
              placeholder="e.g. Model Engineering College, Kochi"
              className={inputClass + " flex-1"}
            />
            <button
              type="button"
              onClick={openMapsSearch}
              title="View on Google Maps"
              className="shrink-0 bg-zinc-800 border border-zinc-700 px-3 rounded hover:border-zinc-500 transition-colors text-sm"
            >
              🗺️
            </button>
          </div>
          {form.location && (
            <button
              type="button"
              onClick={openMapsSearch}
              className="text-xs text-amber-400 hover:underline mt-1"
            >
              View "{form.location}" on Google Maps →
            </button>
          )}
        </Field>

        {/* Seats + Cost */}
        <div className="grid grid-cols-2 gap-4">
          <Field label="Total Seats *">
            <input
              type="number"
              min={1}
              required
              value={form.total_seats}
              onChange={(e) => set("total_seats", e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Cost (₹)">
            <input
              type="number"
              min={0}
              value={form.cost}
              onChange={(e) => set("cost", e.target.value)}
              className={inputClass}
            />
          </Field>
        </div>

        {/* Category + Contact */}
        <div className="grid grid-cols-2 gap-4">
          <Field label="Category">
            <input
              value={form.category}
              onChange={(e) => set("category", e.target.value)}
              placeholder="e.g. Tech, Music"
              className={inputClass}
            />
          </Field>
          <Field label="Contact Number">
            <input
              value={form.contact_number}
              onChange={(e) => set("contact_number", e.target.value)}
              className={inputClass}
            />
          </Field>
        </div>

        {/* Poster Upload */}
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
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
            </label>
            {imagePreview && (
              <button
                type="button"
                onClick={() => { setImageFile(null); setImagePreview(null); }}
                className="text-xs text-red-400 hover:underline"
              >
                Remove image
              </button>
            )}
          </div>
        </Field>

        {/* Buttons */}
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading || uploading}
            className="bg-amber-400 text-zinc-950 font-semibold px-6 py-2 rounded hover:bg-amber-300 transition-colors disabled:opacity-50"
          >
            {uploading ? "Uploading image..." : loading ? "Creating..." : "Create Event"}
          </button>
          <button
            type="button"
            onClick={() => navigate("/events")}
            className="border border-zinc-700 text-zinc-400 px-6 py-2 rounded hover:border-zinc-500 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

const inputClass =
  "w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-amber-400";

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-sm text-zinc-400 mb-1">{label}</label>
      {children}
    </div>
  );
}
