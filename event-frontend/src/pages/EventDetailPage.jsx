import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api";

export default function EventDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [regLoading, setRegLoading] = useState(false);
  const [message, setMessage] = useState(null); // { type: "success" | "error", text: string }
  const token = localStorage.getItem("token");

  async function fetchEvent() {
    try {
      const res = await api.get(`/events/${id}`);
      setEvent(res.data);
    } catch {
      navigate("/events");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchEvent();
  }, [id]);

  async function handleRegister() {
    if (!token) {
      navigate("/login");
      return;
    }
    setRegLoading(true);
    setMessage(null);
    try {
      const res = await api.post(`/registrations/${id}`);
      setMessage({ type: "success", text: `Registered! Booking ID: ${res.data.booking_id}` });
      fetchEvent(); // refresh seats
    } catch (err) {
      setMessage({ type: "error", text: err.response?.data?.detail || "Registration failed" });
    } finally {
      setRegLoading(false);
    }
  }

  async function handleCancel() {
    setRegLoading(true);
    setMessage(null);
    try {
      await api.delete(`/registrations/${id}`);
      setMessage({ type: "success", text: "Registration cancelled." });
      fetchEvent();
    } catch (err) {
      setMessage({ type: "error", text: err.response?.data?.detail || "Cancellation failed" });
    } finally {
      setRegLoading(false);
    }
  }

  if (loading) return <div className="text-zinc-500 text-sm">Loading...</div>;
  if (!event) return null;

  const isFull = event.seats_remaining === 0 || event.status === "sold_out";
  const isCancelled = event.status === "cancelled";

  return (
    <div className="max-w-2xl">
      <button
        onClick={() => navigate("/events")}
        className="text-zinc-500 text-sm hover:text-zinc-300 mb-4 flex items-center gap-1"
      >
        ← Back to events
      </button>

      {event.poster_url && (
        <img src={event.poster_url} alt={event.title} className="w-full h-56 object-cover rounded-lg mb-6" />
      )}

      <div className="flex items-start justify-between gap-4 mb-4">
        <h1 className="text-2xl font-bold">{event.title}</h1>
        <span
          className={`text-xs px-2 py-1 rounded shrink-0 ${
            isCancelled
              ? "bg-zinc-800 text-zinc-400"
              : isFull
              ? "bg-red-900/50 text-red-400"
              : "bg-green-900/50 text-green-400"
          }`}
        >
          {isCancelled ? "Cancelled" : isFull ? "Sold Out" : "Open"}
        </span>
      </div>

      {event.description && <p className="text-zinc-400 mb-6">{event.description}</p>}

      <div className="grid grid-cols-2 gap-3 mb-6 text-sm">
        <div className="bg-zinc-900 border border-zinc-800 rounded p-3">
          <div className="text-zinc-500 text-xs mb-1">Date</div>
          <div>{new Date(event.date).toLocaleString()}</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded p-3">
          <div className="text-zinc-500 text-xs mb-1">Location</div>
          <div>{event.location}</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded p-3">
          <div className="text-zinc-500 text-xs mb-1">Seats Remaining</div>
          <div>
            <span className={isFull ? "text-red-400" : "text-green-400"}>
              {event.seats_remaining}
            </span>{" "}
            / {event.total_seats}
          </div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded p-3">
          <div className="text-zinc-500 text-xs mb-1">Cost</div>
          <div>{event.cost === 0 ? "Free" : `₹${event.cost}`}</div>
        </div>
        {event.contact_number && (
          <div className="bg-zinc-900 border border-zinc-800 rounded p-3">
            <div className="text-zinc-500 text-xs mb-1">Contact</div>
            <div>{event.contact_number}</div>
          </div>
        )}
        {event.category && (
          <div className="bg-zinc-900 border border-zinc-800 rounded p-3">
            <div className="text-zinc-500 text-xs mb-1">Category</div>
            <div>{event.category}</div>
          </div>
        )}
      </div>

      {message && (
        <div
          className={`text-sm px-3 py-2 rounded mb-4 ${
            message.type === "success"
              ? "bg-green-900/30 border border-green-800 text-green-400"
              : "bg-red-900/30 border border-red-800 text-red-400"
          }`}
        >
          {message.text}
        </div>
      )}

{!isCancelled && (() => {
  const userId = token ? JSON.parse(atob(token.split('.')[1])).sub : null;
  const isOrganizer = userId && parseInt(userId) === event.organizer_id;

  return isOrganizer ? (
    <div className="flex gap-3">
      <button
        onClick={() => navigate(`/events/${id}/edit`)}
        className="bg-amber-400 text-zinc-950 font-semibold px-6 py-2 rounded hover:bg-amber-300 transition-colors"
      >
        Edit Event
      </button>
      <button
        onClick={async () => {
          try {
            await api.delete(`/events/${id}?token=${token}`);
            navigate('/events');
          } catch (err) {
            setMessage({ type: "error", text: err.response?.data?.detail || "Failed to cancel event" });
          }
        }}
        className="border border-zinc-700 text-zinc-400 px-6 py-2 rounded hover:border-red-700 hover:text-red-400 transition-colors"
      >
        Cancel Event
      </button>
    </div>
  ) : (
    <div className="flex gap-3">
      <button
        onClick={handleRegister}
        disabled={isFull || regLoading}
        className="bg-amber-400 text-zinc-950 font-semibold px-6 py-2 rounded hover:bg-amber-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {regLoading ? "Processing..." : isFull ? "Sold Out" : "Register"}
      </button>
      <button
        onClick={handleCancel}
        disabled={regLoading}
        className="border border-zinc-700 text-zinc-400 px-6 py-2 rounded hover:border-red-700 hover:text-red-400 transition-colors disabled:opacity-40"
      >
        Cancel Registration
      </button>
    </div>
  );
})()}
    </div>
  );
}
