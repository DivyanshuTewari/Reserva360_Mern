import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { X, User, Calendar, CreditCard, CheckCircle, ChevronDown, ChevronUp, FileText, Info, Plus, RefreshCw, Copy, Check } from 'lucide-react';

const Accordion = ({ title, defaultOpen = false, children, badge }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-slate-300 rounded-md mb-3 bg-white overflow-hidden shadow-sm">
      <div 
        className="flex justify-between items-center p-2.5 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors border-b border-slate-200"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2">
          <h4 className="font-bold text-slate-800 uppercase tracking-wide text-xs">{title}</h4>
          {badge}
        </div>
        {isOpen ? <ChevronUp size={16} className="text-slate-500" /> : <ChevronDown size={16} className="text-slate-500" />}
      </div>
      {isOpen && (
        <div className="p-3">
          {children}
        </div>
      )}
    </div>
  );
};

const InfoRow = ({ label, value, valueClass = "font-semibold text-slate-800", linkHref }) => (
  <div className="flex justify-between items-start py-1.5 border-b border-slate-100 last:border-0 text-[13px] leading-tight hover:bg-slate-50 transition-colors px-1 -mx-1">
    <span className="text-slate-500 w-1/3 shrink-0">{label}</span>
    {linkHref ? (
      <a href={linkHref} className={`text-right w-2/3 break-words hover:underline text-blue-600 ${valueClass}`}>{value || 'N/A'}</a>
    ) : (
      <span className={`text-right w-2/3 break-words ${valueClass}`}>{value || 'N/A'}</span>
    )}
  </div>
);

