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
  const [registrants, setRegistrants] = useState(null);
  const [regListLoading, setRegListLoading] = useState(false);
  const [waitlist, setWaitlist] = useState({ on_waitlist: false, position: null });
  const [waitlistLoading, setWaitlistLoading] = useState(false);
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
    if (token) fetchWaitlistStatus();
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

async function fetchWaitlistStatus() {
    try {
      const cleanToken = token.replace(/^"|"$/g, "");
      const res = await api.get(`/registrations/${id}/waitlist/status?token=${cleanToken}`);
      setWaitlist(res.data);
    } catch {
      // not on waitlist
    }
  }

  async function handleJoinWaitlist() {
    setWaitlistLoading(true);
    setMessage(null);
    try {
      const cleanToken = token.replace(/^"|"$/g, "");
      const res = await api.post(`/registrations/${id}/waitlist?token=${cleanToken}`);
      setMessage({ type: "success", text: `Added to waitlist! You are #${res.data.position} in line.` });
      setWaitlist({ on_waitlist: true, position: res.data.position });
    } catch (err) {
      setMessage({ type: "error", text: err.response?.data?.detail || "Failed to join waitlist" });
    } finally {
      setWaitlistLoading(false);
    }
  }

  async function handleLeaveWaitlist() {
    setWaitlistLoading(true);
    setMessage(null);
    try {
      const cleanToken = token.replace(/^"|"$/g, "");
      await api.delete(`/registrations/${id}/waitlist?token=${cleanToken}`);
      setMessage({ type: "success", text: "Removed from waitlist." });
      setWaitlist({ on_waitlist: false, position: null });
    } catch (err) {
      setMessage({ type: "error", text: err.response?.data?.detail || "Failed to leave waitlist" });
    } finally {
      setWaitlistLoading(false);
    }
  }

async function fetchRegistrants() {
  if (registrants) { setRegistrants(null); return; } // toggle off
  setRegListLoading(true);
  try {
    const cleanToken = token.replace(/^"|"$/g, "");
    const res = await api.get(`/registrations/${id}?token=${cleanToken}`);
    setRegistrants(res.data);
  } catch (err) {
    setMessage({ type: "error", text: "Failed to load registrants" });
  } finally {
    setRegListLoading(false);
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
        <div>
          {event.location}
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 mt-2 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
            </svg>
            View on Google Maps
          </a>
        </div>
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
  const role = localStorage.getItem("role");
  const isOrganizer = role === "admin" ||
    (role === "organizer" && userId && parseInt(userId) === event.organizer_id);

  return isOrganizer ? (
  <div>
    <div className="flex gap-3 mb-4">
      <button
        onClick={() => navigate(`/events/${id}/edit`)}
        className="bg-amber-400 text-zinc-950 font-semibold px-6 py-2 rounded hover:bg-amber-300 transition-colors"
      >
        Edit Event
      </button>
      <button
        onClick={fetchRegistrants}
        disabled={regListLoading}
        className="border border-amber-400 text-amber-400 px-6 py-2 rounded hover:bg-amber-400 hover:text-zinc-950 transition-colors disabled:opacity-40"
      >
        {regListLoading ? "Loading..." : registrants ? "Hide Registrants" : "View Registrants"}
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

    {registrants && (
      <div className="mt-4 border border-zinc-800 rounded-lg overflow-hidden">
        <div className="bg-zinc-900 px-4 py-3 flex items-center justify-between">
          <span className="text-sm font-semibold">Registrants</span>
          <span className="text-xs text-zinc-500">
            {registrants.total_seats - registrants.seats_remaining} / {registrants.total_seats} seats filled
          </span>
        </div>
        {registrants.registrants.length === 0 ? (
          <div className="px-4 py-6 text-center text-zinc-500 text-sm">No registrations yet</div>
        ) : (
          <div className="divide-y divide-zinc-800">
            {registrants.registrants.map((r, i) => (
              <div key={r.booking_id} className="px-4 py-3 flex items-center justify-between text-sm">
                <div className="flex items-center gap-3">
                  <span className="text-zinc-600 text-xs w-5">{i + 1}</span>
                  <div>
                    <span className="text-zinc-300">{r.user_name}</span>
                    <span className="text-zinc-500 text-xs ml-2">{r.user_email}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-amber-400 font-mono text-xs">#{r.booking_id}</span>
                  <span className="text-zinc-600 text-xs">
                    {new Date(r.registered_at).toLocaleDateString("en-GB", {
                      day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"
                    })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )}
  </div>
) : (
    <div className="flex gap-3">
      {isFull ? (
        <button
        onClick={waitlist.on_waitlist ? handleLeaveWaitlist : handleJoinWaitlist}
        disabled={waitlistLoading}
        className={`font-semibold px-6 py-2 rounded transition-colors disabled:opacity-40 ${
          waitlist.on_waitlist
          ? "border border-red-700 text-red-400 hover:bg-red-900/30"
          : "bg-zinc-700 text-zinc-100 hover:bg-zinc-600"
        }`}
      >
        {waitlistLoading
          ? "Processing..."
          : waitlist.on_waitlist
          ? `Leave Waitlist (Position #${waitlist.position})`
          : "Join Waitlist"}
      </button>
    ) : (
      <button
        onClick={handleRegister}
        disabled={regLoading}
        className="bg-amber-400 text-zinc-950 font-semibold px-6 py-2 rounded hover:bg-amber-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {regLoading ? "Processing..." : "Register"}   
      </button>
    )}
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
