import { Link } from "react-router-dom";

export default function EventCard({ event }) {
  const isFull = event.seats_remaining === 0 || event.status === "sold_out";
  const isClosingSoon = !isFull && event.seats_remaining <= Math.ceil(event.total_seats * 0.1);

  return (
    <Link to={`/events/${event.id}`}>
      <div className="border border-zinc-800 rounded-lg p-4 hover:border-zinc-600 transition-colors bg-zinc-900 group">
        {event.poster_url && (
          <img
            src={event.poster_url}
            alt={event.title}
            className="w-full h-36 object-cover rounded mb-3"
          />
        )}
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-semibold text-zinc-100 group-hover:text-amber-400 transition-colors">
            {event.title}
          </h3>
          {isFull ? (
            <span className="text-xs bg-red-900/50 text-red-400 px-2 py-0.5 rounded shrink-0">Sold Out</span>
          ) : isClosingSoon ? (
            <span className="text-xs bg-amber-900/50 text-amber-400 px-2 py-0.5 rounded shrink-0">Almost Full</span>
          ) : (
            <span className="text-xs bg-green-900/50 text-green-400 px-2 py-0.5 rounded shrink-0">Open</span>
          )}
        </div>
        {event.description && (
          <p className="text-zinc-500 text-sm mb-3 line-clamp-2">{event.description}</p>
        )}
        <div className="flex items-center justify-between text-xs text-zinc-500">
          <span>📍 {event.location}</span>
          <span>{event.cost === 0 ? "Free" : `₹${event.cost}`}</span>
        </div>
        <div className="flex items-center justify-between text-xs text-zinc-500 mt-1">
          <span>🗓 {new Date(event.date).toLocaleDateString()}</span>
          <span className={isFull ? "text-red-400" : isClosingSoon ? "text-amber-400" : "text-zinc-500"}>
            {event.seats_remaining} / {event.total_seats} seats left
          </span>
          </div>
          <div className="mt-2 h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
            <div
            className={`h-full rounded-full transition-all ${
              isFull ? "bg-red-500" : isClosingSoon ? "bg-amber-400" : "bg-green-500"
            }`}
            style={{ width: `${((event.total_seats - event.seats_remaining) / event.total_seats) * 100}%` }}
            />
          </div>
        {event.category && (
          <span className="mt-2 inline-block text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded">
            {event.category}
          </span>
        )}
      </div>
    </Link>
  );
}
