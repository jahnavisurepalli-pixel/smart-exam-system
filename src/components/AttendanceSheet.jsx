import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function AttendanceSheet({ examId = 1, roomId = 1 }) {
  const [allocations, setAllocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, present: 0, absent: 0, unmarked: 0 });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchAttendanceData();
  }, [examId, roomId]);

  const fetchAttendanceData = async () => {
    try {
      setLoading(true);
      // Fetches room allocations joined with student profiles and evaluation status
      const { data, error } = await supabase
        .from('allocations')
        .select(`
          id,
          seat_number,
          students (id, roll_number, name, department, section),
          attendance (status)
        `)
        .eq('exam_id', examId)
        .eq('room_id', roomId);

      if (error) throw error;

      const formattedData = data.map(row => ({
        id: row.id,
        seatNumber: row.seat_number,
        student: row.students,
        status: row.attendance?.[0]?.status || 'unmarked'
      }));

      setAllocations(formattedData);
      calculateStats(formattedData);
    } catch (err) {
      console.error("Error loading attendance records:", err);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data) => {
    const counts = { total: data.length, present: 0, absent: 0, unmarked: 0 };
    data.forEach(row => {
      counts[row.status]++;
    });
    setStats(counts);
  };

  const handleStatusChange = (allocationId, newStatus) => {
    const updated = allocations.map(item => 
      item.id === allocationId ? { ...item, status: newStatus } : item
    );
    setAllocations(updated);
    calculateStats(updated);
  };

  const handleSubmitAttendance = async () => {
    // Hackathon rule validation: Block submission if any students are still unmarked
    if (stats.unmarked > 0) {
      alert(`Validation Error: You cannot submit attendance until all ${stats.unmarked} unmarked records are accounted for.`);
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Save data back to persistent multi-user tables
      const updates = allocations.map(item => ({
        allocation_id: item.id,
        status: item.status,
        submitted_at: new Date().toISOString()
      }));

      const { error } = await supabase
        .from('attendance')
        .upsert(updates, { onConflict: 'allocation_id' });

      if (error) throw error;
      alert("✅ Attendance compiled and submitted successfully! Reports updated.");
    } catch (err) {
      alert("Database error: Failed to lock in submission data.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="p-6 text-white text-center">Loading evaluation roster records...</div>;

  return (
    <div className="p-6 bg-slate-900 min-h-screen text-slate-100">
      {/* Dynamic Summary Cards Widget */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-slate-800 p-4 rounded border border-slate-700 text-center">
          <div className="text-sm text-slate-400">Total Allocations</div>
          <div className="text-2xl font-bold">{stats.total}</div>
        </div>
        <div className="bg-emerald-950 p-4 rounded border border-emerald-700 text-center text-emerald-400">
          <div className="text-sm">Present</div>
          <div className="text-2xl font-bold">{stats.present}</div>
        </div>
        <div className="bg-rose-950 p-4 rounded border border-rose-700 text-center text-rose-400">
          <div className="text-sm">Absent</div>
          <div className="text-2xl font-bold">{stats.absent}</div>
        </div>
        <div className="bg-amber-950 p-4 rounded border border-amber-700 text-center text-amber-400">
          <div className="text-sm">Unmarked Action Required</div>
          <div className="text-2xl font-bold">{stats.unmarked}</div>
        </div>
      </div>

      {/* Interactive Sheet Grid Layout */}
      <div className="bg-slate-800 rounded border border-slate-700 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-700 text-slate-300 text-sm">
              <th className="p-3">Seat</th>
              <th className="p-3">Roll Number</th>
              <th className="p-3">Student Name</th>
              <th className="p-3">Dept & Sec</th>
              <th className="p-3 text-center">Attendance Action Toggles</th>
            </tr>
          </thead>
          <tbody>
            {allocations.map(row => (
              <tr key={row.id} className="border-b border-slate-700 hover:bg-slate-750">
                <td className="p-3 font-semibold text-sky-400">{row.seatNumber}</td>
                <td className="p-3 font-mono">{row.student?.roll_number}</td>
                <td className="p-3">{row.student?.name}</td>
                <td className="p-3">{row.student?.department} - {row.student?.section}</td>
                <td className="p-3 flex justify-center gap-2">
                  <button
                    onClick={() => handleStatusChange(row.id, 'present')}
                    className={`px-3 py-1 rounded text-xs transition-colors ${
                      row.status === 'present' ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                    }`}
                  >
                    Present
                  </button>
                  <button
                    onClick={() => handleStatusChange(row.id, 'absent')}
                    className={`px-3 py-1 rounded text-xs transition-colors ${
                      row.status === 'absent' ? 'bg-rose-600 text-white' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                    }`}
                  >
                    Absent
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Persistent Submit Controls */}
      <div className="mt-4 flex justify-end">
        <button
          onClick={handleSubmitAttendance}
          disabled={isSubmitting}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-800 text-white px-6 py-2 rounded font-medium transition-colors"
        >
          {isSubmitting ? 'Submitting Data Changes...' : 'Finalize Room Attendance & Generate Absentee Sheets'}
        </button>
      </div>
    </div>
  );
}