const BookingDetailsDrawer = ({ bookingId, onClose }) => {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (bookingId) {
      fetchDetails();
    }
  }, [bookingId]);

  const fetchDetails = async () => {
    try {
      setIsLoading(true);
      const res = await api.get(`/admin/bookings/${bookingId}/details`);
      setData(res.data);
    } catch (error) {
      toast.error('Failed to load booking details');
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyId = (id) => {
    if (!id) return;
    navigator.clipboard.writeText(id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Booking ID copied!');
  };

  if (!bookingId) return null;

  const b = data?.booking;
  const s = data?.services || [];

  const getStatusBadge = (status) => {
    const st = status?.toLowerCase() || '';
    if (st === 'checked-in') return <span className="px-2 py-0.5 rounded bg-green-100 text-green-800 text-xs font-bold uppercase border border-green-200">Checked In</span>;
    if (st === 'checked-out') return <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-800 text-xs font-bold uppercase border border-purple-200">Checked Out</span>;
    if (st === 'confirmed') return <span className="px-2 py-0.5 rounded bg-orange-100 text-orange-800 text-xs font-bold uppercase border border-orange-200">Confirmed</span>;
    if (st === 'cancelled') return <span className="px-2 py-0.5 rounded bg-red-100 text-red-800 text-xs font-bold uppercase border border-red-200">Cancelled</span>;
    if (st === 'hold') return <span className="px-2 py-0.5 rounded bg-yellow-100 text-yellow-800 text-xs font-bold uppercase border border-yellow-300">Hold</span>;
    return <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 text-xs font-bold uppercase border border-slate-200">{status}</span>;
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-GB') : 'N/A';
  const formatDateTime = (d) => d ? new Date(d).toLocaleString('en-GB') : 'N/A';
  const formatCurrency = (amt) => `₹${Number(amt || 0).toFixed(2)}`;

  const nights = b?.checkInDate && b?.checkOutDate 
    ? Math.max(1, Math.ceil((new Date(b.checkOutDate) - new Date(b.checkInDate)) / (1000 * 60 * 60 * 24)))
    : 0;

  const extraServicesTotal = s.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const posTotal = 0;
  const refundTotal = 0;
  
  const shortBookingId = b?._id?.toString()?.slice(-6)?.toUpperCase() || 'N/A';

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-[2px] z-[60] transition-opacity flex items-center justify-center p-4 sm:p-6" 
        onClick={onClose}
      >
        {/* Modal Container */}
        <div 
          className="bg-[#f8fafc] w-full max-w-6xl max-h-[95vh] rounded shadow-2xl flex flex-col transform transition-all overflow-hidden border border-slate-300 relative"
          onClick={(e) => e.stopPropagation()}
        >
        
        {/* Header */}
        <div className="flex items-center justify-between p-3.5 bg-white border-b border-slate-300 shrink-0 shadow-sm sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">Booking Details</h2>
            {!isLoading && b && getStatusBadge(b.status)}
            {!isLoading && b && (
               <div className="flex items-center gap-1 ml-2 text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded border border-slate-200 cursor-pointer hover:bg-slate-200 transition-colors" onClick={() => handleCopyId(b._id)}>
                 ID: {shortBookingId} {copied ? <Check size={12} className="text-green-600"/> : <Copy size={12}/>}
               </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors">
              <X size={22} strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          {isLoading ? (
            <div className="flex flex-col justify-center items-center h-64 gap-3 text-slate-500">
              <RefreshCw className="animate-spin" size={28} />
              <span className="text-sm font-bold uppercase tracking-widest">Loading Details...</span>
            </div>
          ) : !data || !b ? (
            <div className="flex flex-col justify-center items-center h-64 text-slate-500">
              <Info size={40} className="mb-2 opacity-50" />
              <p className="font-semibold uppercase tracking-wide text-sm">Unable to load booking details.</p>
            </div>
          ) : (
            <div className="space-y-5 pb-10">
              
              {/* 3-COLUMN DESKTOP LAYOUT */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                
                {/* 1. GUEST INFORMATION */}
                <div className="bg-white rounded border border-slate-300 shadow-sm overflow-hidden">
                  <div className="bg-slate-800 text-white p-2 flex items-center gap-2 border-b border-slate-300">
                    <User size={15} />
                    <h3 className="font-bold text-xs uppercase tracking-wider">Guest Information</h3>
                  </div>
                  <div className="p-3 bg-white">
                    <InfoRow label="Guest Name" value={b?.guestName} valueClass="font-black text-slate-900" />
                    <InfoRow label="Guest Email" value={b?.guestEmail} linkHref={b?.guestEmail ? `mailto:${b.guestEmail}` : null} />
                    <InfoRow label="Guest Mobile" value={b?.guestContact} linkHref={b?.guestContact ? `tel:${b.guestContact}` : null} />
                    <InfoRow label="Guest City" value={b?.guestCity} />
                    <InfoRow label="Guest State" value={b?.guestState} />
                    <InfoRow label="Guest Country" value={b?.guestCountry} />
                    <InfoRow label="Guest Address" value={b?.guestAddress} />
                    <InfoRow label="Guest DOB" value={formatDate(b?.guestDob)} />
                    <InfoRow label="Guest Type" value={b?.nationality === 'Foreigner' ? 'Foreigner' : 'Domestic'} />
                    <InfoRow label="Company Name" value={b?.companyName} />
                    <InfoRow label="Company GST" value={b?.companyGst} />
                  </div>
                </div>

                {/* 2. BOOKING INFORMATION */}
                <div className="bg-white rounded border border-slate-300 shadow-sm overflow-hidden">
                  <div className="bg-slate-800 text-white p-2 flex items-center gap-2 border-b border-slate-300">
                    <Calendar size={15} />
                    <h3 className="font-bold text-xs uppercase tracking-wider">Booking Information</h3>
                  </div>
                  <div className="p-3 bg-white">
                    <InfoRow label="Booking Source" value={b?.bookingSource || 'Direct'} valueClass="font-bold text-slate-800" />
                    <InfoRow label="Source Type" value="Direct" />
                    <InfoRow label="Booking Date" value={formatDate(b?.createdAt)} />
                    <InfoRow label="Booking ID" value={b?._id?.toString()?.toUpperCase()} valueClass="font-mono font-bold text-slate-700 text-[11px]" />
                    <InfoRow label="Check-In Date" value={formatDate(b?.checkInDate)} valueClass="font-bold text-blue-700" />
                    <InfoRow label="Check-Out Date" value={formatDate(b?.checkOutDate)} valueClass="font-bold text-blue-700" />
                    <InfoRow label="Room Count" value="1" />
                    <InfoRow label="Adult/Child" value={`${b?.adults || 0} Adult / ${b?.children || 0} Child`} />
                    <InfoRow label="Number Of Nights" value={nights} />
                    <InfoRow label="Meal Plan" value={b?.mealPlan || 'Room Only'} />
                    <InfoRow label="Booking Status" value={b?.status?.toUpperCase()} />
                    <InfoRow label="Room Numbers" value={b?.roomId?.roomNumber} valueClass="font-black text-slate-900" />
                    <InfoRow label="Created By" value="Admin" />
                  </div>
                </div>

                {/* 3. PAYMENT INFORMATION */}
                <div className="bg-white rounded border border-slate-300 shadow-sm overflow-hidden">
                  <div className="bg-slate-800 text-white p-2 flex items-center gap-2 border-b border-slate-300">
                    <CreditCard size={15} />
                    <h3 className="font-bold text-xs uppercase tracking-wider">Payment Information</h3>
                  </div>
                  <div className="p-3 bg-white">
                    <InfoRow label="Booking Commission" value={formatCurrency(0)} />
                    <InfoRow label="Booking Amount" value={formatCurrency(b?.cost || b?.totalAmount)} />
                    <InfoRow label="POS Orders Amount" value={formatCurrency(posTotal)} />
                    <InfoRow label="Extra Service Amt" value={formatCurrency(extraServicesTotal)} />
                    <InfoRow label="GST Amount" value={formatCurrency(b?.gst)} />
                    <InfoRow label="Discount Amount" value={formatCurrency(b?.discountValue)} valueClass="font-bold text-orange-600" />
                    <InfoRow label="Total Amount" value={formatCurrency(b?.totalAmount)} valueClass="font-black text-lg text-slate-900" />
                    <InfoRow label="Received Amount" value={formatCurrency(b?.paidAmount)} valueClass="font-bold text-green-600" />
                    <InfoRow label="Pending Amount" value={formatCurrency(b?.pendingAmount)} valueClass="font-bold text-red-600" />
                    <InfoRow label="Refund Amount" value={formatCurrency(refundTotal)} />
                    <InfoRow label="Payment Status" value={b?.paymentStatus?.toUpperCase()} valueClass="font-bold" />
                    <InfoRow label="Payment Method" value={b?.paymentMethod || 'Cash'} />
                  </div>
                </div>

              </div>

              <div className="border-t-2 border-dashed border-slate-300 my-2"></div>

              {/* OPERATIONAL ACCORDIONS */}
              
              <Accordion 
                title="1. Check In Created" 
                defaultOpen={b?.status === 'checked-in' || b?.status === 'checked-out'}
                badge={data?.checkInDetails ? <CheckCircle size={14} className="text-green-500"/> : null}
              >
                {data?.checkInDetails ? (
                  <div className="text-sm space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-2 bg-slate-50 border border-slate-200 rounded">
                      <div><span className="text-slate-500 block text-[11px] font-bold uppercase">Assigned Room</span> <span className="font-black text-base text-slate-800">{data.checkInDetails.assignedRoom || 'N/A'}</span></div>
                      <div><span className="text-slate-500 block text-[11px] font-bold uppercase">Check In Time</span> <span className="font-bold text-slate-800">{formatDateTime(data.checkInDetails.time)}</span></div>
                      <div><span className="text-slate-500 block text-[11px] font-bold uppercase">ID Verification</span> <span className={`font-bold ${data.checkInDetails.idVerified ? 'text-green-600' : 'text-orange-600'}`}>{data.checkInDetails.idVerified ? 'Verified' : 'Pending'}</span></div>
                    </div>
                    <div className="p-2">
                      <span className="text-slate-500 block text-[11px] font-bold uppercase">Front Desk Notes</span> 
                      <p className="font-medium text-slate-700 bg-white p-2 border border-slate-200 rounded mt-1">{data.checkInDetails.notes || 'No notes added.'}</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-5 text-slate-500 text-sm bg-slate-50 rounded border border-dashed border-slate-300">
                    Guest has not checked in yet.
                    <div className="mt-3">
                      <button className="px-4 py-1.5 bg-blue-600 text-white font-bold text-xs rounded hover:bg-blue-700 transition-colors shadow-sm">
                        Process Check-In
                      </button>
                    </div>
                  </div>
                )}
              </Accordion>

              <Accordion title="2. Extra Service" defaultOpen={false}>
                {data?.services && data.services.length > 0 ? (
                  <div className="border border-slate-200 rounded overflow-hidden">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-100 border-b border-slate-200">
                        <tr>
                          <th className="p-2 text-[11px] uppercase tracking-wider font-bold text-slate-600">Service Name</th>
                          <th className="p-2 text-[11px] uppercase tracking-wider font-bold text-slate-600 text-right">Amount</th>
                          <th className="p-2 text-[11px] uppercase tracking-wider font-bold text-slate-600">Date Added</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.services.map((s, i) => (
                          <tr key={i} className="border-b border-slate-100 bg-white hover:bg-slate-50">
                            <td className="p-2 font-medium text-slate-800">{s?.name}</td>
                            <td className="p-2 font-bold text-slate-900 text-right">{formatCurrency(s?.amount)}</td>
                            <td className="p-2 text-slate-500">{formatDate(s?.date)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-5 text-slate-500 text-sm bg-slate-50 rounded border border-dashed border-slate-300">
                    <Info size={24} className="mx-auto text-slate-300 mb-2" />
                    No extra services requested.
                    <div className="mt-3">
                      <button className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-300 text-slate-700 text-xs font-bold rounded shadow-sm hover:bg-slate-50 transition-colors">
                        <Plus size={14} /> Add Service
                      </button>
                    </div>
                  </div>
                )}
              </Accordion>

              <Accordion title="3. Payments Folio" defaultOpen={data?.payments?.length > 0}>
                {data?.payments && data.payments.length > 0 ? (
                  <div className="border border-slate-200 rounded overflow-hidden">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-100 border-b border-slate-200">
                        <tr>
                          <th className="p-2 text-[11px] uppercase tracking-wider font-bold text-slate-600">Date</th>
                          <th className="p-2 text-[11px] uppercase tracking-wider font-bold text-slate-600">Method</th>
                          <th className="p-2 text-[11px] uppercase tracking-wider font-bold text-slate-600">Transaction ID</th>
                          <th className="p-2 text-[11px] uppercase tracking-wider font-bold text-slate-600 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.payments.map((p, i) => (
                          <tr key={i} className="border-b border-slate-100 bg-white hover:bg-slate-50">
                            <td className="p-2 font-medium text-slate-600">{formatDateTime(p?.date)}</td>
                            <td className="p-2 font-bold text-slate-800">{p?.method}</td>
                            <td className="p-2 text-slate-500 font-mono text-xs">{p?.transactionId || '-'}</td>
                            <td className="p-2 font-black text-green-600 text-right">{formatCurrency(p?.amount)}</td>
                          </tr>
                        ))}
                        <tr className="bg-slate-50 border-t-2 border-slate-300">
                          <td colSpan={3} className="p-2 font-bold text-slate-800 text-right uppercase text-xs">Total Paid:</td>
                          <td className="p-2 font-black text-slate-900 text-right">{formatCurrency(b?.paidAmount)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-5 text-slate-500 text-sm bg-slate-50 rounded border border-dashed border-slate-300">
                    No payment records found in folio.
                    <div className="mt-3">
                      <button className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-300 text-slate-700 text-xs font-bold rounded shadow-sm hover:bg-slate-50 transition-colors">
                        <Plus size={14} /> Add Payment
                      </button>
                    </div>
                  </div>
                )}
              </Accordion>

              <Accordion 
                title="4. Check Out Created" 
                defaultOpen={b?.status === 'checked-out'}
                badge={data?.checkOutDetails ? <CheckCircle size={14} className="text-green-500"/> : null}
              >
                {data?.checkOutDetails ? (
                  <div className="text-sm space-y-3">
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 bg-slate-50 border border-slate-200 rounded">
                      <div><span className="text-slate-500 block text-[11px] font-bold uppercase">Check Out Time</span> <span className="font-bold text-slate-800">{formatDateTime(data.checkOutDetails.time)}</span></div>
                      <div>
                        <span className="text-slate-500 block text-[11px] font-bold uppercase">Settlement Status</span> 
                        <span className={`font-black ${data.checkOutDetails.settlementStatus === 'Settled' ? 'text-green-600' : 'text-red-600'}`}>
                          {data.checkOutDetails.settlementStatus || 'N/A'}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <button className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 text-slate-800 text-xs font-bold rounded shadow-sm hover:bg-slate-50 transition-colors">
                        <FileText size={14}/> Guest Invoice
                      </button>
                      <button className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 text-slate-800 text-xs font-bold rounded shadow-sm hover:bg-slate-50 transition-colors">
                        <FileText size={14}/> Proforma Invoice
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-5 text-slate-500 text-sm bg-slate-50 rounded border border-dashed border-slate-300">
                    Guest has not checked out yet.
                    <div className="mt-3">
                      <button className="px-4 py-1.5 bg-white border border-slate-300 text-slate-800 font-bold text-xs rounded hover:bg-slate-50 transition-colors shadow-sm">
                        Process Check-Out
                      </button>
                    </div>
                  </div>
                )}
              </Accordion>

            </div>
          )}
        </div>
        </div>
      </div>
    </>
  );
};

export default BookingDetailsDrawer;
