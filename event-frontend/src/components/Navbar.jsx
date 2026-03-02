import { Link, useNavigate } from "react-router-dom";

export default function Navbar() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  function logout() {
    localStorage.removeItem("token");
    navigate("/login");
  }

  return (
    <nav className="border-b border-zinc-800 bg-zinc-950 px-4 py-3">
      <div className="max-w-5xl mx-auto flex items-center justify-between">
        <Link to="/events" className="text-amber-400 font-bold text-lg tracking-tight">
          EventManager
        </Link>
        <div className="flex items-center gap-4 text-sm">
          <Link to="/events" className="text-zinc-400 hover:text-zinc-100 transition-colors">
            Browse
            
          </Link>
          <Link to="/my-registrations" className="text-zinc-400 hover:text-zinc-100 transition-colors">
            My Registrations
          </Link>
          {token ? (
            <>
              {["admin", "organizer"].includes(localStorage.getItem("role")) && (<Link to="/create" className="text-zinc-400 hover:text-zinc-100 transition-colors">
                Create Event
              </Link>

              )}
              {localStorage.getItem("role") === "admin" && (<Link to="/admin" className="text-zinc-400 hover:text-zinc-100 transition-colors">  
              Admin 
              </Link>
              )}
              <button
                onClick={logout}
                className="text-zinc-400 hover:text-red-400 transition-colors"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-zinc-400 hover:text-zinc-100 transition-colors">
                Login
              </Link>
              <Link
                to="/signup"
                className="bg-amber-400 text-zinc-950 px-3 py-1 rounded font-medium hover:bg-amber-300 transition-colors"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
