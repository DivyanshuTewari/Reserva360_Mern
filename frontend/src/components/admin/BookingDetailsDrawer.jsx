import React, { useState, useEffect, useRef } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { X, User, Calendar, CreditCard, CheckCircle, ChevronDown, ChevronUp, FileText, Info, Plus, RefreshCw, Copy, Check } from 'lucide-react';
import BookingVoucher from './BookingVoucher';

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

const BookingDetailsDrawer = ({ bookingId, onClose, onRefresh }) => {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedRoomsMap, setSelectedRoomsMap] = useState({});
  const [selectedStatusMap, setSelectedStatusMap] = useState({});
  const [serviceForm, setServiceForm] = useState({
    name: '',
    amountWithoutTax: '',
    taxName: '',
    taxAmount: '',
    date: new Date().toISOString().split('T')[0],
    referenceText: ''
  });
  const [isSavingService, setIsSavingService] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    paymentType: 'Bank Transfer',
    additionType: 'Default',
    amount: '',
    paymentDate: new Date().toISOString().split('T')[0],
    referenceText: ''
  });
  const [isSavingPayment, setIsSavingPayment] = useState(false);
  const [checkoutForm, setCheckoutForm] = useState({
    haveGst: 'No',
    onDutyManager: '',
    departureDateTime: (() => {
      const tzoffset = (new Date()).getTimezoneOffset() * 60000;
      return (new Date(Date.now() - tzoffset)).toISOString().slice(0, 16);
    })(),
    checkoutComment: '',
    markRoomTo: 'Dirty',
    emailInvoiceToGuest: 'No'
  });
  const [isSavingCheckout, setIsSavingCheckout] = useState(false);
  
  const [hotelProfile, setHotelProfile] = useState(null);
  const [printTitle, setPrintTitle] = useState('Guest Invoice');
  const printVoucherRef = useRef(null);

  useEffect(() => {
    if (data?.groupBookings) {
      const roomMap = {};
      const statusMap = {};
      data.groupBookings.forEach(gb => {
        roomMap[gb._id] = gb.roomId?._id || '';
        statusMap[gb._id] = gb.roomId?.status || 'occupied';
      });
      setSelectedRoomsMap(roomMap);
      setSelectedStatusMap(statusMap);
    }
  }, [data]);

  const handleRoomChangeSelect = (bId, roomId) => {
    setSelectedRoomsMap(prev => ({ ...prev, [bId]: roomId }));
  };

  const handleStatusChangeSelect = (bId, status) => {
    setSelectedStatusMap(prev => ({ ...prev, [bId]: status }));
  };
  const executeChangeRoom = async (bId) => {
    const originalBooking = data.groupBookings.find(gb => gb._id === bId);
    if (!originalBooking) return;

    const newRoomId = selectedRoomsMap[bId];
    const newStatus = selectedStatusMap[bId];
    
    const originalRoomId = originalBooking.roomId?._id;
    const isCheckedIn = originalBooking.status === 'checked-in';

    const updates = [];

    // 1. If room assignment changed
    if (newRoomId && newRoomId !== originalRoomId) {
      const newRoom = data.allRooms.find(r => r._id === newRoomId);
      if (!newRoom) {
        toast.error('Selected room not found');
        return;
      }
      
      // Update the booking's roomId in the database
      updates.push(
        api.patch(`/admin/bookings/${bId}`, { roomId: newRoomId })
      );

      // Determine the correct status for the rooms based on check-in state
      const targetNewRoomStatus = isCheckedIn ? 'occupied' : 'available';
      
      updates.push(
        api.put(`/admin/rooms/${newRoomId}/status`, { status: targetNewRoomStatus })
      );

      // Free the original room to be available
      if (originalRoomId) {
        updates.push(
          api.put(`/admin/rooms/${originalRoomId}/status`, { status: 'available' })
        );
      }
    } else {
      // 2. If room assignment did not change, but status was manually updated in the dropdown
      const activeRoomId = originalRoomId;
      const originalStatus = originalBooking.roomId?.status;
      if (activeRoomId && newStatus && newStatus !== originalStatus) {
        updates.push(
          api.put(`/admin/rooms/${activeRoomId}/status`, { status: newStatus })
        );
      }
    }

    if (updates.length === 0) {
      toast.error('No changes selected to update.');
      return;
    }

    const toastId = toast.loading('Updating room details...');
    try {
      await Promise.all(updates);
      toast.success('Room details updated successfully!', { id: toastId });
      await fetchDetails();
      if (onRefresh) onRefresh();
    } catch (error) {
      toast.error('Failed to update room details: ' + (error.response?.data?.message || error.message), { id: toastId });
    }
  };

  const handleRemoveCheckin = async () => {
    if (!window.confirm('Are you sure you want to remove check-in for this booking? This will revert the status back to Confirmed.')) {
      return;
    }

    const toastId = toast.loading('Removing check-in...');
    try {
      const updates = [];
      
      for (const gb of data.groupBookings) {
        updates.push(
          api.put(`/admin/bookings/${gb._id}/status`, { 
            status: 'confirmed', 
            paymentStatus: gb.paymentStatus 
          })
        );
        
        if (gb.roomId?._id) {
          updates.push(
            api.put(`/admin/rooms/${gb.roomId._id}/status`, { status: 'available' })
          );
        }
      }

      await Promise.all(updates);
      toast.success('Check-in removed successfully!', { id: toastId });
      await fetchDetails();
      if (onRefresh) onRefresh();
    } catch (error) {
      toast.error('Failed to remove check-in: ' + (error.response?.data?.message || error.message), { id: toastId });
    }
  };

  const handleAddService = async (e) => {
    e.preventDefault();
    if (!serviceForm.name || !serviceForm.amountWithoutTax) {
      toast.error('Service Name and Amount Without Tax are required');
      return;
    }

    setIsSavingService(true);
    const toastId = toast.loading('Adding extra service...');
    try {
      await api.post(`/admin/bookings/${bookingId}/services`, {
        name: serviceForm.name,
        amountWithoutTax: Number(serviceForm.amountWithoutTax),
        taxName: serviceForm.taxName,
        taxAmount: Number(serviceForm.taxAmount || 0),
        discount: 0,
        date: serviceForm.date,
        referenceText: serviceForm.referenceText
      });
      toast.success('Extra service added successfully!', { id: toastId });
      
      setServiceForm({
        name: '',
        amountWithoutTax: '',
        taxName: '',
        taxAmount: '',
        date: new Date().toISOString().split('T')[0],
        referenceText: ''
      });

      await fetchDetails();
      if (onRefresh) onRefresh();
    } catch (error) {
      toast.error('Failed to add extra service: ' + (error.response?.data?.message || error.message), { id: toastId });
    } finally {
      setIsSavingService(false);
    }
  };

  const handleDeleteService = async (serviceId) => {
    if (!window.confirm('Are you sure you want to delete this extra service?')) return;

    const toastId = toast.loading('Deleting extra service...');
    try {
      await api.delete(`/admin/services/${serviceId}`);
      toast.success('Extra service deleted successfully!', { id: toastId });
      await fetchDetails();
      if (onRefresh) onRefresh();
    } catch (error) {
      toast.error('Failed to delete extra service: ' + (error.response?.data?.message || error.message), { id: toastId });
    }
  };

  const handleAddPayment = async (e) => {
    e.preventDefault();
    if (!paymentForm.amount) {
      toast.error('Amount is required');
      return;
    }

    setIsSavingPayment(true);
    const toastId = toast.loading('Adding payment folio...');
    try {
      await api.post(`/admin/bookings/${bookingId}/payments`, {
        paymentType: paymentForm.paymentType,
        additionType: paymentForm.additionType,
        amount: Number(paymentForm.amount),
        paymentDate: paymentForm.paymentDate,
        referenceText: paymentForm.referenceText
      });
      toast.success('Payment folio added successfully!', { id: toastId });
      
      setPaymentForm({
        paymentType: 'Bank Transfer',
        additionType: 'Default',
        amount: '',
        paymentDate: new Date().toISOString().split('T')[0],
        referenceText: ''
      });

      await fetchDetails();
      if (onRefresh) onRefresh();
    } catch (error) {
      toast.error('Failed to add payment folio: ' + (error.response?.data?.message || error.message), { id: toastId });
    } finally {
      setIsSavingPayment(false);
    }
  };

  const handleDeletePayment = async (paymentId) => {
    if (!window.confirm('Are you sure you want to delete this payment folio record?')) return;

    const toastId = toast.loading('Deleting payment folio...');
    try {
      await api.delete(`/admin/payments/${paymentId}`);
      toast.success('Payment folio deleted successfully!', { id: toastId });
      await fetchDetails();
      if (onRefresh) onRefresh();
    } catch (error) {
      toast.error('Failed to delete payment folio: ' + (error.response?.data?.message || error.message), { id: toastId });
    }
  };

  const handleProcessCheckout = async (e) => {
    if (e) e.preventDefault();
    if (!checkoutForm.onDutyManager) {
      toast.error('On Duty Manager is required');
      return;
    }
    if (!checkoutForm.departureDateTime) {
      toast.error('Departure Date & Time is required');
      return;
    }

    setIsSavingCheckout(true);
    const toastId = toast.loading('Processing check-out...');
    try {
      await api.put(`/admin/bookings/${bookingId}/checkout`, {
        haveGst: checkoutForm.haveGst,
        onDutyManager: checkoutForm.onDutyManager,
        departureDateTime: checkoutForm.departureDateTime,
        checkoutComment: checkoutForm.checkoutComment,
        markRoomTo: checkoutForm.markRoomTo,
        emailInvoiceToGuest: checkoutForm.emailInvoiceToGuest
      });

      toast.success('Check-out completed successfully!', { id: toastId });
      await fetchDetails();
      if (onRefresh) onRefresh();
    } catch (error) {
      toast.error('Failed to process check-out: ' + (error.response?.data?.message || error.message), { id: toastId });
    } finally {
      setIsSavingCheckout(false);
    }
  };

  useEffect(() => {
    if (bookingId) {
      fetchDetails();
    }
  }, [bookingId]);

  const fetchDetails = async () => {
    try {
      setIsLoading(true);
      const [detailsRes, hotelRes] = await Promise.all([
        api.get(`/admin/bookings/${bookingId}/details`),
        api.get('/admin/hotel')
      ]);
      setData(detailsRes.data);
      setHotelProfile(hotelRes.data);
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

  const handlePrintAction = (title) => {
    setPrintTitle(title);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const handlePrintAndEmailAction = async () => {
    setPrintTitle('Guest Invoice');
    
    const toastId = toast.loading('Sending invoice email...');
    try {
      await api.patch(`/admin/bookings/${bookingId}`, { emailInvoiceToGuest: 'Yes' });
      toast.success("Guest Invoice marked as Emailed in database!", { id: toastId });
      
      fetchDetails();
      if (onRefresh) onRefresh();

      const subject = encodeURIComponent(`Invoice for Your Stay at ${hotelProfile?.name || 'Our Hotel'}`);
      const bodyText = `Hello ${b?.guestName || 'Valued Guest'},\n\nThank you for choosing ${hotelProfile?.name || 'us'} for your stay! We hope you had a wonderful experience.\n\nPlease find the summary of your invoice below:\n\nBooking ID: ${b?._id?.toString()?.toUpperCase()}\nCheck-In: ${formatDate(b?.checkInDate)}\nCheck-Out: ${formatDate(b?.checkOutDate)}\nTotal Amount: ${formatCurrency(b?.totalAmount)}\nAmount Paid: ${formatCurrency(b?.paidAmount)}\nPending Balance: ${formatCurrency(b?.pendingAmount)}\n\nBest regards,\n${hotelProfile?.name || 'Grand Hotel & Suites'} Management`;
      const mailtoUrl = `mailto:${b?.guestEmail || ''}?subject=${subject}&body=${encodeURIComponent(bodyText)}`;
      
      window.open(mailtoUrl, '_self');
      
      setTimeout(() => {
        window.print();
      }, 300);
      
    } catch (error) {
      toast.error('Failed to update email status: ' + (error.response?.data?.message || error.message), { id: toastId });
    }
  };

  const nights = b?.checkInDate && b?.checkOutDate 
    ? Math.max(1, Math.ceil((new Date(b.checkOutDate) - new Date(b.checkInDate)) / (1000 * 60 * 60 * 24)))
    : 0;

  const extraServicesTotal = s.reduce((sum, item) => sum + (Number(item.grandTotal || item.amount) || 0), 0);
  const posTotal = 0;
  const refundTotal = 0;
  
  const shortBookingId = b?._id?.toString()?.slice(-6)?.toUpperCase() || 'N/A';

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-[2px] z-[60] transition-opacity flex items-center justify-center p-4 sm:p-6 booking-details-backdrop" 
        onClick={onClose}
      >
        {/* Modal Container */}
        <div 
          className="bg-[#f8fafc] w-full max-w-6xl max-h-[95vh] rounded shadow-2xl flex flex-col transform transition-all overflow-hidden border border-slate-300 relative booking-details-modal"
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
                badge={data?.checkInDetails ? <CheckCircle size={14} className="text-emerald-500"/> : null}
              >
                {data?.checkInDetails ? (
                  <div className="text-sm space-y-4 font-sans">
                    {/* Mint/Teal CHECK IN CREATED Header */}
                    <div className="bg-[#54c6a9] text-white px-4 py-3 flex justify-between items-center font-bold text-sm shadow-sm tracking-wide rounded">
                      <span>CHECK IN CREATED</span>
                      <CheckCircle size={18} className="fill-white text-[#54c6a9] stroke-2" />
                    </div>

                    {/* Notice alert box */}
                    <div className="bg-emerald-50 border border-emerald-200/50 p-4 rounded text-xs font-semibold leading-relaxed text-emerald-800 shadow-sm flex flex-col sm:flex-row sm:justify-between items-start sm:items-center gap-2">
                      <span>
                        <span className="text-emerald-600 font-bold block sm:inline mr-1">Please Note:</span>
                        Check In of this booking has already been created.
                      </span>
                      <div className="flex gap-2 divide-x divide-emerald-300 font-bold">
                        <button 
                          type="button"
                          onClick={() => handlePrintAction('Check-In Card')} 
                          className="text-emerald-600 hover:text-emerald-800 transition-colors pl-0 pr-2 cursor-pointer bg-transparent border-0 font-bold"
                        >
                          Click Here To View Check In Card
                        </button>
                        <button 
                          type="button"
                          onClick={async () => {
                            const toastId = toast.loading('Sending check-in card email...');
                            try {
                              await api.patch(`/admin/bookings/${bookingId}`, { emailInvoiceToGuest: 'Yes' });
                              toast.success("Check-In Card marked as Emailed!", { id: toastId });
                              fetchDetails();
                              if (onRefresh) onRefresh();

                              const subject = encodeURIComponent(`Check-In Confirmation - ${hotelProfile?.name || 'Grand Hotel & Suites'}`);
                              const bodyText = `Hello ${b?.guestName || 'Valued Guest'},\n\nWe are pleased to confirm your check-in at ${hotelProfile?.name || 'our property'}!\n\nStay details:\nRoom Number: ${b?.roomId?.roomNumber || 'N/A'}\nCheck-In Date: ${formatDate(b?.checkInDate)}\nCheck-Out Date: ${formatDate(b?.checkOutDate)}\n\nBest regards,\n${hotelProfile?.name || 'Grand Hotel & Suites'} Management`;
                              const mailtoUrl = `mailto:${b?.guestEmail || ''}?subject=${subject}&body=${encodeURIComponent(bodyText)}`;
                              window.open(mailtoUrl, '_self');

                              setTimeout(() => {
                                handlePrintAction('Check-In Card');
                              }, 300);
                            } catch (e) {
                              toast.error('Failed to send check-in card: ' + e.message, { id: toastId });
                            }
                          }} 
                          className="text-emerald-600 hover:text-emerald-800 transition-colors pl-2 cursor-pointer bg-transparent border-0 font-bold"
                        >
                          Click Here To View Check In Card & Send Email
                        </button>
                      </div>
                    </div>

                    {/* Room Category Assigned Table */}
                    <div>
                      <h3 className="font-extrabold text-lg text-slate-800 mb-3 text-center tracking-tight font-sans">
                        Room Category Assigned
                      </h3>
                      
                      <div className="border border-slate-300 rounded overflow-hidden shadow-sm bg-white">
                        <table className="w-full text-xs text-left border-collapse">
                          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px] font-bold">
                            <tr>
                              <th className="p-3 w-10 text-center">#</th>
                              <th className="p-3 font-semibold">Category</th>
                              <th className="p-3 font-semibold">Assigned Room</th>
                              <th className="p-3 font-semibold">Change Room No</th>
                              <th className="p-3 font-semibold">Mark Room To</th>
                              <th className="p-3 text-center">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-medium">
                            {data?.groupBookings?.map((gb, index) => {
                              const categoryId = gb.roomId?.roomTypeId?._id || gb.roomId?.roomTypeId;
                              const categoryName = gb.roomId?.roomTypeId?.name || "Standard Room";
                              const roomNo = gb.roomId?.roomNumber || "TBD";
                              
                              const availableRooms = data.allRooms.filter(r => {
                                const rTypeId = r.roomTypeId?._id || r.roomTypeId;
                                return rTypeId?.toString() === categoryId?.toString();
                              });

                              return (
                                <tr key={gb._id} className="hover:bg-slate-50 transition-colors bg-white">
                                  <td className="p-3 text-center text-slate-400 font-bold">{index + 1}</td>
                                  <td className="p-3 text-slate-800 font-bold">{categoryName}</td>
                                  <td className="p-3 text-slate-600 font-bold">Room No: {roomNo}</td>
                                  <td className="p-3">
                                    <select
                                      value={selectedRoomsMap[gb._id] || gb.roomId?._id || ''}
                                      onChange={(e) => handleRoomChangeSelect(gb._id, e.target.value)}
                                      className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs font-bold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-sm font-sans"
                                    >
                                      <option value="">Change Room No</option>
                                      {availableRooms.map(r => (
                                        <option key={r._id} value={r._id}>
                                          {r.roomNumber} ({r.status})
                                        </option>
                                      ))}
                                    </select>
                                  </td>
                                  <td className="p-3">
                                    <select
                                      value={selectedStatusMap[gb._id] || gb.roomId?.status || 'occupied'}
                                      onChange={(e) => handleStatusChangeSelect(gb._id, e.target.value)}
                                      className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs font-bold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-sm font-sans"
                                    >
                                      <option value="available">Mark Room {roomNo} To: Available</option>
                                      <option value="occupied">Mark Room {roomNo} To: Occupied</option>
                                      <option value="cleaning">Mark Room {roomNo} To: Cleaning</option>
                                      <option value="maintenance">Mark Room {roomNo} To: Maintenance</option>
                                    </select>
                                  </td>
                                  <td className="p-3 text-center">
                                    <button
                                      onClick={() => executeChangeRoom(gb._id)}
                                      className="px-4 py-1.5 bg-[#8cb354] hover:bg-[#7ba343] text-white font-extrabold text-xs rounded transition-all active:scale-95 shadow-sm border border-[#7ba343]/20 cursor-pointer font-sans"
                                    >
                                      Change Room
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Remove Checkin Button */}
                    <div className="pt-2">
                      <button
                        onClick={handleRemoveCheckin}
                        className="px-4 py-2 bg-[#f4b41a] hover:bg-[#dfa010] text-[#1e293b] font-extrabold text-xs rounded transition-all shadow-sm active:scale-95 cursor-pointer font-sans"
                      >
                        Remove Checkin
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-5 text-slate-500 text-sm bg-slate-50 rounded border border-dashed border-slate-300">
                    Guest has not checked in yet.
                    <div className="mt-3">
                      <button 
                        onClick={async () => {
                          const toastId = toast.loading('Processing check-in...');
                          try {
                            const updates = [];
                            for (const gb of data.groupBookings) {
                              updates.push(
                                api.put(`/admin/bookings/${gb._id}/status`, { status: 'checked-in', paymentStatus: gb.paymentStatus })
                              );
                              if (gb.roomId?._id) {
                                updates.push(
                                  api.put(`/admin/rooms/${gb.roomId._id}/status`, { status: 'occupied' })
                                );
                              }
                            }
                            await Promise.all(updates);
                            toast.success('Guest checked in successfully!', { id: toastId });
                            await fetchDetails();
                            if (onRefresh) onRefresh();
                          } catch (error) {
                            toast.error('Failed to check in: ' + (error.response?.data?.message || error.message), { id: toastId });
                          }
                        }}
                        className="px-4 py-1.5 bg-blue-600 text-white font-bold text-xs rounded hover:bg-blue-700 transition-colors shadow-sm cursor-pointer"
                      >
                        Process Check-In
                      </button>
                    </div>
                  </div>
                )}
              </Accordion>

              <Accordion title="2. Extra Service" defaultOpen={true}>
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 font-sans">
                  
                  {/* Left Column - Add Extra Service Form */}
                  <div className="lg:col-span-5 bg-white border border-slate-300 rounded overflow-hidden shadow-sm">
                    <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 text-center font-bold text-slate-700 text-xs uppercase tracking-wider">
                      Add Extra Service
                    </div>
                    <form onSubmit={handleAddService} className="p-4 space-y-3.5">
                      <div className="flex flex-col">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Extra Service Name</label>
                        <input
                          type="text"
                          placeholder="Extra Service Name"
                          value={serviceForm.name}
                          onChange={e => setServiceForm(prev => ({ ...prev, name: e.target.value }))}
                          className="border border-slate-300 rounded px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        />
                      </div>
                      
                      <div className="flex flex-col">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Amount Without Tax</label>
                        <input
                          type="number"
                          placeholder="Amount Without Tax"
                          value={serviceForm.amountWithoutTax}
                          onChange={e => setServiceForm(prev => ({ ...prev, amountWithoutTax: e.target.value }))}
                          className="border border-slate-300 rounded px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Tax Name (If Any)</label>
                          <input
                            type="text"
                            placeholder="Tax Name (If Any)"
                            value={serviceForm.taxName}
                            onChange={e => setServiceForm(prev => ({ ...prev, taxName: e.target.value }))}
                            className="border border-slate-300 rounded px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                          />
                        </div>
                        <div className="flex flex-col">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Tax Amount (If Any)</label>
                          <input
                            type="number"
                            placeholder="Tax Amount (If Any)"
                            value={serviceForm.taxAmount}
                            onChange={e => setServiceForm(prev => ({ ...prev, taxAmount: e.target.value }))}
                            className="border border-slate-300 rounded px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                          />
                        </div>
                      </div>

                      <div className="flex flex-col">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Date</label>
                        <input
                          type="date"
                          value={serviceForm.date}
                          onChange={e => setServiceForm(prev => ({ ...prev, date: e.target.value }))}
                          className="border border-slate-300 rounded px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white cursor-pointer"
                        />
                      </div>

                      <div className="flex flex-col">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Reference Text</label>
                        <textarea
                          placeholder="Reference Text"
                          value={serviceForm.referenceText}
                          onChange={e => setServiceForm(prev => ({ ...prev, referenceText: e.target.value }))}
                          rows={3}
                          className="border border-slate-300 rounded px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white resize-none"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={isSavingService}
                        className="w-full py-2 bg-[#8cb354] hover:bg-[#7ba343] disabled:opacity-60 text-white font-extrabold text-xs rounded transition-all active:scale-95 shadow-sm border border-[#7ba343]/20 cursor-pointer text-center uppercase tracking-wider font-sans"
                      >
                        {isSavingService ? 'Adding...' : 'Add Extra Service'}
                      </button>
                    </form>
                  </div>

                  {/* Right Column - Added Extra Service Table */}
                  <div className="lg:col-span-7 bg-white border border-slate-300 rounded overflow-hidden shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 text-center font-bold text-slate-700 text-xs uppercase tracking-wider">
                        Added Extra Service
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left border-collapse">
                          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px] font-bold">
                            <tr>
                              <th className="p-3 w-8 text-center">#</th>
                              <th className="p-3 w-20">Date</th>
                              <th className="p-3">Service Name</th>
                              <th className="p-3 text-right">Amount</th>
                              <th className="p-3 text-center">Taxes</th>
                              <th className="p-3 text-right">Tax</th>
                              <th className="p-3 text-right">Discount</th>
                              <th className="p-3">Reference Text</th>
                              <th className="p-3 text-right">Grand Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-medium">
                            {s.length === 0 ? (
                              <tr>
                                <td colSpan="9" className="p-8 text-center text-slate-400 italic">
                                  No extra services added yet.
                                </td>
                              </tr>
                            ) : (
                              s.map((item, index) => {
                                const dateFormatted = item.date ? new Date(item.date).toLocaleDateString('en-GB') : '-';
                                return (
                                  <tr key={item._id || index} className="hover:bg-slate-50 transition-colors bg-white">
                                    <td className="p-3 text-center">
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteService(item._id)}
                                        className="text-red-500 hover:text-red-700 transition-colors p-1 bg-red-50 hover:bg-red-100 rounded-full inline-flex border border-red-200 cursor-pointer"
                                        title="Delete Service"
                                      >
                                        <X size={10} strokeWidth={3} />
                                      </button>
                                    </td>
                                    <td className="p-3 text-slate-500 whitespace-nowrap">{dateFormatted}</td>
                                    <td className="p-3 text-slate-800 font-bold max-w-[150px] truncate" title={item.name}>{item.name}</td>
                                    <td className="p-3 text-right text-slate-600 font-bold">₹{(item.amountWithoutTax || item.amount || 0).toFixed(2)}</td>
                                    <td className="p-3 text-center text-slate-500 font-bold">{item.taxName || 'N/A'}</td>
                                    <td className="p-3 text-right text-slate-600 font-bold">₹{(item.taxAmount || 0).toFixed(2)}</td>
                                    <td className="p-3 text-right text-slate-600 font-bold">₹{(item.discount || 0).toFixed(2)}</td>
                                    <td className="p-3 text-slate-400 max-w-[150px] truncate" title={item.referenceText}>{item.referenceText || '-'}</td>
                                    <td className="p-3 text-right text-slate-900 font-black">₹{(item.grandTotal || item.amount || 0).toFixed(2)}</td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    
                    {/* Bottom Summary Block */}
                    <div className="bg-slate-50 border-t border-slate-200 p-3 flex justify-between items-center font-bold text-xs uppercase tracking-wider text-slate-700">
                      <span>Total Amount</span>
                      <span className="text-sm font-black text-slate-900">
                        {formatCurrency(extraServicesTotal)}
                      </span>
                    </div>
                  </div>

                </div>
              </Accordion>

              <Accordion title="3. Payments Folio" defaultOpen={true}>
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 font-sans">
                  
                  {/* Left Column - Add Payment Folio Form */}
                  <div className="lg:col-span-5 bg-white border border-slate-300 rounded overflow-hidden shadow-sm">
                    <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 text-center font-bold text-slate-700 text-xs uppercase tracking-wider">
                      Add Payment Folio
                    </div>
                    <form onSubmit={handleAddPayment} className="p-4 space-y-3.5">
                      <div className="flex flex-col">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Payment Type</label>
                        <select
                          value={paymentForm.paymentType}
                          onChange={e => setPaymentForm(prev => ({ ...prev, paymentType: e.target.value }))}
                          className="border border-slate-300 rounded px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white cursor-pointer shadow-sm"
                        >
                          <option value="Bank Transfer">Bank Transfer</option>
                          <option value="Cash">Cash</option>
                          <option value="UPI">UPI</option>
                          <option value="Credit Card">Credit Card</option>
                          <option value="Bill To Company">Bill To Company</option>
                        </select>
                      </div>

                      <div className="flex flex-col">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Addition Type</label>
                        <select
                          value={paymentForm.additionType}
                          onChange={e => setPaymentForm(prev => ({ ...prev, additionType: e.target.value }))}
                          className="border border-slate-300 rounded px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white cursor-pointer shadow-sm"
                        >
                          <option value="Default">Default</option>
                          <option value="Refund">Refund</option>
                          <option value="Charge">Charge</option>
                        </select>
                      </div>

                      <div className="flex flex-col">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Amount</label>
                        <input
                          type="number"
                          placeholder="Amount"
                          value={paymentForm.amount}
                          onChange={e => setPaymentForm(prev => ({ ...prev, amount: e.target.value }))}
                          className="border border-slate-300 rounded px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm"
                        />
                      </div>

                      <div className="flex flex-col">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Payment Date</label>
                        <input
                          type="date"
                          value={paymentForm.paymentDate}
                          onChange={e => setPaymentForm(prev => ({ ...prev, paymentDate: e.target.value }))}
                          className="border border-slate-300 rounded px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white cursor-pointer shadow-sm"
                        />
                      </div>

                      <div className="flex flex-col">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Reference Text</label>
                        <textarea
                          placeholder="Reference Text"
                          value={paymentForm.referenceText}
                          onChange={e => setPaymentForm(prev => ({ ...prev, referenceText: e.target.value }))}
                          rows={3}
                          className="border border-slate-300 rounded px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white resize-none shadow-sm"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={isSavingPayment}
                        className="w-full py-2 bg-[#8cb354] hover:bg-[#7ba343] disabled:opacity-60 text-white font-extrabold text-xs rounded transition-all active:scale-95 shadow-sm border border-[#7ba343]/20 cursor-pointer text-center uppercase tracking-wider font-sans"
                      >
                        {isSavingPayment ? 'Adding...' : 'Add Payment Folio'}
                      </button>
                    </form>
                  </div>

                  {/* Right Column - Received Payment Table */}
                  <div className="lg:col-span-7 bg-white border border-slate-300 rounded overflow-hidden shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 text-center font-bold text-slate-700 text-xs uppercase tracking-wider">
                        Received Payment
                      </div>
                      {data?.payments?.some(p => 
                        p.referenceText === 'Initial Payment (From Reservation)' || 
                        p.referenceText === 'Initial Booking Payment' || 
                        p.referenceText === 'Payment Received During Booking'
                      ) && (
                        <div className="bg-blue-50 border-b border-slate-200 px-4 py-2.5 text-[11px] font-semibold text-blue-800 leading-relaxed">
                          <span className="text-blue-600 font-extrabold mr-1">ℹ️ Info:</span> 
                          The ledger entry marked as <strong>"Initial Payment (From Reservation)"</strong> is automatically created to reflect the payment made during booking creation.
                        </div>
                      )}
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left border-collapse">
                          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px] font-bold">
                            <tr>
                              <th className="p-3 w-8 text-center">#</th>
                              <th className="p-3">Added On</th>
                              <th className="p-3">Payment Type</th>
                              <th className="p-3">Payment Date</th>
                              <th className="p-3">Reference Text</th>
                              <th className="p-3 text-right">Amount</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-medium">
                            {(!data?.payments || data.payments.length === 0) ? (
                              <tr>
                                <td colSpan="6" className="p-8 text-center text-slate-400 italic">
                                  No payments received yet.
                                </td>
                              </tr>
                            ) : (
                              data.payments.map((p, index) => {
                                const addedOnFormatted = p.addedOn ? new Date(p.addedOn).toLocaleDateString('en-GB') : (p.date ? new Date(p.date).toLocaleDateString('en-GB') : '-');
                                const paymentDateFormatted = p.paymentDate ? new Date(p.paymentDate).toLocaleDateString('en-GB') : (p.date ? new Date(p.date).toLocaleDateString('en-GB') : '-');
                                const isRefund = p.additionType === 'Refund';
                                const displayAmt = isRefund ? -Number(p.amount) : Number(p.amount);
                                const rawRef = p.referenceText || '';
                                const displayRef = (rawRef.toLowerCase().includes('initial') || rawRef.toLowerCase().includes('legacy'))
                                  ? 'Initial Payment (From Reservation)'
                                  : (rawRef || '-');
                                return (
                                  <tr key={p._id || index} className="hover:bg-slate-50 transition-colors bg-white">
                                    <td className="p-3 text-center">
                                      <button
                                        type="button"
                                        onClick={() => handleDeletePayment(p._id)}
                                        className="text-red-500 hover:text-red-700 transition-colors p-1 bg-red-50 hover:bg-red-100 rounded-full inline-flex border border-red-200 cursor-pointer"
                                        title="Delete Payment"
                                      >
                                        <X size={10} strokeWidth={3} />
                                      </button>
                                    </td>
                                    <td className="p-3 text-slate-500 whitespace-nowrap">{addedOnFormatted}</td>
                                    <td className="p-3 text-slate-800 font-bold max-w-[120px] truncate">
                                      {p.paymentType || p.method} {isRefund && <span className="text-[10px] text-red-500 font-normal">(Refund)</span>}
                                    </td>
                                    <td className="p-3 text-slate-500 whitespace-nowrap">{paymentDateFormatted}</td>
                                    <td className="p-3 text-slate-400 max-w-[150px] truncate" title={displayRef}>{displayRef}</td>
                                    <td className={`p-3 text-right font-black ${isRefund ? 'text-red-600' : 'text-slate-900'}`}>
                                      ₹{displayAmt.toFixed(2)}
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Bottom Summary Block */}
                    <div className="bg-slate-50 border-t border-slate-200 p-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 font-bold text-xs uppercase tracking-wider text-slate-700">
                      <div className="flex flex-col">
                        <span>Total Received Amount {data?.groupBookings?.length > 1 ? '(Group)' : ''}</span>
                        {data?.groupBookings?.length > 1 && (
                          <span className="text-[10px] text-slate-400 font-medium normal-case mt-0.5">
                            This Room's Portion: {formatCurrency(b?.paidAmount)}
                          </span>
                        )}
                      </div>
                      <span className="text-sm font-black text-green-600">
                        {formatCurrency(data?.groupBookings?.length > 1 
                          ? data.payments?.reduce((sum, p) => p.additionType === 'Refund' ? sum - (p.amount || 0) : sum + (p.amount || 0), 0)
                          : b?.paidAmount
                        )}
                      </span>
                    </div>
                  </div>

                </div>
              </Accordion>

              <Accordion 
                title="4. Check Out Created" 
                defaultOpen={b?.status === 'checked-out'}
                badge={data?.checkOutDetails ? <CheckCircle size={14} className="text-purple-500"/> : null}
              >
                {data?.checkOutDetails ? (
                  <div className="text-sm space-y-4 font-sans">
                    {/* Purple CHECK OUT CREATED Accent Header */}
                    <div className="bg-[#9333ea] text-white px-4 py-3 flex justify-between items-center font-bold text-sm shadow-sm tracking-wide rounded">
                      <span>CHECK OUT CREATED</span>
                      <CheckCircle size={18} className="fill-white text-[#9333ea] stroke-2" />
                    </div>

                    {/* Notice alert box */}
                    <div className="bg-purple-50 border border-purple-200/50 p-4 rounded text-xs font-semibold leading-relaxed text-purple-800 shadow-sm flex flex-col sm:flex-row sm:justify-between items-start sm:items-center gap-2">
                      <span>
                        <span className="text-purple-600 font-bold block sm:inline mr-1">Please Note:</span>
                        Check Out of this booking has been created
                      </span>
                      <div className="flex gap-2 divide-x divide-purple-200 font-bold">
                        <button 
                          type="button"
                          onClick={() => {
                            toast.success("Opening Guest Invoice...");
                            handlePrintAction('Guest Invoice');
                          }} 
                          className="text-purple-700 hover:text-purple-900 transition-colors pl-0 pr-2 cursor-pointer font-bold bg-transparent border-0"
                        >
                          Click Here To View Guest Invoice
                        </button>
                        <button 
                          type="button"
                          onClick={() => {
                            toast.success("Opening Property Invoice...");
                            handlePrintAction('Property Invoice');
                          }} 
                          className="text-purple-700 hover:text-purple-900 transition-colors px-2 cursor-pointer font-bold bg-transparent border-0"
                        >
                          Click Here To View Property Invoice
                        </button>
                        <button 
                          type="button"
                          onClick={handlePrintAndEmailAction} 
                          className="text-purple-700 hover:text-purple-900 transition-colors pl-2 cursor-pointer font-bold bg-transparent border-0"
                        >
                          Click Here To View Guest Invoice & Send Email
                        </button>
                      </div>
                    </div>

                    {/* Checkout Details Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 p-4 bg-slate-50 border border-slate-200 rounded">
                      <div>
                        <span className="text-slate-500 block text-[10px] font-bold uppercase tracking-wider mb-0.5">Departure Date & Time</span>
                        <span className="font-bold text-slate-800">{formatDateTime(data.checkOutDetails.time)}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px] font-bold uppercase tracking-wider mb-0.5">On Duty Manager</span>
                        <span className="font-bold text-slate-800">{data.checkOutDetails.onDutyManager}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px] font-bold uppercase tracking-wider mb-0.5">Settlement Status</span>
                        <span className={`font-black ${data.checkOutDetails.settlementStatus === 'Settled' ? 'text-green-600' : 'text-red-600'}`}>
                          {data.checkOutDetails.settlementStatus || 'N/A'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px] font-bold uppercase tracking-wider mb-0.5">Invoice Emailed</span>
                        <span className="font-bold text-slate-800">{data.checkOutDetails.emailInvoiceToGuest}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm font-sans space-y-4">
                    {/* Header bar: CREATE CHECK OUT */}
                    <div className="bg-[#f3e8ff] border border-[#e9d5ff] border-b-0 px-4 py-2 font-bold text-purple-900 text-xs uppercase tracking-wider rounded-t">
                      CREATE CHECK OUT
                    </div>

                    {/* PRE Check Out Summary button */}
                    <button 
                      type="button"
                      onClick={() => {
                        toast.success("Generating PRE Check Out Summary...");
                        handlePrintAction('Pre Check-Out Summary');
                      }}
                      className="w-full py-2 bg-[#8b5cf6] hover:bg-[#7c3aed] text-white font-extrabold text-xs rounded transition-all active:scale-95 shadow-sm text-center uppercase tracking-wider cursor-pointer border-0 font-sans"
                    >
                      Click Here To Generate PRE Check Out Summary
                    </button>

                    {/* Check Out Form fields grid */}
                    <form onSubmit={handleProcessCheckout} className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                        
                        <div className="flex flex-col">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Have GST</label>
                          <select
                            value={checkoutForm.haveGst}
                            onChange={e => setCheckoutForm(prev => ({ ...prev, haveGst: e.target.value }))}
                            className="border border-slate-300 rounded px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white cursor-pointer shadow-sm"
                          >
                            <option value="Yes">Yes</option>
                            <option value="No">No</option>
                          </select>
                        </div>

                        <div className="flex flex-col">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">On Duty Manager *</label>
                          <input
                            type="text"
                            required
                            placeholder="Duty Manager Name"
                            value={checkoutForm.onDutyManager}
                            onChange={e => setCheckoutForm(prev => ({ ...prev, onDutyManager: e.target.value }))}
                            className="border border-slate-300 rounded px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm"
                          />
                        </div>

                        <div className="flex flex-col">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Departure Date & Time *</label>
                          <input
                            type="datetime-local"
                            required
                            value={checkoutForm.departureDateTime}
                            onChange={e => setCheckoutForm(prev => ({ ...prev, departureDateTime: e.target.value }))}
                            className="border border-slate-300 rounded px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white cursor-pointer shadow-sm"
                          />
                        </div>

                        <div className="flex flex-col">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Special Comment</label>
                          <input
                            type="text"
                            placeholder="Special Comment"
                            value={checkoutForm.checkoutComment}
                            onChange={e => setCheckoutForm(prev => ({ ...prev, checkoutComment: e.target.value }))}
                            className="border border-slate-300 rounded px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm"
                          />
                        </div>

                        <div className="flex flex-col">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Mark Room(s) To</label>
                          <select
                            value={checkoutForm.markRoomTo}
                            onChange={e => setCheckoutForm(prev => ({ ...prev, markRoomTo: e.target.value }))}
                            className="border border-slate-300 rounded px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white cursor-pointer shadow-sm"
                          >
                            <option value="Dirty">Dirty</option>
                            <option value="Available">Available</option>
                            <option value="Cleaning">Cleaning</option>
                            <option value="Maintenance">Maintenance</option>
                          </select>
                        </div>

                        <div className="flex flex-col">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Email Invoice To Guest</label>
                          <select
                            value={checkoutForm.emailInvoiceToGuest}
                            onChange={e => setCheckoutForm(prev => ({ ...prev, emailInvoiceToGuest: e.target.value }))}
                            className="border border-slate-300 rounded px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white cursor-pointer shadow-sm"
                          >
                            <option value="Yes">Yes</option>
                            <option value="No">No</option>
                          </select>
                        </div>

                      </div>

                      {/* Dynamic Pending Balance Warning Alert box */}
                      {b?.pendingAmount > 0 && (
                        <div className="bg-red-50 border border-red-200 p-3.5 rounded text-xs font-semibold leading-relaxed text-red-800 shadow-sm flex items-center gap-2">
                          <span>
                            <span className="text-red-600 font-bold block sm:inline mr-1">Please Note:</span>
                            Amount of {formatCurrency(b.pendingAmount)} is still pending please get this settled to generate an invoice.
                          </span>
                        </div>
                      )}

                      {/* Process Check-Out button */}
                      <div className="pt-2 flex justify-start">
                        <button
                          type="submit"
                          disabled={isSavingCheckout}
                          className="px-6 py-2.5 bg-[#8cb354] hover:bg-[#7ba343] disabled:opacity-60 text-white font-extrabold text-xs rounded uppercase tracking-wider shadow-sm transition-all active:scale-95 cursor-pointer font-sans border border-[#7ba343]/20"
                        >
                          {isSavingCheckout ? 'Processing...' : 'Process Check-Out'}
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </Accordion>

            </div>
          )}
        </div>
        </div>
      </div>

      {/* Hidden Voucher for Print Generation */}
      {data && (
        <BookingVoucher 
          ref={printVoucherRef}
          bookingId={b?._id}
          guestDetails={{
            guestName: b?.guestName || '',
            guestContact: b?.guestContact || '',
            email: b?.guestEmail || '',
            bookingSource: b?.bookingSource || 'Direct',
            sourceType: 'Direct',
            companyName: b?.companyName || '',
            companyGst: b?.companyGst || '',
            companyAddress: b?.companyAddress || '',
            specialNote: b?.specialRequests || b?.internalNotes || ''
          }}
          paymentDetails={{
            paymentMode: b?.paymentMode || 'Prepaid',
            amountPaid: b?.paidAmount || 0,
            internalNotes: b?.internalNotes || ''
          }}
          selectedRooms={data?.groupBookings?.map(gb => ({
            roomNumber: gb.roomId?.roomNumber || 'N/A',
            categoryName: gb.roomId?.roomTypeId?.name || gb.roomId?.categoryName || 'N/A',
            adults: gb.adults || 2,
            children: gb.children || 0,
            infant: gb.infant || 0,
            mealPlan: gb.mealPlan || 'Room Only',
            baseCost: gb.cost || 0,
            gst: gb.gst || 0,
            total: (gb.cost || 0) + (gb.gst || 0)
          })) || []}
          dates={{
            checkIn: b?.checkInDate || new Date().toISOString(),
            checkOut: b?.checkOutDate || new Date().toISOString()
          }}
          totalNetCost={data?.groupBookings?.reduce((sum, gb) => sum + (gb.cost || 0), 0) || 0}
          totalGST={data?.groupBookings?.reduce((sum, gb) => sum + (gb.gst || 0), 0) || 0}
          totalDiscount={data?.groupBookings?.reduce((sum, gb) => sum + (gb.discount || 0), 0) || 0}
          payableAmount={b?.totalAmount || 0}
          hotelProfile={hotelProfile}
          title={printTitle}
          extraServices={s}
        />
      )}
    </>
  );
};

export default BookingDetailsDrawer;
