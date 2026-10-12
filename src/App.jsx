import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";
import AdminDashboard from "./components/AdminDashboard";
import AttendanceSheet from "./components/AttendanceSheet";

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null); // 'admin', 'in_charge', or 'student'
  
  // Auth Form State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    // Get current session active status
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchUserRole(session.user.id);
      else setLoading(false);
    });

    // Listen for auth changes (sign-in / sign-out)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchUserRole(session.user.id);
      else {
        setUserRole(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserRole = async (userId) => {
    try {
      // Pull role from metadata or your custom profiles/users table
      const { data, error } = await supabase
        .from("users")
        .select("role")
        .eq("id", userId)
        .single();

      if (error) throw error;
      setUserRole(data.role);
    } catch (err) {
      console.error("Error matching role mapping:", err);
      setMessage("Role identification failed. Contact Administrator.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setMessage("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setMessage(error.message);
  };

  const handleSignOut = () => {
    supabase.auth.signOut();
  };

  if (loading) {
    return <div className="p-6 bg-slate-900 text-white min-h-screen flex items-center justify-center">Compiling portal state...</div>;
  }

  // 1. Unauthenticated View (Login Split Panel)
  if (!session) {
    return (
      <div className="bg-slate-900 min-h-screen flex items-center justify-center p-4">
        <form onSubmit={handleLogin} className="bg-slate-800 p-6 rounded border border-slate-700 w-full max-w-md">
          <h2 className="text-xl font-bold text-white mb-2 text-center">Smart Examination Hub</h2>
          <p className="text-slate-400 text-xs text-center mb-4">Pixel to Product 2026 Evaluation Sandbox</p>
          
          {message && <div className="bg-rose-950 border border-rose-800 text-rose-400 p-2 rounded text-xs mb-4">{message}</div>}
          
          <div className="mb-3">
            <label className="block text-slate-300 text-xs font-medium mb-1">Institutional Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500" />
          </div>

          <div className="mb-4">
            <label className="block text-slate-300 text-xs font-medium mb-1">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500" />
          </div>

          <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 rounded text-sm transition-colors">Sign In Portal</button>
        </form>
      </div>
    );
  }

  // 2. Authenticated Protected Dashboard Routing Switch Block
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      {/* Top Session Management Banner */}
      <header className="bg-slate-800 border-b border-slate-700 p-4 flex justify-between items-center">
        <div>
          <h1 className="text-white font-bold text-sm">Smart Exam Management</h1>
          <p className="text-slate-400 text-xs">Logged in as: <span className="text-sky-400 uppercase font-mono">{userRole}</span> ({session.user.email})</p>
        </div>
        <button onClick={handleSignOut} className="bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs px-3 py-1.5 rounded transition-colors">Sign Out</button>
      </header>

      {/* Main View Delivery Grid Mapping */}
      <main className="flex-1">
        {userRole === "admin" && <AdminDashboard />}
        {userRole === "in_charge" && <AttendanceSheet examId={1} roomId={1} />}
        {userRole === "student" && (
          <div className="p-6 text-white text-center">
            <h3 className="text-lg font-semibold">Student Allocation Schedule</h3>
            <p className="text-slate-400 text-sm mt-1">Unpublished rosters are hidden. Check back later.</p>
          </div>
        )}
        {!userRole && (
          <div className="p-6 text-rose-400 text-center text-sm">Roster mapping invalid or pending backend approval hooks.</div>
        )}
      </main>
    </div>
  );
}