import { useState, useEffect } from "react";
import api from "../api";
import EventCard from "../components/EventCard";

export default function EventsPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [availableOnly, setAvailableOnly] = useState(false);
  const [dateSort, setDateSort] = useState(""); // "asc" | "desc" | ""

  async function fetchEvents() {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (category) params.category = category;
      if (availableOnly) params.available = true;
      const res = await api.get("/events/", { params });
      setEvents(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchEvents();
  }, [availableOnly, category]);

  function handleSearch(e) {
    e.preventDefault();
    fetchEvents();
  }

  // Sort events on the frontend based on dateSort
  const sortedEvents = [...events].sort((a, b) => {
    if (!dateSort) return 0;
    const diff = new Date(a.date) - new Date(b.date);
    return dateSort === "asc" ? diff : -diff;
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Events</h1>
      </div>

      {/* Filters */}
      <form onSubmit={handleSearch} className="flex flex-wrap gap-2 mb-6">
        {/* Search */}
        <input
          type="text"
          placeholder="Search events..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-zinc-900 border border-zinc-700 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-amber-400 flex-1 min-w-40"
        />

        {/* Category dropdown */}
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="bg-zinc-900 border border-zinc-700 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-amber-400 text-zinc-300"
        >
          <option value="">All Categories</option>
          <option>Tech</option>
          <option>Music</option>
          <option>Sports</option>
          <option>Art</option>
          <option>Food</option>
          <option>Business</option>
          <option>Other</option>
        </select>

        {/* Date sort */}
        <select
          value={dateSort}
          onChange={(e) => setDateSort(e.target.value)}
          className="bg-zinc-900 border border-zinc-700 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-amber-400 text-zinc-300"
        >
          <option value="">Sort by Date</option>
          <option value="asc">Date: Nearest First</option>
          <option value="desc">Date: Furthest First</option>
        </select>

        <button
          type="submit"
          className="bg-amber-400 text-zinc-950 px-4 py-1.5 rounded text-sm font-medium hover:bg-amber-300 transition-colors"
        >
          Search
        </button>

        {/* Available only toggle */}
        <label className="flex items-center gap-2 text-sm text-zinc-400 cursor-pointer">
          <input
            type="checkbox"
            checked={availableOnly}
            onChange={(e) => setAvailableOnly(e.target.checked)}
            className="accent-amber-400"
          />
          Available only
        </label>
      </form>

      {loading ? (
        <div className="text-zinc-500 text-sm">Loading events...</div>
      ) : sortedEvents.length === 0 ? (
        <div className="text-zinc-500 text-sm">No events found.</div>
      ) : (
        <>
          <div className="text-zinc-500 text-xs mb-3">{sortedEvents.length} event{sortedEvents.length !== 1 ? "s" : ""} found</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
