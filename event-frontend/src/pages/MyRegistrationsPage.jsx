import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";

export default function MyRegistrationsPage() {
    const [registrations, setRegistrations] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const token = localStorage.getItem("token");

    useEffect(() => {
        if (!token) { navigate("/login"); return; }
        const cleanToken = token.replace(/^"|"$/g, "");
        api.get(`/registrations/my?token=${cleanToken}`)
            .then(res => setRegistrations(res.data))
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, []);

    return (
        <div className="max-w-3xl mx-auto">
            <h1 className="text-2xl font-bold mb-6">My Registrations</h1>

            {loading ? (
                <p className="text-zinc-500 text-sm">Loading...</p>
            ) : registrations.length === 0 ? (
                <p className="text-zinc-500 text-sm">You haven't registered for any events yet.</p>
            ) : (

                <div className="flex flex-col gap-4">
                    {registrations.map((r) => (
                        <div
                            key={r.booking_id}
                            onClick={() => navigate(`/events/${r.event_id}`)}
                            className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 cursor-pointer hover:border-amber-400 transition-colors"
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <h2 className="font-semibold text-zinc-100">{r.event_title}</h2>
                                    <p className="text-zinc-500 text-sm mt-1">{r.event_location}</p>
                                    <p className="text-zinc-500 text-sm">
                                        {new Date(r.event_date).toLocaleDateString("en-GB", {
                                            day: "numeric", month: "short", year: "numeric",
                                            hour: "2-digit", minute: "2-digit"
                                        })}
                                    </p>
                                </div>
                                <div className="text-right shrink-0">
                                    <span className={`text-xs px-2 py-1 rounded font-medium ${r.event_status === "active" ? "bg-green-900/40 text-green-400" :
                                            r.event_status === "sold_out" ? "bg-amber-900/40 text-amber-400" :
                                                "bg-red-900/40 text-red-400"
                                        }`}>
                                        {r.event_status.replace("_", " ").toUpperCase()}
                                    </span>
                                    <div className="mt-2">
                                        <span className={`text-xs px-2 py-0.5 rounded font-medium mt-1 inline-block ${r.payment_status === "confirmed"
                                                ? "bg-green-900/40 text-green-400"
                                                : r.payment_status === "pending_payment"
                                                    ? "bg-amber-900/40 text-amber-400"
                                                    : "bg-red-900/40 text-red-400"
                                            }`}>
                                            {r.payment_status === "confirmed" ? "✓ Confirmed"
                                                : r.payment_status === "pending_payment" ? "⏳ Payment Pending"
                                                    : "✗ Rejected"}
                                        </span>
                                        <p className="text-zinc-500 text-xs">Booking ID</p>
                                        <p className="text-amber-400 font-mono font-semibold text-sm">#{r.booking_id}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}