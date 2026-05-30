import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Download, X, ShieldAlert, Loader2, Trash2 } from 'lucide-react';
import DatePicker from '../ui/DatePicker';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const REASON_LABELS = {
  maintenance: 'Maintenance',
  cleaning: 'Deep Cleaning',
  out_of_order: 'Out of Order',
  other: 'Other'
};

const AvailabilityCalendar = ({ roomTypes, rooms, bookings = [], roomBlocks = [], onBlocksChange }) => {
  const [startDate, setStartDate] = useState(new Date());
  const daysToShow = 7;

  // Export modal state
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportStartDate, setExportStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [exportEndDate, setExportEndDate] = useState(new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]);

  // Block modal state
  const [blockModal, setBlockModal] = useState(null); // { type, date }
  const [blockForm, setBlockForm] = useState({
    roomId: '',
    startDate: '',
    endDate: '',
    reason: 'maintenance',
    notes: ''
  });
  const [isSavingBlock, setIsSavingBlock] = useState(false);
  const [deletingBlockId, setDeletingBlockId] = useState(null);

  // Generate date headers
  const getDates = () => {
    const dates = [];
    for (let i = 0; i < daysToShow; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      dates.push(d);
    }
    return dates;
  };
  const dates = getDates();

  const handlePrev = () => {
    const d = new Date(startDate);
    d.setDate(d.getDate() - 7);
    setStartDate(d);
  };
  const handleNext = () => {
    const d = new Date(startDate);
    d.setDate(d.getDate() + 7);
    setStartDate(d);
  };

  const getCellColor = (available, total) => {
    if (available === 0) return 'bg-red-500 text-white font-bold';
    if (available <= Math.ceil(total * 0.2)) return 'bg-orange-500 text-white font-bold';
    return 'bg-emerald-500 text-white font-bold';
  };

  const getStatsForDateAndType = (date, type) => {
    const typeRooms = rooms.filter(r => r.roomTypeId?._id === type._id || r.roomTypeId === type._id);
    const total = typeRooms.length;

    const current = new Date(date);
    current.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isToday = current.getTime() === today.getTime();

    // Set of blocked room IDs for this specific date
    const blockedRoomIds = new Set();

    // 1. If it's today, add rooms that are globally cleaning/maintenance
    if (isToday) {
      typeRooms.forEach(r => {
        if (r.status === 'maintenance' || r.status === 'cleaning') {
          blockedRoomIds.add(r._id.toString());
        }
      });
    }

    // 2. Add rooms that have active RoomBlocks on this date
    const activeBlocks = roomBlocks.filter(b => {
      const isThisType = b.roomTypeId?._id === type._id || b.roomTypeId === type._id;
      if (!isThisType) return false;
      const bStart = new Date(b.startDate); bStart.setHours(0,0,0,0);
      const bEnd = new Date(b.endDate); bEnd.setHours(0,0,0,0);
      return current >= bStart && current <= bEnd;
    });

    activeBlocks.forEach(b => {
      const rId = b.roomId?._id || b.roomId;
      if (rId) {
        blockedRoomIds.add(rId.toString());
      }
    });

    const blocked = Math.min(blockedRoomIds.size, total);

    let booked = 0;
    bookings.forEach(b => {
      if (b.status === 'cancelled' || b.status === 'checked-out') return;
      const isThisType = typeRooms.some(tr => tr._id === (b.roomId?._id || b.roomId));
      if (!isThisType) return;
      const checkIn = new Date(b.checkInDate); checkIn.setHours(0,0,0,0);
      const checkOut = new Date(b.checkOutDate); checkOut.setHours(0,0,0,0);
      if (current >= checkIn && current < checkOut) booked++;
    });

    const available = Math.max(0, total - blocked - booked);
    return { total, blocked, booked, available };
  };

  const dailyStats = dates.map(date => {
    let totalAvailable = 0;
    const totalInventory = rooms.length;
    roomTypes.forEach(type => {
      totalAvailable += getStatsForDateAndType(date, type).available;
    });
    const occupancyPercent = totalInventory === 0 ? 0 : Math.round(((totalInventory - totalAvailable) / totalInventory) * 100);
    return { available: totalAvailable, occupancy: occupancyPercent };
  });

  // Open block modal for a specific type + date
  const openBlockModal = (type, date) => {
    const dateStr = date.toISOString().split('T')[0];
    const typeRooms = rooms.filter(r => r.roomTypeId?._id === type._id || r.roomTypeId === type._id);
    setBlockModal({ type, date, typeRooms });
    setBlockForm({
      roomId: typeRooms[0]?._id || '',
      startDate: dateStr,
      endDate: dateStr,
      reason: 'maintenance',
      notes: ''
    });
  };

  const handleAddBlock = async () => {
    if (!blockForm.roomId) return toast.error('Please select a room');
    setIsSavingBlock(true);
    try {
      const res = await api.post('/admin/room-blocks', {
        roomId: blockForm.roomId,
        roomTypeId: blockModal.type._id,
        startDate: blockForm.startDate,
        endDate: blockForm.endDate,
        reason: blockForm.reason,
        notes: blockForm.notes
      });
      onBlocksChange(prev => [...prev, res.data]);
      toast.success('Room blocked successfully');
      setBlockForm({ roomId: '', startDate: '', endDate: '', reason: 'maintenance', notes: '' });
    } catch {
      toast.error('Failed to block room');
    } finally {
      setIsSavingBlock(false);
    }
  };

  const handleDeleteBlock = async (blockId) => {
    setDeletingBlockId(blockId);
    try {
      await api.delete(`/admin/room-blocks/${blockId}`);
      onBlocksChange(prev => prev.filter(b => b._id !== blockId));
      toast.success('Block removed');
    } catch {
      toast.error('Failed to remove block');
    } finally {
      setDeletingBlockId(null);
    }
  };

  // Get existing blocks for modal type + date
  const getBlocksForModal = () => {
    if (!blockModal) return [];
    const current = new Date(blockModal.date); current.setHours(0,0,0,0);
    return roomBlocks.filter(b => {
      const isThisType = b.roomTypeId?._id === blockModal.type._id || b.roomTypeId === blockModal.type._id;
      if (!isThisType) return false;
      const bStart = new Date(b.startDate); bStart.setHours(0,0,0,0);
      const bEnd = new Date(b.endDate); bEnd.setHours(0,0,0,0);
      return current >= bStart && current <= bEnd;
    });
  };

  // CSV Export
  const handleConfirmExport = () => {
    const start = new Date(exportStartDate);
    const end = new Date(exportEndDate);
    if (end < start) return toast.error('End date must be after start date');
    const exportDates = [];
    let curr = new Date(start);
    while (curr <= end) { exportDates.push(new Date(curr)); curr.setDate(curr.getDate() + 1); }
    if (exportDates.length > 90) return toast.error('Please select 90 days or less');

    let csv = 'Room Category,Type,' + exportDates.map(d => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })).join(',') + '\n';
    roomTypes.forEach(type => {
      const stats = exportDates.map(d => getStatsForDateAndType(d, type));
      csv += `"${type.name}",AVAILABLE,${stats.map(s => s.available).join(',')}\n`;
      csv += `"",BOOKED,${stats.map(s => s.booked).join(',')}\n`;
      csv += `"",BLOCKED,${stats.map(s => s.blocked).join(',')}\n`;
    });
    const dailyExport = exportDates.map(date => {
      let totalAvail = 0;
      roomTypes.forEach(type => { totalAvail += getStatsForDateAndType(date, type).available; });
      const occ = rooms.length === 0 ? 0 : Math.round(((rooms.length - totalAvail) / rooms.length) * 100);
      return { available: totalAvail, occupancy: occ };
    });
    csv += `Available Inventory,,${dailyExport.map(s => s.available).join(',')}\n`;
    csv += `Occupancy %,,${dailyExport.map(s => s.occupancy + '%').join(',')}\n`;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `availability_${exportStartDate}_to_${exportEndDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShowExportModal(false);
  };

  return (
    <div className="bg-[#13151a]/80 backdrop-blur-xl border border-white/5 rounded-2xl shadow-xl overflow-hidden mt-6">
      <div className="p-4 border-b border-white/10 flex justify-between items-center bg-[#1a1d24]">
        <h3 className="text-white font-bold text-lg">Availability Calendar</h3>
        <div className="flex items-center gap-2 text-xs text-slate-500 italic">
          <ShieldAlert size={14} className="text-orange-400" />
          Click any <span className="text-orange-400 font-bold not-italic">BLOCKED</span> cell to manage blocks
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left border-collapse min-w-[900px]">
          <thead>
            <tr className="bg-[#1a1d24]">
              <th className="p-4 border-b border-r border-white/10 w-40">
                <div className="text-orange-500 font-bold uppercase tracking-wider text-xs">Room Category</div>
              </th>
              <th className="p-4 border-b border-r border-white/10 w-24 text-center text-blue-400 font-bold uppercase">Pre</th>
              <th className="p-4 border-b border-r border-white/10 w-28 text-center text-purple-400 font-bold uppercase">Type</th>
              {dates.map((date, i) => (
                <th key={i} className="p-2 border-b border-white/10 text-center text-emerald-400 w-16">
                  <div className="text-xs uppercase">{date.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                  <div className="font-bold text-lg">{date.getDate()}</div>
                  <div className="text-xs uppercase">{date.toLocaleDateString('en-US', { month: 'short' })}</div>
                </th>
              ))}
              <th className="p-4 border-b border-white/10 w-24 text-center text-blue-400 font-bold uppercase">Next</th>
            </tr>
          </thead>
          <tbody>
            {roomTypes.map((type, index) => {
              const typeRooms = rooms.filter(r => r.roomTypeId?._id === type._id || r.roomTypeId === type._id);
              const total = typeRooms.length;
              const typeStatsByDate = dates.map(d => getStatsForDateAndType(d, type));

              return (
                <React.Fragment key={type._id}>
                  {/* AVAILABLE ROW */}
                  <tr className="border-b border-white/5 bg-[#0f1115]/50">
                    <td rowSpan={3} className="p-4 border-r border-white/10 align-top">
                      <div className="font-bold text-white mb-1">{type.name}</div>
                      <div className="text-slate-400 text-xs">Total Units: {total}</div>
                    </td>
                    {index === 0 && (
                      <td rowSpan={roomTypes.length * 3} className="p-2 border-r border-white/10 align-middle text-center bg-[#0f1115]">
                        <button onClick={handlePrev} className="p-3 rounded-full bg-white/5 hover:bg-white/10 transition-colors inline-flex">
                          <ChevronLeft size={28} className="text-slate-300" />
                        </button>
                      </td>
                    )}
                    <td className="p-2 border-r border-white/10 text-slate-300 text-xs font-semibold tracking-wider">AVAILABLE</td>
                    {typeStatsByDate.map((stats, i) => (
                      <td key={`avail-${i}`} className="p-1 border-white/5 text-center">
                        <div className={`py-2 px-1 rounded text-sm ${getCellColor(stats.available, total)}`}>
                          {stats.available}
                        </div>
                      </td>
                    ))}
                    {index === 0 && (
                      <td rowSpan={roomTypes.length * 3} className="p-2 border-l border-white/10 align-middle text-center bg-[#0f1115]">
                        <button onClick={handleNext} className="p-3 rounded-full bg-white/5 hover:bg-white/10 transition-colors inline-flex">
                          <ChevronRight size={28} className="text-slate-300" />
                        </button>
                      </td>
                    )}
                  </tr>
                  {/* BOOKED ROW */}
                  <tr className="border-b border-white/5 bg-[#0f1115]/30">
                    <td className="p-2 border-r border-white/10 text-slate-400 text-xs tracking-wider">BOOKED</td>
                    {typeStatsByDate.map((stats, i) => (
                      <td key={`book-${i}`} className="p-1 border-white/5 text-center text-slate-400">
                        {stats.booked}
                      </td>
                    ))}
                  </tr>
                  {/* BLOCKED ROW — INTERACTIVE */}
                  <tr className="border-b border-white/10 bg-[#0f1115]/30">
                    <td className="p-2 border-r border-white/10 text-orange-400 text-xs tracking-wider font-bold">BLOCKED</td>
                    {dates.map((date, i) => {
                      const stats = typeStatsByDate[i];
                      return (
                        <td key={`block-${i}`} className="p-1 border-white/5 text-center">
                          <button
                            onClick={() => openBlockModal(type, date)}
                            className={`w-full py-1.5 rounded text-xs font-bold transition-all hover:scale-105 ${
                              stats.blocked > 0
                                ? 'bg-orange-500/20 text-orange-400 border border-orange-500/40 hover:bg-orange-500/30'
                                : 'text-slate-600 hover:text-orange-400 hover:bg-orange-500/10 border border-transparent hover:border-orange-500/20'
                            }`}
                            title={`Manage blocks for ${type.name} on ${date.toLocaleDateString()}`}
                          >
                            {stats.blocked > 0 ? stats.blocked : '+'}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                </React.Fragment>
              );
            })}
            {roomTypes.length === 0 && (
              <tr>
                <td colSpan={12} className="p-8 text-center text-slate-500">
                  No room categories configured.
                </td>
              </tr>
            )}
          </tbody>
          <tfoot className="bg-[#1a1d24]">
            <tr>
              <td colSpan={3} className="p-3 border-r border-white/10 font-bold text-white">Available Inventory</td>
              {dailyStats.map((stat, i) => (
                <td key={`inv-${i}`} className="p-3 text-center font-bold text-white">{stat.available}</td>
              ))}
              <td></td>
            </tr>
            <tr className="border-t border-white/5">
              <td colSpan={3} className="p-3 border-r border-white/10 font-bold text-slate-400">Occupancy %</td>
              {dailyStats.map((stat, i) => (
                <td key={`occ-${i}`} className="p-3 text-center text-slate-400">{stat.occupancy}%</td>
              ))}
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="p-4 border-t border-white/10 flex justify-start bg-[#1a1d24]">
        <button onClick={() => setShowExportModal(true)} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors text-sm font-semibold shadow-lg shadow-emerald-500/20">
          <Download size={16} />
          Export CSV
        </button>
      </div>

      {/* ===== BLOCK MANAGEMENT MODAL ===== */}
      {blockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setBlockModal(null)}>
          <div className="bg-[#13151a] border border-white/10 p-6 rounded-2xl shadow-2xl w-[600px] max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            
            <div className="flex justify-between items-start mb-5">
              <div>
                <h3 className="text-xl font-black text-white">Manage Blocks</h3>
                <p className="text-sm text-slate-400 mt-0.5">
                  <span className="text-orange-400 font-bold">{blockModal.type.name}</span> — {blockModal.date.toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'long' })}
                </p>
              </div>
              <button onClick={() => setBlockModal(null)} className="text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 p-2 rounded-lg transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* Existing blocks for this date */}
            <div className="mb-5">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Active Blocks on This Date</p>
              {getBlocksForModal().length === 0 ? (
                <p className="text-slate-600 text-sm italic py-2">No blocks active — rooms are available.</p>
              ) : (
                <div className="space-y-2">
                  {getBlocksForModal().map(b => (
                    <div key={b._id} className="flex items-center justify-between bg-orange-500/10 border border-orange-500/25 rounded-xl px-4 py-2.5">
                      <div>
                        <p className="text-white text-sm font-bold">Room {b.roomId?.roomNumber}</p>
                        <p className="text-orange-300 text-xs">{REASON_LABELS[b.reason] || b.reason} · {new Date(b.startDate).toLocaleDateString('en-GB')} – {new Date(b.endDate).toLocaleDateString('en-GB')}</p>
                        {b.notes && <p className="text-slate-400 text-xs italic mt-0.5">{b.notes}</p>}
                      </div>
                      <button
                        onClick={() => handleDeleteBlock(b._id)}
                        disabled={deletingBlockId === b._id}
                        className="text-rose-400 hover:text-white hover:bg-rose-500/20 p-2 rounded-lg transition-all"
                      >
                        {deletingBlockId === b._id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-white/10 pt-5">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Add New Block</p>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Room</label>
                  <select
                    value={blockForm.roomId}
                    onChange={e => setBlockForm(p => ({ ...p, roomId: e.target.value }))}
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-sm focus:outline-none focus:border-orange-500 transition-colors"
                  >
                    {blockModal.typeRooms.map(r => (
                      <option key={r._id} value={r._id}>Room {r.roomNumber}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <DatePicker label="Start Date" selected={blockForm.startDate} onChange={v => setBlockForm(p => ({ ...p, startDate: v }))} />
                  </div>
                  <div>
                    <DatePicker label="End Date" selected={blockForm.endDate} onChange={v => setBlockForm(p => ({ ...p, endDate: v }))} />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Reason</label>
                  <select
                    value={blockForm.reason}
                    onChange={e => setBlockForm(p => ({ ...p, reason: e.target.value }))}
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-sm focus:outline-none focus:border-orange-500 transition-colors"
                  >
                    {Object.entries(REASON_LABELS).map(([val, label]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Notes (optional)</label>
                  <textarea
                    value={blockForm.notes}
                    onChange={e => setBlockForm(p => ({ ...p, notes: e.target.value }))}
                    placeholder="e.g. Pipe burst in bathroom"
                    rows={2}
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-sm focus:outline-none focus:border-orange-500 transition-colors resize-none"
                  />
                </div>
                <button
                  onClick={handleAddBlock}
                  disabled={isSavingBlock}
                  className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-bold py-3.5 rounded-xl transition-all hover:-translate-y-0.5 shadow-lg shadow-orange-500/20"
                >
                  {isSavingBlock ? <Loader2 size={18} className="animate-spin" /> : <ShieldAlert size={18} />}
                  {isSavingBlock ? 'Blocking...' : 'Block Room'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== EXPORT MODAL ===== */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#13151a] border border-white/10 p-6 rounded-2xl shadow-2xl w-[400px] animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white">Export Calendar Data</h3>
              <button onClick={() => setShowExportModal(false)} className="text-slate-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 p-2 rounded-lg">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-5">
              <div>
                <DatePicker label="Start Date" selected={exportStartDate} onChange={setExportStartDate} />
              </div>
              <div>
                <DatePicker label="End Date" selected={exportEndDate} onChange={setExportEndDate} />
              </div>
              <button onClick={handleConfirmExport} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl transition-all hover:-translate-y-0.5 shadow-lg shadow-emerald-500/20">
                Download CSV
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AvailabilityCalendar;
