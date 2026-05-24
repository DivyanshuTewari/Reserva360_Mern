import React, { useState, useEffect, useRef } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { Plus, X, Search, ChevronDown, ChevronRight, CreditCard, User, CalendarDays, Download, Printer, Trash2, Ban } from 'lucide-react';
import DatePicker from '../ui/DatePicker';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import BookingVoucher from './BookingVoucher';

const BookingEngine = () => {
  const [bookings, setBookings] = useState([]);
  const [roomTypes, setRoomTypes] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [ratePlans, setRatePlans] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [showModal, setShowModal] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState([]);
  
  // Stepper state
  const [currentStep, setCurrentStep] = useState(1); // 1: Rooms & Billing, 2: Guest Details, 3: Payment, 4: Confirmation
  const [isSavingStep, setIsSavingStep] = useState(false);

  // Redesigned Room Table Discount & Edit States
  const [discountInput, setDiscountInput] = useState(0);
  const [discountTypeInput, setDiscountTypeInput] = useState('percent');
  const [totalDiscount, setTotalDiscount] = useState(0);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingBooking, setEditingBooking] = useState(null);
  const syncTimeoutRef = useRef(null);

  const debounceSyncBooking = (bookingData) => {
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }
    
    syncTimeoutRef.current = setTimeout(async () => {
      try {
        await api.patch(`/admin/bookings/${bookingData._id}`, {
          adults: bookingData.adults,
          children: bookingData.children,
          infant: bookingData.infant,
          mealPlan: bookingData.mealPlan,
          cost: bookingData.cost,
          gst: bookingData.gst,
          discount: bookingData.discount,
          discountType: bookingData.discountType,
          discountValue: bookingData.discountValue,
          totalAmount: bookingData.totalAmount,
          gstMode: bookingData.gstMode
        });
        toast.success('Synced changes with database successfully');
      } catch (error) {
        toast.error('Sync failed: ' + (error.response?.data?.message || error.message));
      }
    }, 800); // 800ms debounce
  };

  const handleEditFieldChange = (field, value) => {
    if (!editingBooking) return;
    
    setEditingBooking(prev => {
      const updated = { ...prev, [field]: value };
      const mode = updated.gstMode || 'exclusive';
      
      const cost = Number(updated.cost || 0);
      let gst = Number(updated.gst || 0);
      let total = Number(updated.totalAmount || 0);
      
      if (field === 'cost') {
        const val = Math.max(0, value);
        updated.cost = val;
        if (mode === 'inclusive' || mode === 'exclusive') {
          updated.gst = val * 0.18;
          updated.totalAmount = val + updated.gst;
        } else {
          updated.gst = 0;
          updated.totalAmount = val;
        }
      } else if (field === 'gst') {
        const val = Math.max(0, value);
        updated.gst = val;
        updated.totalAmount = updated.cost + val;
      } else if (field === 'totalAmount') {
        const val = Math.max(0, value);
        updated.totalAmount = val;
        if (mode === 'inclusive' || mode === 'exclusive') {
          updated.cost = val / 1.18;
          updated.gst = val - updated.cost;
        } else {
          updated.cost = val;
          updated.gst = 0;
        }
      } else if (field === 'discountValue' || field === 'discountType') {
        const discVal = field === 'discountValue' ? value : updated.discountValue || 0;
        const discType = field === 'discountType' ? value : updated.discountType || 'flat';
        const subtotal = updated.cost + updated.gst;
        let discAmount = 0;
        if (discType === 'percent') {
          discAmount = subtotal * (discVal / 100);
        } else {
          discAmount = discVal;
        }
        updated.discount = Math.min(subtotal, discAmount);
      }
      
      debounceSyncBooking(updated);
      return updated;
    });
  };

  const handleEditGstModeChange = (mode) => {
    setEditingBooking(prev => {
      if (!prev) return null;
      
      const updated = { ...prev, gstMode: mode };
      const cost = Number(updated.cost || 0);
      const gst = Number(updated.gst || 0);
      const total = Number(updated.totalAmount || 0);
      
      if (mode === 'inclusive') {
        const currentTotal = total > 0 ? total : cost;
        updated.cost = currentTotal / 1.18;
        updated.gst = currentTotal - updated.cost;
        updated.totalAmount = currentTotal;
      } else if (mode === 'exclusive') {
        const currentCost = cost > 0 ? cost : total / 1.18;
        updated.cost = currentCost;
        updated.gst = currentCost * 0.18;
        updated.totalAmount = currentCost + updated.gst;
      } else if (mode === 'out_of_scope') {
        const currentCost = cost > 0 ? cost : total;
        updated.cost = currentCost;
        updated.gst = 0;
        updated.totalAmount = currentCost;
      }
      
      debounceSyncBooking(updated);
      return updated;
    });
  };

  // Form State
  const [dates, setDates] = useState({
    checkIn: new Date().toISOString().split('T')[0],
    checkOut: new Date(Date.now() + 86400000).toISOString().split('T')[0]
  });

  const [selectedRooms, setSelectedRooms] = useState([]); 
  // { categoryId, roomId, adults, children, infants, ratePlanId, baseCost, gst, total }
  const [currentBookingId, setCurrentBookingId] = useState('');
  const voucherRef = useRef(null);

  const handleDownloadPDF = async () => {
    if (!voucherRef.current) return;
    const toastId = toast.loading('Generating PDF...');
    try {
      const element = voucherRef.current;
      const canvas = await html2canvas(element, { scale: 2, useCORS: true });
      const data = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProperties = pdf.getImageProperties(data);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProperties.height * pdfWidth) / imgProperties.width;
      
      pdf.addImage(data, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`BOOKING-${currentBookingId}.pdf`);
      toast.success('Voucher Downloaded Successfully', { id: toastId });
    } catch (error) {
      toast.error(`Failed to generate PDF: ${error.message || 'Unknown error'}`, { id: toastId });
      console.error(error);
    }
  };

  const handlePrintVoucher = () => {
    window.print();
  };

  const [gstMode, setGstMode] = useState('exclusive'); // 'inclusive', 'exclusive', 'out_of_scope'

  const recalculateGstForMode = (roomsList, mode) => {
    return roomsList.map(r => {
      const updated = { ...r };
      const cost = Number(updated.baseCost || 0);
      const gst = Number(updated.gst || 0);
      const total = Number(updated.total || 0);
      
      if (mode === 'inclusive') {
        const currentTotal = total > 0 ? total : cost;
        updated.baseCost = currentTotal / 1.18;
        updated.gst = currentTotal - updated.baseCost;
        updated.total = currentTotal;
      } else if (mode === 'exclusive') {
        const currentCost = cost > 0 ? cost : total / 1.18;
        updated.baseCost = currentCost;
        updated.gst = currentCost * 0.18;
        updated.total = currentCost + updated.gst;
      } else if (mode === 'out_of_scope') {
        const currentCost = cost > 0 ? cost : total;
        updated.baseCost = currentCost;
        updated.gst = 0;
        updated.total = currentCost;
      }
      return updated;
    });
  };

  const handleGstModeChange = (mode) => {
    setGstMode(mode);
    setSelectedRooms(prev => recalculateGstForMode(prev, mode));
  };

  const [guestDetails, setGuestDetails] = useState({
    bookingSource: 'Direct',
    sourceType: '',
    guestName: '',
    guestContact: '',
    guestDob: '',
    guestCountry: 'India',
    guestState: '',
    guestCity: '',
    email: '',
    address: '',
    idType: 'Aadhaar Card',
    idNumber: '',
    nationality: 'Indian',
    companyName: '',
    companyGst: '',
    companyAddress: '',
    arrivalTime: '12:00',
    specialNote: ''
  });

  const [paymentDetails, setPaymentDetails] = useState({
    paymentMode: 'Prepaid',
    paymentMethod: 'Cash',
    amountPaid: 0,
    paymentReference: '',
    internalNotes: '',
    status: 'pending'
  });

  useEffect(() => {
    fetchData();
  }, []);

  // Recalculate cost for selected rooms when dates change
  useEffect(() => {
    if (selectedRooms.length === 0) return;
    
    const days = Math.max(1, Math.ceil((new Date(dates.checkOut) - new Date(dates.checkIn)) / (1000 * 60 * 60 * 24)));
    
    setSelectedRooms(prev => prev.map(room => {
      const plan = ratePlans.find(p => p._id === room.ratePlanId);
      const category = roomTypes.find(c => c._id === room.categoryId);
      const rate = (plan?.price || category?.basePrice || 0) * days;
      
      let baseCost = rate;
      let gst = rate * 0.18;
      let total = rate + gst;
      
      if (gstMode === 'inclusive') {
        baseCost = rate / 1.18;
        gst = rate - baseCost;
        total = rate;
      } else if (gstMode === 'out_of_scope') {
        baseCost = rate;
        gst = 0;
        total = rate;
      }
      
      return {
        ...room,
        baseCost,
        gst,
        total
      };
    }));
  }, [dates.checkIn, dates.checkOut, ratePlans, roomTypes, gstMode]);

  const fetchData = async () => {
    try {
      const [bookingsRes, typesRes, roomsRes, ratesRes] = await Promise.all([
        api.get('/admin/bookings'),
        api.get('/admin/room-types'),
        api.get('/admin/rooms'),
        api.get('/admin/rate-plans')
      ]);
      setBookings(bookingsRes.data);
      setRoomTypes(typesRes.data);
      setRooms(roomsRes.data);
      setRatePlans(ratesRes.data);
    } catch (error) {
      toast.error('Failed to load booking engine data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoomSelect = (categoryId, roomId) => {
    if (!roomId) return;
    
    // Check if already selected
    if (selectedRooms.find(r => r.roomId === roomId)) return;

    const room = rooms.find(r => r._id === roomId);
    const category = roomTypes.find(c => c._id === categoryId);
    
    // Default rate plan (first available for this category)
    const availablePlans = ratePlans.filter(p => p.roomTypeId?._id === categoryId || p.roomTypeId === categoryId);
    const defaultPlan = availablePlans[0];
    
    const days = Math.max(1, Math.ceil((new Date(dates.checkOut) - new Date(dates.checkIn)) / (1000 * 60 * 60 * 24)));
    const rate = (defaultPlan?.price || category?.basePrice || 0) * days;
    
    let baseCost = rate;
    let gst = rate * 0.18;
    let total = rate + gst;
    
    if (gstMode === 'inclusive') {
      baseCost = rate / 1.18;
      gst = rate - baseCost;
      total = rate;
    } else if (gstMode === 'out_of_scope') {
      baseCost = rate;
      gst = 0;
      total = rate;
    }

    setSelectedRooms([...selectedRooms, {
      categoryId,
      roomId,
      roomNumber: room.roomNumber,
      categoryName: category.name,
      adults: 2,
      children: 0,
      infant: 0,
      ratePlanId: defaultPlan?._id || '',
      baseCost,
      gst,
      total
    }]);
  };

  const removeSelectedRoom = (roomId) => {
    setSelectedRooms(selectedRooms.filter(r => r.roomId !== roomId));
  };

  const updateSelectedRoom = (roomId, field, value) => {
    setSelectedRooms(selectedRooms.map(r => {
      if (r.roomId === roomId) {
        const updated = { ...r };
        
        if (field === 'adults') {
          updated.adults = Math.max(1, value);
        } else if (field === 'children') {
          updated.children = Math.max(0, value);
        } else if (field === 'infant') {
          updated.infant = Math.max(0, value);
        } else if (field === 'ratePlanId') {
          updated.ratePlanId = value;
          const plan = ratePlans.find(p => p._id === value);
          const days = Math.max(1, Math.ceil((new Date(dates.checkOut) - new Date(dates.checkIn)) / (1000 * 60 * 60 * 24)));
          const rate = Math.max(0, (plan?.price || 0) * days);
          if (gstMode === 'inclusive') {
            updated.baseCost = rate / 1.18;
            updated.gst = rate - updated.baseCost;
            updated.total = rate;
          } else if (gstMode === 'out_of_scope') {
            updated.baseCost = rate;
            updated.gst = 0;
            updated.total = rate;
          } else {
            updated.baseCost = rate;
            updated.gst = rate * 0.18;
            updated.total = rate + updated.gst;
          }
        } else if (field === 'customCost') {
          const val = Math.max(0, value);
          updated.baseCost = val;
          if (gstMode === 'inclusive' || gstMode === 'exclusive') {
            updated.gst = val * 0.18;
            updated.total = val + updated.gst;
          } else {
            updated.gst = 0;
            updated.total = val;
          }
        } else if (field === 'customGst') {
          updated.gst = Math.max(0, value);
          updated.total = updated.baseCost + updated.gst;
        } else if (field === 'customTotal') {
          const val = Math.max(0, value);
          updated.total = val;
          if (gstMode === 'inclusive' || gstMode === 'exclusive') {
            updated.baseCost = val / 1.18;
            updated.gst = val - updated.baseCost;
          } else {
            updated.baseCost = val;
            updated.gst = 0;
          }
        }
        
        return updated;
      }
      return r;
    }));
  };

  const applyDiscount = () => {
    let discAmount = 0;
    const subtotal = totalNetCost + totalGST;
    if (discountTypeInput === 'percent') {
      discAmount = subtotal * (discountInput / 100);
    } else {
      discAmount = discountInput;
    }
    setTotalDiscount(Math.max(0, Math.min(subtotal, discAmount)));
    toast.success('Discount applied successfully');
  };

  // Calculations
  const totalNetCost = selectedRooms.reduce((acc, curr) => acc + curr.baseCost, 0);
  const totalGST = selectedRooms.reduce((acc, curr) => acc + curr.gst, 0);
  const payableAmount = Math.max(0, (totalNetCost + totalGST) - totalDiscount);

  const groupedBookings = Object.values(bookings.reduce((acc, b) => {
    const key = b.bookingGroupId || b._id;
    if (!acc[key]) {
      acc[key] = {
        groupId: key,
        guestName: b.guestName,
        guestContact: b.guestContact,
        checkInDate: b.checkInDate,
        checkOutDate: b.checkOutDate,
        totalAmount: 0,
        rooms: [],
        status: b.status,
        paymentStatus: b.paymentStatus
      };
    }
    acc[key].totalAmount += b.totalAmount;
    acc[key].rooms.push(b);
    return acc;
  }, {}));

  const toggleGroup = (groupId) => {
    setExpandedGroups(prev => prev.includes(groupId) ? prev.filter(id => id !== groupId) : [...prev, groupId]);
  };

  const handleSubmit = async () => {
    if (selectedRooms.length === 0) return toast.error('Please select at least one room');
    if (!guestDetails.guestName || !guestDetails.guestContact) return toast.error('Please provide guest details');

    setIsSavingStep(true);
    try {
      const bookingGroupId = Date.now().toString();
      for (const room of selectedRooms) {
        await api.post('/admin/bookings', {
          roomId: room.roomId,
          guestName: guestDetails.guestName,
          guestContact: guestDetails.guestContact,
          guestEmail: guestDetails.email,
          guestAddress: guestDetails.address,
          guestDob: guestDetails.guestDob,
          guestCountry: guestDetails.guestCountry,
          guestState: guestDetails.guestState,
          guestCity: guestDetails.guestCity,
          companyName: guestDetails.companyName,
          companyGst: guestDetails.companyGst,
          companyAddress: guestDetails.companyAddress,
          idProofType: guestDetails.idType,
          idProofNumber: guestDetails.idNumber,
          nationality: guestDetails.nationality,
          arrivalTime: guestDetails.arrivalTime,
          specialRequests: guestDetails.specialNote,
          checkInDate: dates.checkIn,
          checkOutDate: dates.checkOut,
          totalAmount: room.total,
          status: 'confirmed',
          paymentStatus: paymentDetails.status,
          paymentMode: paymentDetails.paymentMode,
          paymentMethod: paymentDetails.paymentMethod,
          paymentReference: paymentDetails.paymentReference,
          internalNotes: paymentDetails.internalNotes,
          paidAmount: paymentDetails.amountPaid,
          pendingAmount: Math.max(0, payableAmount - paymentDetails.amountPaid),
          bookingGroupId,
          adults: room.adults || 2,
          children: room.children || 0,
          infant: room.infant || 0,
          mealPlan: ratePlans.find(p => p._id === room.ratePlanId)?.planName || 'Room Only',
          cost: room.baseCost,
          gst: room.gst,
          discount: totalDiscount / selectedRooms.length,
          gstMode: gstMode
        });
      }
      
      toast.success('Reservation(s) created successfully');
      setCurrentBookingId(bookingGroupId);
      setCurrentStep(4);
      fetchData();
    } catch (error) {
      toast.error('Failed to create booking: ' + (error.response?.data?.message || error.message));
      console.error(error);
    } finally {
      setIsSavingStep(false);
    }
  };

  const handleCancelGroup = async (e, group) => {
    e.stopPropagation();
    if(!window.confirm(`Are you sure you want to cancel the booking for ${group.guestName}?`)) return;
    try {
      for (const room of group.rooms) {
        await api.put(`/admin/bookings/${room._id}/status`, { status: 'cancelled' });
      }
      toast.success('Booking cancelled successfully');
      fetchData();
    } catch (error) {
      toast.error('Failed to cancel booking');
    }
  };

  const handleDeleteGroup = async (e, group) => {
    e.stopPropagation();
    if(!window.confirm(`Are you sure you want to permanently delete the booking for ${group.guestName}?`)) return;
    try {
      for (const room of group.rooms) {
        await api.delete(`/admin/bookings/${room._id}`);
      }
      toast.success('Booking deleted successfully');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete booking');
    }
  };

  const [downloadVoucherData, setDownloadVoucherData] = useState(null);
  const listVoucherRef = useRef(null);
  
  const handleDownloadListVoucher = (e, group) => {
    e.stopPropagation();
    const firstRoom = group.rooms[0];
    
    setDownloadVoucherData({
      bookingId: group.groupId,
      guestDetails: {
        guestName: group.guestName,
        guestContact: group.guestContact,
        email: firstRoom?.guestEmail || '',
        bookingSource: firstRoom?.bookingSource || 'Direct',
        sourceType: firstRoom?.sourceType || '',
        companyName: firstRoom?.companyName || '',
        companyGst: firstRoom?.companyGst || '',
        companyAddress: firstRoom?.companyAddress || '',
        specialNote: firstRoom?.specialRequests || ''
      },
      paymentDetails: {
        paymentMode: firstRoom?.paymentMode || 'Prepaid',
        amountPaid: firstRoom?.paidAmount || 0,
        internalNotes: firstRoom?.internalNotes || ''
      },
      selectedRooms: group.rooms.map((r) => ({
        roomNumber: r.roomId?.roomNumber || 'TBD',
        categoryName: r.roomId?.roomTypeId?.name || 'Standard',
        adults: r.adults || 2,
        children: r.children || 0,
        infant: r.infant || 0,
        mealPlan: r.mealPlan || 'Room Only',
        baseCost: r.cost || 0,
        gst: r.gst || 0,
        total: r.totalAmount || 0
      })),
      dates: {
        checkIn: group.checkInDate,
        checkOut: group.checkOutDate
      },
      totalNetCost: group.rooms.reduce((s, r) => s + (r.cost || 0), 0),
      totalGST: group.rooms.reduce((s, r) => s + (r.gst || 0), 0),
      totalDiscount: group.rooms.reduce((s, r) => s + (r.discount || 0), 0),
      payableAmount: group.totalAmount
    });
  };

  useEffect(() => {
    if (downloadVoucherData && listVoucherRef.current) {
      const generatePDF = async () => {
        const toastId = toast.loading('Generating PDF...');
        try {
          const element = listVoucherRef.current;
          const canvas = await html2canvas(element, { scale: 2, useCORS: true });
          const data = canvas.toDataURL('image/png');
          const pdf = new jsPDF('p', 'mm', 'a4');
          const imgProperties = pdf.getImageProperties(data);
          const pdfWidth = pdf.internal.pageSize.getWidth();
          const pdfHeight = (imgProperties.height * pdfWidth) / imgProperties.width;
          
          pdf.addImage(data, 'PNG', 0, 0, pdfWidth, pdfHeight);
          pdf.save(`BOOKING-${downloadVoucherData.bookingId}.pdf`);
          toast.success('Voucher Downloaded Successfully', { id: toastId });
        } catch (error) {
          toast.error(`Failed to generate PDF: ${error.message || 'Unknown error'}`, { id: toastId });
        } finally {
          setDownloadVoucherData(null);
        }
      };
      // Timeout needed to allow React to render the voucher to the DOM before html2canvas captures it
      setTimeout(generatePDF, 100);
    }
  }, [downloadVoucherData]);

  const handleWizardClose = () => {
    setShowModal(false);
    setCurrentStep(1);
    setSelectedRooms([]);
    setGuestDetails({
      bookingSource: 'Direct',
      sourceType: '',
      guestName: '',
      guestContact: '',
      guestDob: '',
      guestCountry: 'India',
      guestState: '',
      guestCity: '',
      email: '',
      address: '',
      idType: 'Aadhaar Card',
      idNumber: '',
      nationality: 'Indian',
      companyName: '',
      companyGst: '',
      companyAddress: '',
      arrivalTime: '12:00',
      specialNote: ''
    });
    setPaymentDetails({ paymentMode: 'Prepaid', paymentMethod: 'Cash', amountPaid: 0, paymentReference: '', internalNotes: '', status: 'pending' });
    setDiscountInput(0);
    setTotalDiscount(0);
    setCurrentBookingId('');
  };

  if (isLoading) return <div className="text-white">Loading Booking Engine...</div>;

  return (
    <div className="animate-in fade-in zoom-in-95 duration-300 space-y-8">
      {/* Luxurious Hero Banner */}
      <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-white/10">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/assets/bg-room.png')" }}
        ></div>
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-transparent"></div>
        
        <div className="relative z-10 p-10 md:p-14 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-4 drop-shadow-lg">
              Booking Engine
            </h2>
            <p className="text-lg text-slate-300 max-w-xl leading-relaxed drop-shadow-md">
              Advanced reservation wizard with rate plans and payment integration.
            </p>
          </div>
          <div>
            <button 
              onClick={() => setShowModal(true)}
              className="flex items-center px-6 py-3.5 bg-emerald-600/90 backdrop-blur-md hover:bg-emerald-500 text-white rounded-xl font-bold transition-all shadow-[0_0_20px_rgba(16,185,129,0.4)] active:scale-95 border border-emerald-400/30"
            >
              <Plus size={20} className="mr-2" /> New Reservation
            </button>
          </div>
        </div>
      </div>

      <div className="bg-[#13151a]/80 backdrop-blur-xl border border-white/5 rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-[#1a1d24] text-slate-400 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4 font-medium">Guest</th>
                <th className="px-6 py-4 font-medium">Dates</th>
                <th className="px-6 py-4 font-medium">Room</th>
                <th className="px-6 py-4 font-medium">Total</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {groupedBookings.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-slate-500">
                    No reservations found. Click "New Reservation" to create one.
                  </td>
                </tr>
              ) : (
                groupedBookings.map(group => (
                  <React.Fragment key={group.groupId}>
                    <tr onClick={() => toggleGroup(group.groupId)} className="hover:bg-white/[0.02] transition-colors cursor-pointer group">
                      <td className="px-6 py-4">
                        <div className="font-bold text-white flex items-center">
                          {expandedGroups.includes(group.groupId) ? <ChevronDown size={16} className="mr-2 text-blue-400"/> : <ChevronRight size={16} className="mr-2 text-slate-500 group-hover:text-blue-400"/>}
                          {group.guestName}
                        </div>
                        <div className="text-slate-400 text-xs ml-6">{group.guestContact}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-slate-300">{new Date(group.checkInDate).toLocaleDateString('en-GB')}</div>
                        <div className="text-slate-500 text-xs">to {new Date(group.checkOutDate).toLocaleDateString('en-GB')}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-blue-400 font-bold bg-blue-500/10 px-2 py-1 rounded-md inline-block">
                          {group.rooms.length} {group.rooms.length === 1 ? 'Room' : 'Rooms'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-emerald-400 font-bold">₹{group.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                        <div className={`text-[10px] uppercase font-bold mt-1 ${group.paymentStatus === 'paid' ? 'text-emerald-500' : 'text-amber-500'}`}>
                          {group.paymentStatus}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-md text-xs font-bold border uppercase tracking-wider ${
                          group.status === 'confirmed' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                          group.status === 'checked-in' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                          group.status === 'checked-out' ? 'bg-slate-500/10 text-slate-400 border-slate-500/20' :
                          group.status === 'cancelled' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                          'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                        }`}>
                          {group.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={(e) => handleDownloadListVoucher(e, group)}
                            className="p-2 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 hover:text-blue-300 rounded-lg transition-colors border border-blue-500/20"
                            title="Download Voucher"
                          >
                            <Download size={16} />
                          </button>
                          {group.status !== 'cancelled' && (
                            <button 
                              onClick={(e) => handleCancelGroup(e, group)}
                              className="p-2 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 hover:text-amber-300 rounded-lg transition-colors border border-amber-500/20"
                              title="Cancel Booking"
                            >
                              <Ban size={16} />
                            </button>
                          )}
                          <button 
                            onClick={(e) => handleDeleteGroup(e, group)}
                            className="p-2 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 hover:text-rose-300 rounded-lg transition-colors border border-rose-500/20"
                            title="Delete Booking permanently"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                    
                    {/* Expanded Individual Rooms */}
                    {expandedGroups.includes(group.groupId) && group.rooms.map(room => (
                      <tr key={room._id} className="bg-black/20 border-b border-white/5 last:border-b-0">
                        <td className="px-6 py-3 pl-12">
                          <div className="text-xs text-slate-500 flex items-center"><div className="w-2 h-2 rounded-full bg-slate-600 mr-2"></div> Sub-booking</div>
                        </td>
                        <td className="px-6 py-3">
                          {/* Empty spacer */}
                        </td>
                        <td className="px-6 py-3">
                          <div className="text-slate-300 font-medium">Room {room.roomId?.roomNumber || 'N/A'}</div>
                          <div className="text-[10px] text-slate-500">{room.roomId?.roomTypeId?.name}</div>
                        </td>
                        <td className="px-6 py-3">
                          <div className="text-slate-300">₹{room.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                        </td>
                        <td className="px-6 py-3">
                          <span className="text-[10px] text-slate-500 uppercase">{room.status}</span>
                        </td>
                        <td className="px-6 py-3 text-right">
                          <button
                            onClick={() => {
                              setEditingBooking(room);
                              setShowEditModal(true);
                            }}
                            className="bg-blue-600/10 hover:bg-blue-600/30 text-[#3b82f6] hover:text-white px-2.5 py-1 rounded-lg text-xs font-bold transition-all border border-blue-500/20 active:scale-95"
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Advanced Booking Wizard Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={handleWizardClose}></div>
          <div className="relative bg-[#0a0b0e] border border-white/10 rounded-3xl w-full max-w-7xl max-h-[95vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-300">
            
            {/* Modal Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-5 md:p-6 border-b border-white/5 bg-[#13151a] rounded-t-3xl gap-4">
              <div className="flex justify-between items-center w-full md:w-auto">
                <h3 className="text-lg md:text-xl font-bold text-white flex items-center">
                  <CalendarDays className="mr-3 text-blue-500 shrink-0" /> Create Reservation
                </h3>
                <button onClick={handleWizardClose} className="md:hidden p-2 text-slate-400 hover:text-white transition-colors bg-white/5 rounded-full">
                  <X size={18} />
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
                <div className="w-full sm:w-44">
                  <DatePicker 
                    label="Check In" 
                    selected={dates.checkIn} 
                    minDate={new Date().toISOString().split('T')[0]}
                    onChange={(dateStr) => {
                      const nextDay = new Date(new Date(dateStr).getTime() + 86400000).toISOString().split('T')[0];
                      setDates(prev => {
                        const newDates = { ...prev, checkIn: dateStr };
                        if (new Date(prev.checkOut) <= new Date(dateStr)) {
                          newDates.checkOut = nextDay;
                        }
                        return newDates;
                      });
                    }}
                  />
                </div>
                <span className="text-slate-500 hidden sm:inline self-end mb-3">→</span>
                <div className="w-full sm:w-44">
                  <DatePicker 
                    label="Check Out" 
                    selected={dates.checkOut} 
                    minDate={new Date(new Date(dates.checkIn).getTime() + 86400000).toISOString().split('T')[0]}
                    onChange={(dateStr) => {
                      setDates(prev => ({ ...prev, checkOut: dateStr }));
                    }}
                  />
                </div>
                <button onClick={handleWizardClose} className="hidden md:block p-2.5 ml-2 text-slate-400 hover:text-white transition-colors bg-white/5 rounded-full self-end mb-1">
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Premium Stepper Progress Bar */}
            {currentStep < 4 && (
              <div className="px-6 py-4 bg-[#111317] border-b border-white/5 flex items-center justify-between overflow-x-auto gap-4 custom-scrollbar">
                {[
                  { step: 1, label: 'Rooms & Billing', icon: Search },
                  { step: 2, label: 'Guest Details', icon: User },
                  { step: 3, label: 'Payment', icon: CreditCard }
                ].map((s, idx, arr) => (
                  <React.Fragment key={s.step}>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-extrabold text-xs border transition-all duration-300 ${
                        currentStep === s.step
                          ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20 scale-105 font-black ring-4 ring-blue-500/15'
                          : currentStep > s.step
                          ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                          : 'bg-[#0a0b0e] border-white/10 text-slate-500'
                      }`}>
                        {currentStep > s.step ? '✓' : s.step}
                      </div>
                      <span className={`text-xs font-bold uppercase tracking-wider ${
                        currentStep === s.step ? 'text-white' : 'text-slate-400'
                      }`}>
                        {s.label}
                      </span>
                    </div>
                    {idx < arr.length - 1 && (
                      <div className={`h-[2px] min-w-[20px] flex-1 transition-all duration-300 ${
                        currentStep > s.step ? 'bg-emerald-500/40' : 'bg-white/5'
                      }`} />
                    )}
                  </React.Fragment>
                ))}
              </div>
            )}

            {/* Modal Body - Scrollable */}
            <div className="overflow-y-auto flex-1 p-6 space-y-4 custom-scrollbar">
              
              {/* STEP 1: ROOMS & BILLING */}
              {currentStep === 1 && (
                <div className="border border-white/10 rounded-2xl overflow-hidden bg-[#13151a] animate-in fade-in zoom-in-95 duration-200">
                  <div className="p-0 flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-white/10">
                    {/* Left: Category List */}
                    <div className="w-full lg:w-[25%] xl:w-[20%]">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-[#1a1d24]">
                          <tr>
                            <th className="p-3 text-slate-300 font-medium text-xs uppercase tracking-wider">Room Category</th>
                            <th className="p-3 text-slate-300 font-medium border-l border-white/5 text-xs uppercase tracking-wider">Rooms</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {roomTypes.map(category => {
                            const availableRooms = rooms.filter(r => (r.roomTypeId?._id === category._id || r.roomTypeId === category._id) && r.status === 'available');
                            return (
                              <tr key={category._id} className="hover:bg-white/5">
                                <td className="p-3 text-white text-xs font-semibold">{category.name}</td>
                                <td className="p-2 border-l border-white/5">
                                  {availableRooms.length === 0 ? (
                                    <span className="text-[10px] font-bold text-red-400 px-2 uppercase tracking-wide">Sold Out</span>
                                  ) : (
                                    <select 
                                      onChange={(e) => handleRoomSelect(category._id, e.target.value)}
                                      className="w-full bg-[#0a0b0e] border border-white/10 rounded p-1.5 text-slate-300 outline-none text-xs"
                                    >
                                      <option value="">Select</option>
                                      {availableRooms.map(r => (
                                        <option key={r._id} value={r._id} disabled={selectedRooms.some(sr => sr.roomId === r._id)}>
                                          Room {r.roomNumber}
                                        </option>
                                      ))}
                                    </select>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    
                    {/* Right: Selected Rooms Configuration */}
                    <div className="w-full lg:w-[75%] xl:w-[80%] bg-[#0f1115] flex flex-col min-h-[350px]">
                      
                      {/* Segmented GST Mode Toggle */}
                      <div className="p-3 bg-[#13151a]/80 backdrop-blur-md border-b border-white/5 flex flex-col sm:flex-row justify-between items-center gap-3">
                        <span className="text-xs font-black uppercase text-slate-300 tracking-wider">Rooms Billing Sheet</span>
                        <div className="flex items-center bg-[#0a0b0e] p-1 rounded-xl border border-white/10 gap-1">
                          {[
                            { id: 'inclusive', label: 'GST Inclusive' },
                            { id: 'exclusive', label: 'GST Exclusive' },
                            { id: 'out_of_scope', label: 'Out of Scope' }
                          ].map(mode => (
                            <button
                              key={mode.id}
                              type="button"
                              onClick={() => handleGstModeChange(mode.id)}
                              className={`px-3 py-1.5 rounded-lg text-[10px] uppercase tracking-wider font-extrabold transition-all duration-200 ${
                                gstMode === mode.id 
                                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/10' 
                                  : 'text-slate-400 hover:text-white'
                              }`}
                            >
                              {mode.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {selectedRooms.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-slate-500 p-8 min-h-[350px] text-center text-sm font-medium">
                          Select a room from the left category panel to configure billing.
                        </div>
                      ) : (
                        <div className="flex flex-col flex-1 relative">
                          
                          {/* Desktop/Tablet Table Layout (md and above) */}
                          <div className="hidden md:block overflow-y-auto max-h-[45vh] flex-1 custom-scrollbar">
                            <table className="w-full text-xs text-left border-collapse table-fixed">
                              <thead className="bg-[#1a1d24] text-slate-400 uppercase tracking-wider border-b border-white/10 sticky top-0 z-20">
                                <tr>
                                  <th className="px-2 py-3 border-r border-white/5 w-[18%]">Room Category</th>
                                  <th className="px-2 py-3 border-r border-white/5 text-center w-[8%]">Adults</th>
                                  <th className="px-2 py-3 border-r border-white/5 text-center w-[10%]">Children (4-5 Yr)</th>
                                  <th className="px-2 py-3 border-r border-white/5 text-center w-[10%]">Infant (Upto 3 Yr)</th>
                                  <th className="px-2 py-3 border-r border-white/5 w-[12%]">Meal Plan</th>
                                  <th className="px-2 py-3 border-r border-white/5 text-right w-[13%]">Cost (₹)</th>
                                  <th className="px-2 py-3 border-r border-white/5 text-right w-[11%]">GST (18%)</th>
                                  <th className="px-2 py-3 text-right w-[14%]">Total (₹)</th>
                                  <th className="p-1 w-[4%]"></th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-white/5">
                                {selectedRooms.map(room => (
                                  <tr key={room.roomId} className="text-slate-300 hover:bg-white/[0.01] transition-colors">
                                    <td className="px-2 py-2.5 font-semibold text-white border-r border-white/5">
                                      <div className="truncate max-w-[120px]">{room.categoryName}</div>
                                      <span className="text-[9px] text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded mt-1 inline-block font-mono font-bold">Room {room.roomNumber}</span>
                                    </td>
                                    <td className="p-1 border-r border-white/5 text-center">
                                      <select 
                                        value={room.adults} 
                                        onChange={(e) => updateSelectedRoom(room.roomId, 'adults', Number(e.target.value))} 
                                        className="bg-[#13151a] border border-white/10 rounded-lg py-1 px-1.5 outline-none w-14 text-center text-white focus:border-blue-500 text-xs font-semibold"
                                      >
                                        {[1, 2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n}</option>)}
                                      </select>
                                    </td>
                                    <td className="p-1 border-r border-white/5 text-center">
                                      <select 
                                        value={room.children || 0} 
                                        onChange={(e) => updateSelectedRoom(room.roomId, 'children', Number(e.target.value))} 
                                        className="bg-[#13151a] border border-white/10 rounded-lg py-1 px-1.5 outline-none w-14 text-center text-white focus:border-blue-500 text-xs font-semibold"
                                      >
                                        {[0, 1, 2, 3, 4].map(n => <option key={n} value={n}>{n}</option>)}
                                      </select>
                                    </td>
                                    <td className="p-1 border-r border-white/5 text-center">
                                      <select 
                                        value={room.infant || 0} 
                                        onChange={(e) => updateSelectedRoom(room.roomId, 'infant', Number(e.target.value))} 
                                        className="bg-[#13151a] border border-white/10 rounded-lg py-1 px-1.5 outline-none w-14 text-center text-white focus:border-blue-500 text-xs font-semibold"
                                      >
                                        {[0, 1, 2, 3].map(n => <option key={n} value={n}>{n}</option>)}
                                      </select>
                                    </td>
                                    <td className="p-1 border-r border-white/5">
                                      <select 
                                        value={room.ratePlanId} 
                                        onChange={(e) => updateSelectedRoom(room.roomId, 'ratePlanId', e.target.value)} 
                                        className="bg-[#13151a] border border-white/10 rounded-lg py-1 px-1 outline-none w-full text-white focus:border-blue-500 text-xs truncate font-semibold"
                                      >
                                        {ratePlans.filter(p => p.roomTypeId?._id === room.categoryId || p.roomTypeId === room.categoryId).map(p => (
                                          <option key={p._id} value={p._id}>{p.planName}</option>
                                        ))}
                                        <option value="room_only">Room Only</option>
                                      </select>
                                    </td>
                                    <td className="p-1 border-r border-white/5 text-right">
                                      <input 
                                        type="number" 
                                        value={Number(room.baseCost.toFixed(2))} 
                                        onChange={(e) => updateSelectedRoom(room.roomId, 'customCost', Math.max(0, Number(e.target.value)))}
                                        className="bg-[#13151a] border border-white/15 rounded-lg py-1 px-1.5 outline-none w-full text-right text-white focus:border-blue-500 font-bold"
                                      />
                                    </td>
                                    <td className="p-1 border-r border-white/5 text-right">
                                      <input 
                                        type="number" 
                                        value={Number(room.gst.toFixed(2))} 
                                        disabled={gstMode === 'out_of_scope'}
                                        onChange={(e) => updateSelectedRoom(room.roomId, 'customGst', Math.max(0, Number(e.target.value)))}
                                        className="bg-[#13151a] border border-white/15 rounded-lg py-1 px-1.5 outline-none w-full text-right text-white focus:border-blue-500 disabled:opacity-30 disabled:cursor-not-allowed font-bold"
                                      />
                                    </td>
                                    <td className="p-1 text-right">
                                      <input 
                                        type="number" 
                                        value={Number(room.total.toFixed(2))} 
                                        onChange={(e) => updateSelectedRoom(room.roomId, 'customTotal', Math.max(0, Number(e.target.value)))}
                                        className="bg-[#13151a] border border-emerald-500/20 rounded-lg py-1 px-1.5 outline-none w-full text-right text-emerald-400 focus:border-emerald-500 font-bold"
                                      />
                                    </td>
                                    <td className="p-1 text-center">
                                      <button 
                                        onClick={() => removeSelectedRoom(room.roomId)} 
                                        className="text-red-400 hover:text-red-300 transition-colors p-1 hover:bg-red-500/10 rounded-full"
                                      >
                                        <X size={14}/>
                                      </button>
                                    </td>
                                  </tr>
                                ))}

                                {/* Perfectly Aligned Table-Based Summary Rows */}
                                <tr className="bg-[#16181f] font-bold text-slate-300 border-t border-white/15">
                                  <td className="px-2 py-3 border-r border-white/5">Rooms: <span className="text-white">{selectedRooms.length}</span></td>
                                  <td className="px-2 py-3 border-r border-white/5 text-center">Adults: <span className="text-white">{selectedRooms.reduce((acc, r) => acc + (r.adults || 0), 0)}</span></td>
                                  <td className="px-2 py-3 border-r border-white/5 text-center" colSpan={2}>Child: <span className="text-white">{selectedRooms.reduce((acc, r) => acc + (r.children || 0), 0)}</span></td>
                                  <td className="px-2 py-3 border-r border-white/5"></td>
                                  <td className="px-2 py-3 border-r border-white/5" colSpan={2}>Net Cost</td>
                                  <td className="px-2 py-3 text-right font-black text-white text-sm" colSpan={2}>₹{totalNetCost.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                </tr>

                                <tr className="bg-[#13151a] font-bold text-slate-300 border-t border-white/5">
                                  <td className="px-2 py-3" colSpan={7}>Total GST</td>
                                  <td className="px-2 py-3 text-right font-black text-slate-300" colSpan={2}>₹{totalGST.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                </tr>

                                <tr className="bg-[#16181f] font-bold text-slate-300 border-t border-white/5">
                                  <td className="px-2 py-3 border-r border-white/5" colSpan={2}>Total Discount</td>
                                  <td className="p-1 border-r border-white/5 align-middle" colSpan={5}>
                                    <div className="flex items-center gap-2 max-w-xs">
                                      <input 
                                        type="number"
                                        placeholder="Value"
                                        value={discountInput}
                                        onChange={(e) => setDiscountInput(Math.max(0, Number(e.target.value)))}
                                        className="bg-[#0a0b0e] border border-white/10 rounded-lg p-1.5 outline-none w-20 text-white text-xs font-semibold focus:border-blue-500"
                                      />
                                      <select 
                                        value={discountTypeInput}
                                        onChange={(e) => setDiscountTypeInput(e.target.value)}
                                        className="bg-[#0a0b0e] border border-white/10 rounded-lg p-1.5 outline-none text-white text-xs focus:border-blue-500 font-semibold"
                                      >
                                        <option value="percent">Percent (%)</option>
                                        <option value="flat">Flat (₹)</option>
                                      </select>
                                      <button
                                        type="button"
                                        onClick={applyDiscount}
                                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-1 px-3 rounded-lg text-xs transition-colors shadow-md shadow-emerald-500/10 active:scale-95 shrink-0"
                                      >
                                        Add
                                      </button>
                                    </div>
                                  </td>
                                  <td className="px-2 py-3 text-right font-black text-rose-400" colSpan={2}>- ₹{totalDiscount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                </tr>

                                <tr className="bg-[#1a1d24] font-black border-t border-white/15 text-white shadow-[0_-8px_20px_rgba(0,0,0,0.6)]">
                                  <td className="px-2 py-4 text-sm" colSpan={7}>Payable Amount</td>
                                  <td className="px-2 py-4 text-right text-base md:text-lg text-emerald-400 bg-emerald-500/10 shadow-inner rounded-br-2xl font-black" colSpan={2}>
                                    ₹{payableAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>

                          {/* Mobile Stacked Card Layout (< md) */}
                          <div className="md:hidden space-y-4 p-4 max-h-[40vh] overflow-y-auto custom-scrollbar bg-black/10">
                            {selectedRooms.map(room => (
                              <div key={room.roomId} className="bg-[#13151a] border border-white/10 rounded-xl p-4 space-y-3 relative shadow-lg">
                                <button 
                                  onClick={() => removeSelectedRoom(room.roomId)}
                                  className="absolute top-3 right-3 text-red-400 p-1.5 bg-red-500/10 hover:bg-red-500/20 rounded-full transition-colors"
                                >
                                  <X size={14} />
                                </button>
                                
                                <div>
                                  <h4 className="font-bold text-white text-sm">{room.categoryName}</h4>
                                  <span className="text-[10px] text-blue-400 font-mono font-bold">Room {room.roomNumber}</span>
                                </div>

                                <div className="grid grid-cols-3 gap-2 text-xs">
                                  <div>
                                    <label className="block text-slate-500 text-[10px] uppercase font-bold mb-1">Adults</label>
                                    <select 
                                      value={room.adults} 
                                      onChange={(e) => updateSelectedRoom(room.roomId, 'adults', Number(e.target.value))}
                                      className="w-full bg-[#0a0b0e] border border-white/10 rounded-lg p-1.5 text-white outline-none font-semibold text-xs"
                                    >
                                      {[1, 2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n}</option>)}
                                    </select>
                                  </div>
                                  <div>
                                    <label className="block text-slate-500 text-[10px] uppercase font-bold mb-1">Child</label>
                                    <select 
                                      value={room.children || 0} 
                                      onChange={(e) => updateSelectedRoom(room.roomId, 'children', Number(e.target.value))}
                                      className="w-full bg-[#0a0b0e] border border-white/10 rounded-lg p-1.5 text-white outline-none font-semibold text-xs"
                                    >
                                      {[0, 1, 2, 3, 4].map(n => <option key={n} value={n}>{n}</option>)}
                                    </select>
                                  </div>
                                  <div>
                                    <label className="block text-slate-500 text-[10px] uppercase font-bold mb-1">Infant</label>
                                    <select 
                                      value={room.infant || 0} 
                                      onChange={(e) => updateSelectedRoom(room.roomId, 'infant', Number(e.target.value))}
                                      className="w-full bg-[#0a0b0e] border border-white/10 rounded-lg p-1.5 text-white outline-none font-semibold text-xs"
                                    >
                                      {[0, 1, 2, 3].map(n => <option key={n} value={n}>{n}</option>)}
                                    </select>
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-xs">
                                  <div>
                                    <label className="block text-slate-500 text-[10px] uppercase font-bold mb-1">Meal Plan</label>
                                    <select 
                                      value={room.ratePlanId} 
                                      onChange={(e) => updateSelectedRoom(room.roomId, 'ratePlanId', e.target.value)}
                                      className="w-full bg-[#0a0b0e] border border-white/10 rounded-lg p-1.5 text-white outline-none truncate font-semibold text-xs"
                                    >
                                      {ratePlans.filter(p => p.roomTypeId?._id === room.categoryId || p.roomTypeId === room.categoryId).map(p => (
                                        <option key={p._id} value={p._id}>{p.planName}</option>
                                      ))}
                                      <option value="room_only">Room Only</option>
                                    </select>
                                  </div>
                                  <div>
                                    <label className="block text-slate-500 text-[10px] uppercase font-bold mb-1">Cost (₹)</label>
                                    <input 
                                      type="number" 
                                      value={room.baseCost} 
                                      onChange={(e) => updateSelectedRoom(room.roomId, 'customCost', Math.max(0, Number(e.target.value)))}
                                      className="w-full bg-[#0a0b0e] border border-white/10 rounded-lg p-1.5 text-white outline-none text-right font-bold text-xs"
                                    />
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-xs border-t border-white/5 pt-2">
                                  <div className="flex justify-between items-center gap-1">
                                    <span className="text-slate-500 text-[10px] uppercase font-bold">GST (18%)</span>
                                    <input 
                                      type="number" 
                                      value={Number(room.gst.toFixed(2))} 
                                      disabled={gstMode === 'out_of_scope'}
                                      onChange={(e) => updateSelectedRoom(room.roomId, 'customGst', Math.max(0, Number(e.target.value)))}
                                      className="bg-[#0a0b0e] border border-white/10 rounded p-1 w-20 text-white text-right outline-none disabled:opacity-30 disabled:cursor-not-allowed font-bold"
                                    />
                                  </div>
                                  <div className="flex justify-between items-center gap-1">
                                    <span className="text-slate-500 text-[10px] uppercase font-bold">Total</span>
                                    <input 
                                      type="number" 
                                      value={Number(room.total.toFixed(2))} 
                                      onChange={(e) => updateSelectedRoom(room.roomId, 'customTotal', Math.max(0, Number(e.target.value)))}
                                      className="bg-[#0a0b0e] border border-emerald-500/20 rounded p-1 w-24 text-emerald-400 text-right outline-none font-bold"
                                    />
                                  </div>
                                </div>
                              </div>
                            ))}

                            {/* Mobile Spaced summary layout */}
                            <div className="bg-[#16181f] border border-white/5 rounded-xl p-4 space-y-2 mt-4 text-xs font-semibold">
                              <div className="flex justify-between">
                                <span className="text-slate-400">Total Rooms</span>
                                <span className="text-white font-bold">{selectedRooms.length}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-400">Net Cost</span>
                                <span className="text-white font-bold">₹{totalNetCost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-400">Total GST</span>
                                <span className="text-white font-bold">₹{totalGST.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-400">Total Discount</span>
                                <span className="text-rose-400 font-bold">- ₹{totalDiscount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                              </div>
                              <div className="flex justify-between items-center border-t border-white/5 pt-2 mt-2">
                                <span className="text-slate-300 font-bold">Payable</span>
                                <span className="text-base font-black text-emerald-400">₹{payableAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                              </div>
                            </div>
                          </div>

                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: GUEST DETAILS */}
              {currentStep === 2 && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-3 duration-300">
                  <div className="lg:col-span-2 space-y-5 bg-[#111317] border border-white/5 p-6 rounded-2xl max-h-[70vh] overflow-y-auto custom-scrollbar">
                    <h4 className="text-white font-bold text-base border-b border-white/5 pb-3 uppercase tracking-wider text-xs text-slate-300">Guest Information Profile</h4>
                    
                    {/* Row 1: Basic Info */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5 tracking-wider">Guest Full Name <span className="text-rose-500">*</span></label>
                        <input 
                          type="text" 
                          value={guestDetails.guestName} 
                          onChange={e => setGuestDetails({...guestDetails, guestName: e.target.value})} 
                          className="w-full bg-[#0a0b0e] border border-white/10 rounded-xl p-3 text-white outline-none focus:border-blue-500 text-sm font-semibold placeholder-slate-600 transition" 
                          placeholder="e.g. John Doe" 
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5 tracking-wider">Mobile Number <span className="text-rose-500">*</span></label>
                        <input 
                          type="text" 
                          value={guestDetails.guestContact} 
                          onChange={e => setGuestDetails({...guestDetails, guestContact: e.target.value})} 
                          className="w-full bg-[#0a0b0e] border border-white/10 rounded-xl p-3 text-white outline-none focus:border-blue-500 text-sm font-semibold placeholder-slate-600 transition" 
                          placeholder="e.g. +91 98765 43210" 
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5 tracking-wider">Date of Birth</label>
                        <input 
                          type="date" 
                          value={guestDetails.guestDob} 
                          onChange={e => setGuestDetails({...guestDetails, guestDob: e.target.value})} 
                          className="w-full bg-[#0a0b0e] border border-white/10 rounded-xl p-3 text-white outline-none focus:border-blue-500 text-sm font-semibold transition" 
                        />
                      </div>
                    </div>

                    {/* Row 2: Location Details */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5 tracking-wider">Country</label>
                        <input 
                          type="text" 
                          value={guestDetails.guestCountry} 
                          onChange={e => setGuestDetails({...guestDetails, guestCountry: e.target.value})} 
                          className="w-full bg-[#0a0b0e] border border-white/10 rounded-xl p-3 text-white outline-none focus:border-blue-500 text-sm font-semibold placeholder-slate-600 transition" 
                          placeholder="Country" 
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5 tracking-wider">State</label>
                        <input 
                          type="text" 
                          value={guestDetails.guestState} 
                          onChange={e => setGuestDetails({...guestDetails, guestState: e.target.value})} 
                          className="w-full bg-[#0a0b0e] border border-white/10 rounded-xl p-3 text-white outline-none focus:border-blue-500 text-sm font-semibold placeholder-slate-600 transition" 
                          placeholder="State" 
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5 tracking-wider">City</label>
                        <input 
                          type="text" 
                          value={guestDetails.guestCity} 
                          onChange={e => setGuestDetails({...guestDetails, guestCity: e.target.value})} 
                          className="w-full bg-[#0a0b0e] border border-white/10 rounded-xl p-3 text-white outline-none focus:border-blue-500 text-sm font-semibold placeholder-slate-600 transition" 
                          placeholder="City" 
                        />
                      </div>
                    </div>

                    {/* Row 3: Corporate Details */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5 tracking-wider">Company Name</label>
                        <input 
                          type="text" 
                          value={guestDetails.companyName} 
                          onChange={e => setGuestDetails({...guestDetails, companyName: e.target.value})} 
                          className="w-full bg-[#0a0b0e] border border-white/10 rounded-xl p-3 text-white outline-none focus:border-blue-500 text-sm font-semibold placeholder-slate-600 transition" 
                          placeholder="Company Name" 
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5 tracking-wider">Company GST</label>
                        <input 
                          type="text" 
                          value={guestDetails.companyGst} 
                          onChange={e => setGuestDetails({...guestDetails, companyGst: e.target.value})} 
                          className="w-full bg-[#0a0b0e] border border-white/10 rounded-xl p-3 text-white outline-none focus:border-blue-500 text-sm font-semibold placeholder-slate-600 transition" 
                          placeholder="Company GST" 
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5 tracking-wider">Company Address</label>
                        <input 
                          type="text" 
                          value={guestDetails.companyAddress} 
                          onChange={e => setGuestDetails({...guestDetails, companyAddress: e.target.value})} 
                          className="w-full bg-[#0a0b0e] border border-white/10 rounded-xl p-3 text-white outline-none focus:border-blue-500 text-sm font-semibold placeholder-slate-600 transition" 
                          placeholder="Company Address" 
                        />
                      </div>
                    </div>

                    {/* Row 4: ID & Email */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5 tracking-wider">Email Address</label>
                        <input 
                          type="email" 
                          value={guestDetails.email} 
                          onChange={e => setGuestDetails({...guestDetails, email: e.target.value})} 
                          className="w-full bg-[#0a0b0e] border border-white/10 rounded-xl p-3 text-white outline-none focus:border-blue-500 text-sm font-semibold placeholder-slate-600 transition" 
                          placeholder="e.g. john@example.com" 
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5 tracking-wider">ID Proof Type</label>
                        <select 
                          value={guestDetails.idType} 
                          onChange={e => setGuestDetails({...guestDetails, idType: e.target.value})} 
                          className="w-full bg-[#0a0b0e] border border-white/10 rounded-xl p-3 text-white outline-none focus:border-blue-500 text-sm font-semibold transition"
                        >
                          <option>Aadhaar Card</option>
                          <option>Passport</option>
                          <option>Driving License</option>
                          <option>Voter ID</option>
                          <option>Other</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5 tracking-wider">ID Proof Number</label>
                        <input 
                          type="text" 
                          value={guestDetails.idNumber} 
                          onChange={e => setGuestDetails({...guestDetails, idNumber: e.target.value})} 
                          className="w-full bg-[#0a0b0e] border border-white/10 rounded-xl p-3 text-white outline-none focus:border-blue-500 text-sm font-semibold placeholder-slate-600 transition" 
                          placeholder="ID Document ID Number" 
                        />
                      </div>
                    </div>

                    {/* Row 5: Booking Details */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5 tracking-wider">Booking Source</label>
                        <select value={guestDetails.bookingSource} onChange={e => setGuestDetails({...guestDetails, bookingSource: e.target.value})} className="w-full bg-[#0a0b0e] border border-white/10 rounded-xl p-3 text-white outline-none focus:border-blue-500 text-sm font-semibold transition">
                          <option>Direct</option>
                          <option>Walk-In</option>
                          <option>OTA (Booking.com, etc)</option>
                          <option>Corporate</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5 tracking-wider">Source Type / ID</label>
                        <input type="text" value={guestDetails.sourceType} onChange={e => setGuestDetails({...guestDetails, sourceType: e.target.value})} className="w-full bg-[#0a0b0e] border border-white/10 rounded-xl p-3 text-white outline-none focus:border-blue-500 text-sm font-semibold placeholder-slate-600 transition" placeholder="e.g. BKG-12345" />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5 tracking-wider">Est. Arrival Time</label>
                        <input type="time" value={guestDetails.arrivalTime} onChange={e => setGuestDetails({...guestDetails, arrivalTime: e.target.value})} className="w-full bg-[#0a0b0e] border border-white/10 rounded-xl p-3 text-white outline-none focus:border-blue-500 text-sm font-semibold transition" />
                      </div>
                    </div>
                    
                    {/* Notes */}
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5 tracking-wider">Special Requests / Notes</label>
                      <textarea value={guestDetails.specialNote} onChange={e => setGuestDetails({...guestDetails, specialNote: e.target.value})} className="w-full bg-[#0a0b0e] border border-white/10 rounded-xl p-3 text-white outline-none focus:border-blue-500 text-sm font-semibold h-20 resize-none transition" placeholder="Allergies, bedding configurations, early check-in, etc."></textarea>
                    </div>
                  </div>

                  {/* Right: Occupancy Mapping Recap & Invoice Details */}
                  <div className="space-y-6">
                    <div className="bg-[#111317] border border-white/5 rounded-2xl p-5 shadow-lg">
                      <h4 className="text-white font-bold text-xs uppercase tracking-wider border-b border-white/5 pb-3 mb-4 text-slate-300">Room Occupancy Mapping</h4>
                      <div className="space-y-3 max-h-[25vh] overflow-y-auto custom-scrollbar">
                        {selectedRooms.map(room => (
                          <div key={room.roomId} className="bg-[#0a0b0e]/50 border border-white/5 rounded-xl p-3 flex justify-between items-center shadow-inner">
                            <div>
                              <p className="text-xs font-black text-white">Room {room.roomNumber}</p>
                              <p className="text-[9px] text-slate-500 uppercase font-bold tracking-wide">{room.categoryName}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-[11px] text-slate-300 font-bold">{room.adults} Adults {room.children > 0 && `, ${room.children} Child`}</p>
                              <span className="text-[9px] text-blue-400 font-black font-mono uppercase bg-blue-500/10 px-1.5 py-0.5 rounded inline-block mt-0.5">{room.mealPlan}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-[#111317] border border-white/5 rounded-2xl p-5 shadow-lg">
                      <h4 className="text-white font-bold text-xs uppercase tracking-wider border-b border-white/5 pb-3 mb-4 text-slate-300">Selected Billing Overview</h4>
                      <div className="space-y-3 text-xs md:text-sm font-semibold">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Total Selected Rooms</span>
                          <span className="text-white font-extrabold">{selectedRooms.length}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Total Net Cost</span>
                          <span className="text-white">₹{totalNetCost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Total GST Amount</span>
                          <span className="text-white">₹{totalGST.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between border-t border-white/5 pt-3">
                          <span className="text-slate-300">Discount applied</span>
                          <span className="text-rose-400 font-bold">- ₹{totalDiscount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between items-center border-t border-white/10 pt-3 mt-3">
                          <span className="text-slate-200 font-black text-sm uppercase">Total Payable</span>
                          <span className="text-xl font-black text-emerald-400 tracking-wide">₹{payableAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3: PAYMENT DETAILS */}
              {currentStep === 3 && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-3 duration-300">
                  {/* Left: Billing Configuration Form */}
                  <div className="lg:col-span-2 space-y-6 bg-[#111317] border border-white/5 p-6 rounded-2xl">
                    <div className="flex justify-between items-center border-b border-white/5 pb-3">
                      <h4 className="text-white font-bold text-base uppercase tracking-wider text-xs text-slate-300">Billing & Payment Configuration</h4>
                      <span className="text-[10px] uppercase font-bold px-2.5 py-1 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">{paymentDetails.paymentMode}</span>
                    </div>

                    {/* Payment Status Selector */}
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-400 mb-2.5 tracking-wider">Payment Status</label>
                      <div className="flex bg-[#0a0b0e] p-1.5 rounded-xl border border-white/10 gap-2 w-full">
                        {['Prepaid', 'Pay At Hotel', 'Bill To Company'].map(mode => (
                          <button
                            key={mode}
                            type="button"
                            onClick={() => {
                              const newAmount = mode === 'Prepaid' ? payableAmount : 0;
                              setPaymentDetails({ ...paymentDetails, paymentMode: mode, amountPaid: newAmount, status: newAmount >= payableAmount ? 'paid' : newAmount > 0 ? 'partial' : 'pending' });
                            }}
                            className={`flex-1 py-2.5 rounded-lg text-xs uppercase tracking-wider font-extrabold transition-all duration-300 ${
                              paymentDetails.paymentMode === mode 
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20 scale-[1.02]' 
                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                            }`}
                          >
                            {mode}
                          </button>
                        ))}
                      </div>
                    </div>

                    {paymentDetails.paymentMode !== 'Bill To Company' && (
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-slate-400 mb-2.5 tracking-wider">Payment Method</label>
                        <div className="flex flex-wrap gap-2.5">
                          {['Cash', 'Card', 'UPI', 'Bank Transfer', 'Pay Later'].map(method => (
                            <button 
                              key={method}
                              type="button"
                              onClick={() => setPaymentDetails({...paymentDetails, paymentMethod: method})}
                              className={`px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider font-extrabold transition-all duration-300 border ${
                                paymentDetails.paymentMethod === method 
                                  ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20' 
                                  : 'bg-[#0a0b0e] border-white/10 text-slate-400 hover:text-white'
                              }`}
                            >
                              {method}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Dynamic Form based on Mode */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 border-t border-white/5 pt-5">
                      
                      {paymentDetails.paymentMode === 'Bill To Company' ? (
                        <>
                          <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5 tracking-wider">Company Name</label>
                              <input type="text" value={guestDetails.companyName} onChange={e => setGuestDetails({...guestDetails, companyName: e.target.value})} className="w-full bg-[#0a0b0e] border border-white/10 rounded-xl p-3 text-white outline-none focus:border-blue-500 text-sm font-semibold transition" placeholder="e.g. Acme Corp" />
                            </div>
                            <div>
                              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5 tracking-wider">Company GST Number</label>
                              <input type="text" value={guestDetails.companyGst} onChange={e => setGuestDetails({...guestDetails, companyGst: e.target.value})} className="w-full bg-[#0a0b0e] border border-white/10 rounded-xl p-3 text-white outline-none focus:border-blue-500 text-sm font-semibold transition" placeholder="e.g. 29ABCDE1234F1Z5" />
                            </div>
                            <div className="md:col-span-2">
                              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5 tracking-wider">Company Address</label>
                              <input type="text" value={guestDetails.companyAddress} onChange={e => setGuestDetails({...guestDetails, companyAddress: e.target.value})} className="w-full bg-[#0a0b0e] border border-white/10 rounded-xl p-3 text-white outline-none focus:border-blue-500 text-sm font-semibold transition" placeholder="Billing Address" />
                            </div>
                          </div>
                        </>
                      ) : (
                        <div>
                          <label className="block text-[10px] uppercase font-bold text-slate-400 mb-2 tracking-wider">
                            {paymentDetails.paymentMode === 'Prepaid' ? 'Collected Amount (₹)' : 'Optional Advance (₹)'}
                          </label>
                          <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">₹</span>
                            <input 
                              type="number" 
                              value={paymentDetails.amountPaid} 
                              onChange={e => {
                                const val = Math.max(0, Number(e.target.value));
                                setPaymentDetails({
                                  ...paymentDetails, 
                                  amountPaid: val,
                                  status: val >= payableAmount ? 'paid' : val > 0 ? 'partial' : 'pending'
                                });
                              }} 
                              className="w-full bg-[#0a0b0e] border border-emerald-500/30 rounded-xl py-3 pl-8 pr-4 text-emerald-400 font-extrabold text-lg outline-none focus:border-emerald-400 transition shadow-inner" 
                            />
                          </div>
                        </div>
                      )}

                      <div className={paymentDetails.paymentMode === 'Bill To Company' ? "md:col-span-1" : ""}>
                        <label className="block text-[10px] uppercase font-bold text-slate-400 mb-2 tracking-wider">Payment Reference</label>
                        <input 
                          type="text" 
                          value={paymentDetails.paymentReference} 
                          onChange={e => setPaymentDetails({...paymentDetails, paymentReference: e.target.value})} 
                          className="w-full bg-[#0a0b0e] border border-white/10 rounded-xl p-3 text-white outline-none focus:border-blue-500 text-sm font-semibold transition" 
                          placeholder="Txn ID, Cheque No, etc." 
                        />
                      </div>
                      
                      <div className="md:col-span-2">
                        <label className="block text-[10px] uppercase font-bold text-slate-400 mb-2 tracking-wider">Internal Note</label>
                        <textarea 
                          value={paymentDetails.internalNotes} 
                          onChange={e => setPaymentDetails({...paymentDetails, internalNotes: e.target.value})} 
                          className="w-full bg-[#0a0b0e] border border-white/10 rounded-xl p-3 text-white outline-none focus:border-blue-500 text-sm font-semibold h-20 resize-none transition" 
                          placeholder="Add billing instructions or payment notes here..."
                        ></textarea>
                      </div>

                    </div>
                  </div>

                  {/* Right side summary recap */}
                  <div className="space-y-6">
                    <div className="bg-[#111317] border border-white/5 rounded-2xl overflow-hidden shadow-lg flex flex-col h-full">
                      <div className="p-5 border-b border-white/5">
                        <h4 className="text-white font-bold text-xs uppercase tracking-wider text-slate-300">Complete Billing Recap</h4>
                      </div>
                      <div className="p-5 flex-1 space-y-3.5 text-xs font-semibold">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">Guest Name</span>
                          <span className="text-white font-bold">{guestDetails.guestName}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">Mobile Contact</span>
                          <span className="text-white font-bold">{guestDetails.guestContact}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">Check In</span>
                          <span className="text-white font-bold text-emerald-400">{new Date(dates.checkIn).toLocaleDateString('en-GB')}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">Check Out</span>
                          <span className="text-white font-bold text-rose-400">{new Date(dates.checkOut).toLocaleDateString('en-GB')}</span>
                        </div>
                        <div className="flex justify-between items-center border-t border-white/5 pt-3 mt-1">
                          <span className="text-slate-400">Rooms Booked</span>
                          <span className="text-white font-extrabold bg-white/10 px-2 py-0.5 rounded">{selectedRooms.length}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">Net Cost</span>
                          <span className="text-white">₹{totalNetCost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">Total GST</span>
                          <span className="text-slate-300">₹{totalGST.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between items-center border-b border-white/5 pb-3">
                          <span className="text-slate-400">Discount</span>
                          <span className="text-rose-400 font-bold">- ₹{totalDiscount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between items-end pt-2">
                          <span className="text-slate-300 font-black text-sm uppercase">Total Payable</span>
                          <span className="text-xl font-black text-emerald-400 tracking-wide">₹{payableAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        </div>
                      </div>
                      
                      {/* Dynamic Pending Balance Banner */}
                      <div className={`p-4 mt-auto border-t border-white/5 shadow-inner ${
                        paymentDetails.paymentMode === 'Bill To Company' 
                          ? 'bg-blue-900/20' 
                          : Math.max(0, payableAmount - paymentDetails.amountPaid) > 0 
                            ? 'bg-amber-900/20' 
                            : 'bg-emerald-900/20'
                      }`}>
                        <div className="flex justify-between items-center">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                              {paymentDetails.paymentMode === 'Bill To Company' ? 'Ledger Balance' : 'Balance Pending'}
                            </span>
                            <span className="text-[9px] text-slate-500 font-medium">
                              {paymentDetails.paymentMode === 'Bill To Company' 
                                ? `Billed to ${guestDetails.companyName || 'Company'}` 
                                : `After ₹${paymentDetails.amountPaid} payment`}
                            </span>
                          </div>
                          <span className={`text-lg font-black ${
                             paymentDetails.paymentMode === 'Bill To Company' ? 'text-blue-400'
                             : Math.max(0, payableAmount - paymentDetails.amountPaid) > 0 ? 'text-amber-400' : 'text-emerald-400'
                          }`}>
                            ₹{Math.max(0, payableAmount - paymentDetails.amountPaid).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>

                    </div>
                  </div>
                </div>
              )}

              {/* STEP 4: CONFIRMATION SUCCESS */}
              {currentStep === 4 && (
                <div className="flex flex-col items-center justify-center p-8 text-center space-y-6 animate-in fade-in zoom-in-95 duration-500 max-w-2xl mx-auto">
                  <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/15 animate-bounce">
                    <span className="text-emerald-400 text-4xl font-bold">✓</span>
                  </div>
                  
                  <div>
                    <h3 className="text-2xl font-black text-white tracking-tight">Booking Completed Successfully!</h3>
                    <p className="text-slate-400 text-sm mt-2 max-w-md leading-relaxed">
                      The reservation has been registered into the PMS and synced with the cloud database.
                    </p>
                  </div>

                  <div className="w-full bg-[#111317] border border-white/5 rounded-2xl p-6 text-left space-y-4 shadow-xl">
                    <h4 className="text-white font-black text-xs uppercase tracking-wider border-b border-white/5 pb-2.5 text-slate-300">Reservation Summary Card</h4>
                    
                    <div className="grid grid-cols-2 gap-4 text-xs font-semibold text-slate-300">
                      <div>
                        <span className="text-slate-500 uppercase text-[9px] font-bold block mb-0.5">Primary Guest</span>
                        <span className="text-white font-extrabold text-sm">{guestDetails.guestName}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 uppercase text-[9px] font-bold block mb-0.5">Phone Contact</span>
                        <span className="text-white font-extrabold text-sm">{guestDetails.guestContact}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 uppercase text-[9px] font-bold block mb-0.5">Check In / Out</span>
                        <span className="text-white font-bold">{new Date(dates.checkIn).toLocaleDateString('en-GB')} to {new Date(dates.checkOut).toLocaleDateString('en-GB')}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 uppercase text-[9px] font-bold block mb-0.5">Rooms Allocated</span>
                        <span className="text-white font-extrabold">{selectedRooms.length} Rooms ({selectedRooms.map(r => `Room ${r.roomNumber}`).join(', ')})</span>
                      </div>
                      <div className="col-span-2 border-t border-white/5 pt-3 flex justify-between items-center">
                        <div>
                          <span className="text-slate-500 uppercase text-[9px] font-bold block mb-0.5">Payment Method</span>
                          <span className="text-white font-extrabold text-sm uppercase bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded inline-block">{paymentDetails.paymentMethod}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-slate-500 uppercase text-[9px] font-bold block mb-0.5">Total Payable Amount</span>
                          <span className="text-lg font-black text-emerald-400">₹{payableAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4 w-full justify-center pt-2">
                    <button 
                      onClick={handleDownloadPDF}
                      className="px-8 py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black text-sm tracking-wider transition-all duration-300 shadow-lg shadow-blue-500/20 active:scale-95 flex items-center justify-center gap-2"
                    >
                      <Download size={18} /> Download Voucher PDF
                    </button>
                    <button 
                      onClick={handlePrintVoucher}
                      className="px-8 py-3.5 bg-[#1a1d24] hover:bg-[#252a34] text-white border border-white/10 rounded-xl font-bold text-sm tracking-wider transition-all duration-300 shadow-lg active:scale-95 flex items-center justify-center gap-2"
                    >
                      <Printer size={18} /> Print Voucher
                    </button>
                  </div>

                  <button 
                    onClick={handleWizardClose}
                    className="w-full sm:w-auto px-10 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black text-sm uppercase tracking-wider transition-all duration-300 shadow-[0_0_20px_rgba(16,185,129,0.3)] active:scale-95 border border-emerald-400/20 mt-2"
                  >
                    Start New Booking
                  </button>

                </div>
              )}

            </div>

            {/* Stepper Navigation Sticky Bottom Footer Bar */}
            {currentStep < 4 && (
              <div className="p-4 md:p-6 bg-[#13151a] border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-4 sticky bottom-0 z-30 shadow-[0_-8px_25px_rgba(0,0,0,0.5)]">
                <div>
                  {currentStep > 1 && (
                    <button
                      type="button"
                      disabled={isSavingStep}
                      onClick={() => setCurrentStep(prev => prev - 1)}
                      className="px-6 py-3 bg-[#0a0b0e] border border-white/10 text-slate-400 hover:text-white rounded-xl text-xs uppercase tracking-wider font-extrabold hover:border-white/20 transition-all duration-200 active:scale-95 disabled:opacity-50 flex items-center gap-2"
                    >
                      ← Back
                    </button>
                  )}
                </div>
                
                <div className="w-full sm:w-auto">
                  {currentStep < 3 ? (
                    <button
                      type="button"
                      disabled={isSavingStep}
                      onClick={async () => {
                        if (currentStep === 1) {
                          if (selectedRooms.length === 0) {
                            return toast.error('Please select at least one room');
                          }
                          const invalidRoom = selectedRooms.find(r => r.baseCost <= 0 || r.total <= 0);
                          if (invalidRoom) {
                            return toast.error(`Pricing values are missing or invalid for Room ${invalidRoom.roomNumber}`);
                          }
                          if (payableAmount <= 0) {
                            return toast.error('Payable amount must be greater than 0');
                          }
                          
                          // Simulated premium API save thread
                          setIsSavingStep(true);
                          const loadingToast = toast.loading('Saving billing configuration to database...');
                          setTimeout(() => {
                            toast.dismiss(loadingToast);
                            setIsSavingStep(false);
                            toast.success('Billing data saved successfully!');
                            setCurrentStep(2);
                          }, 750);
                        } else if (currentStep === 2) {
                          if (!guestDetails.guestName.trim()) {
                            return toast.error('Guest Full Name is required');
                          }
                          if (!guestDetails.guestContact.trim()) {
                            return toast.error('Guest Contact Number is required');
                          }
                          
                          setIsSavingStep(true);
                          const loadingToast = toast.loading('Updating guest profile details...');
                          setTimeout(() => {
                            toast.dismiss(loadingToast);
                            setIsSavingStep(false);
                            toast.success('Guest details updated successfully!');
                            setCurrentStep(3);
                          }, 750);
                        }
                      }}
                      className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 text-white rounded-xl text-xs uppercase tracking-wider font-extrabold transition-all duration-300 shadow-[0_0_20px_rgba(59,130,246,0.3)] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isSavingStep ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Processing...
                        </>
                      ) : (
                        <>
                          Continue to {currentStep === 1 ? 'Guest Details' : 'Payment'} →
                        </>
                      )}
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={isSavingStep}
                      onClick={handleSubmit}
                      className="w-full sm:w-auto px-10 py-3.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white rounded-xl text-xs uppercase tracking-wider font-extrabold transition-all duration-300 shadow-[0_0_25px_rgba(16,185,129,0.4)] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isSavingStep ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Creating Reservation...
                        </>
                      ) : (
                        <>
                          ✓ Confirm Booking (₹{payableAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })})
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit Sub-Booking Modal */}
      {showEditModal && editingBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => {
            setShowEditModal(false);
            fetchData();
          }}></div>
          <div className="relative bg-[#0a0b0e] border border-white/10 rounded-3xl w-full max-w-7xl lg:max-w-[1450px] shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center p-5 md:p-6 border-b border-white/5 bg-[#13151a] rounded-t-3xl">
              <h3 className="text-lg font-bold text-white flex items-center">
                <CalendarDays className="mr-3 text-blue-500" /> Edit Room Booking ({editingBooking.guestName})
              </h3>
              <button onClick={() => {
                setShowEditModal(false);
                fetchData();
              }} className="p-2 text-slate-400 hover:text-white transition-colors bg-white/5 rounded-full">
                <X size={18} />
              </button>
            </div>
            
            {/* Modal Body */}
            <div className="p-4 md:p-6 overflow-y-auto max-h-[80vh] custom-scrollbar">
              
              {/* Segmented GST Mode Toggle */}
              <div className="mb-4 flex flex-col sm:flex-row justify-between items-center p-3 bg-[#13151a] rounded-xl border border-white/10 gap-3">
                <span className="text-xs font-black uppercase text-slate-300 tracking-wider">Tax Management Mode</span>
                <div className="flex items-center bg-[#0a0b0e] p-1 rounded-xl border border-white/10 gap-1">
                  {[
                    { id: 'inclusive', label: 'GST Inclusive' },
                    { id: 'exclusive', label: 'GST Exclusive' },
                    { id: 'out_of_scope', label: 'Out of Scope' }
                  ].map(mode => (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => handleEditGstModeChange(mode.id)}
                      className={`px-3 py-1.5 rounded-lg text-[10px] uppercase tracking-wider font-extrabold transition-all duration-200 ${
                        (editingBooking.gstMode || 'exclusive') === mode.id 
                          ? 'bg-blue-600 text-white shadow-md shadow-blue-500/10' 
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Desktop/Tablet Table Layout (md and above) */}
              <div className="hidden md:block overflow-x-auto rounded-xl border border-white/10 bg-[#0f1115] mb-6">
                <table className="w-full text-xs text-left border-collapse table-fixed">
                  <thead className="bg-[#1a1d24] text-slate-400 uppercase tracking-wider border-b border-white/10">
                    <tr>
                      <th className="px-2 py-3 border-r border-white/5 w-[18%]">Room Category</th>
                      <th className="px-2 py-3 border-r border-white/5 text-center w-[8%]">Adults</th>
                      <th className="px-2 py-3 border-r border-white/5 text-center w-[10%]">Children (4-5 Yr)</th>
                      <th className="px-2 py-3 border-r border-white/5 text-center w-[10%]">Infant (Upto 3 Yr)</th>
                      <th className="px-2 py-3 border-r border-white/5 w-[12%]">Meal Plan</th>
                      <th className="px-2 py-3 border-r border-white/5 text-right w-[13%]">Cost (₹)</th>
                      <th className="px-2 py-3 border-r border-white/5 text-right w-[13%]">GST (18%)</th>
                      <th className="px-2 py-3 text-right w-[16%]">Total (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="text-slate-300">
                      <td className="px-2 py-2.5 font-semibold text-white border-r border-white/5">
                        <div className="truncate max-w-[150px]">{editingBooking.roomId?.roomTypeId?.name || 'Deluxe Room'}</div>
                        <span className="text-[9px] text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded mt-1 inline-block font-mono font-bold">Room {editingBooking.roomId?.roomNumber || 'N/A'}</span>
                      </td>
                      <td className="p-1 border-r border-white/5 text-center">
                        <select 
                          value={editingBooking.adults || 2} 
                          onChange={(e) => handleEditFieldChange('adults', Number(e.target.value))} 
                          className="bg-[#13151a] border border-white/10 rounded-lg py-1 px-1.5 outline-none w-14 text-center text-white focus:border-blue-500 text-xs font-semibold"
                        >
                          {[1, 2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n}</option>)}
                        </select>
                      </td>
                      <td className="p-1 border-r border-white/5 text-center">
                        <select 
                          value={editingBooking.children || 0} 
                          onChange={(e) => handleEditFieldChange('children', Number(e.target.value))} 
                          className="bg-[#13151a] border border-white/10 rounded-lg py-1 px-1.5 outline-none w-14 text-center text-white focus:border-blue-500 text-xs font-semibold"
                        >
                          {[0, 1, 2, 3, 4].map(n => <option key={n} value={n}>{n}</option>)}
                        </select>
                      </td>
                      <td className="p-1 border-r border-white/5 text-center">
                        <select 
                          value={editingBooking.infant || 0} 
                          onChange={(e) => handleEditFieldChange('infant', Number(e.target.value))} 
                          className="bg-[#13151a] border border-white/10 rounded-lg py-1 px-1.5 outline-none w-14 text-center text-white focus:border-blue-500 text-xs font-semibold"
                        >
                          {[0, 1, 2, 3].map(n => <option key={n} value={n}>{n}</option>)}
                        </select>
                      </td>
                      <td className="p-1 border-r border-white/5">
                        <select 
                          value={editingBooking.mealPlan || 'Room Only'} 
                          onChange={(e) => handleEditFieldChange('mealPlan', e.target.value)} 
                          className="bg-[#13151a] border border-white/10 rounded-lg py-1 px-1 outline-none w-full text-white focus:border-blue-500 text-xs truncate font-semibold"
                        >
                          <option>Room Only</option>
                          <option>EP</option>
                          <option>CP</option>
                          <option>MAP</option>
                          <option>AP</option>
                        </select>
                      </td>
                      <td className="p-1 border-r border-white/5 text-right">
                        <input 
                          type="number" 
                          value={editingBooking.cost || 0} 
                          onChange={(e) => handleEditFieldChange('cost', Math.max(0, Number(e.target.value)))}
                          className="bg-[#13151a] border border-white/15 rounded-lg py-1 px-1.5 outline-none w-full text-right text-white focus:border-blue-500 font-bold"
                        />
                      </td>
                      <td className="p-1 border-r border-white/5 text-right">
                        <input 
                          type="number" 
                          value={Number((editingBooking.gst || 0).toFixed(2))} 
                          disabled={(editingBooking.gstMode || 'exclusive') === 'out_of_scope'}
                          onChange={(e) => handleEditFieldChange('gst', Math.max(0, Number(e.target.value)))}
                          className="bg-[#13151a] border border-white/15 rounded-lg py-1 px-1.5 outline-none w-full text-right text-white focus:border-blue-500 disabled:opacity-30 disabled:cursor-not-allowed font-bold"
                        />
                      </td>
                      <td className="p-1 text-right">
                        <input 
                          type="number" 
                          value={Number((editingBooking.totalAmount || 0).toFixed(2))} 
                          onChange={(e) => handleEditFieldChange('totalAmount', Math.max(0, Number(e.target.value)))}
                          className="bg-[#13151a] border border-emerald-500/20 rounded-lg py-1 px-1.5 outline-none w-full text-right text-emerald-400 focus:border-emerald-500 font-bold"
                        />
                      </td>
                    </tr>

                    {/* Summary row exactly like Photo 1 for single edit */}
                    <tr className="bg-[#16181f] font-semibold text-slate-300 border-t border-white/15">
                      <td className="px-2 py-3 border-r border-white/5">Total Rooms: <span className="text-white font-bold">1</span></td>
                      <td className="px-2 py-3 border-r border-white/5 text-center">Adults: <span className="text-white font-bold">{editingBooking.adults || 0}</span></td>
                      <td className="px-2 py-3 border-r border-white/5 text-center" colSpan="2">Child: <span className="text-white font-bold">{editingBooking.children || 0}</span></td>
                      <td className="px-2 py-3 border-r border-white/5"></td>
                      <td className="px-2 py-3 border-r border-white/5" colSpan="2">Net Cost</td>
                      <td className="px-2 py-3 text-right font-black text-white text-sm">₹{(editingBooking.cost || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    </tr>

                    <tr className="bg-[#13151a] font-semibold text-slate-300 border-t border-white/5">
                      <td className="px-2 py-3" colSpan={7}>Total GST</td>
                      <td className="px-2 py-3 text-right font-black text-slate-300">₹{(editingBooking.gst || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    </tr>

                    <tr className="bg-[#16181f] font-semibold text-slate-300 border-t border-white/5">
                      <td className="px-2 py-3 border-r border-white/5" colSpan={2}>Total Discount</td>
                      <td className="p-1 border-r border-white/5 align-middle" colSpan={5}>
                        <div className="flex items-center gap-2 max-w-xs">
                          <input 
                            type="number"
                            placeholder="Value"
                            value={editingBooking.discountValue || 0}
                            onChange={(e) => {
                              const val = Math.max(0, Number(e.target.value));
                              const cost = editingBooking.cost || 0;
                              const gst = editingBooking.gst || 0;
                              const subtotal = cost + gst;
                              let discAmount = 0;
                              if (editingBooking.discountType === 'percent') {
                                discAmount = subtotal * (val / 100);
                              } else {
                                discAmount = val;
                              }
                              const applied = Math.min(subtotal, discAmount);
                              handleEditFieldChange('discountValue', val);
                              handleEditFieldChange('discount', applied);
                            }}
                            className="bg-[#0a0b0e] border border-white/10 rounded-lg p-1.5 outline-none w-20 text-white text-xs font-semibold focus:border-blue-500"
                          />
                          <select 
                            value={editingBooking.discountType || 'flat'}
                            onChange={(e) => {
                              const type = e.target.value;
                              const val = editingBooking.discountValue || 0;
                              const cost = editingBooking.cost || 0;
                              const gst = editingBooking.gst || 0;
                              const subtotal = cost + gst;
                              let discAmount = 0;
                              if (type === 'percent') {
                                discAmount = subtotal * (val / 100);
                              } else {
                                discAmount = val;
                              }
                              const applied = Math.min(subtotal, discAmount);
                              handleEditFieldChange('discountType', type);
                              handleEditFieldChange('discount', applied);
                            }}
                            className="bg-[#0a0b0e] border border-white/10 rounded-lg p-1.5 outline-none text-white text-xs focus:border-blue-500 font-semibold"
                          >
                            <option value="percent">Percent (%)</option>
                            <option value="flat">Flat (₹)</option>
                          </select>
                        </div>
                      </td>
                      <td className="px-2 py-3 text-right font-black text-rose-400">- ₹{(editingBooking.discount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    </tr>

                    <tr className="bg-[#1a1d24] font-black border-t border-white/15 text-white">
                      <td className="px-2 py-4 text-sm" colSpan={7}>Payable Amount</td>
                      <td className="px-2 py-4 text-right text-base md:text-lg text-emerald-400 bg-emerald-500/10 shadow-inner rounded-br-2xl font-black">
                        ₹{(Math.max(0, ((editingBooking.cost || 0) + (editingBooking.gst || 0)) - (editingBooking.discount || 0))).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Mobile Stacked Card Layout (< md) */}
              <div className="md:hidden space-y-4 mb-6">
                <div className="bg-[#13151a] border border-white/10 rounded-xl p-4 space-y-3 relative shadow-lg">
                  <div>
                    <h4 className="font-bold text-white text-sm">{editingBooking.roomId?.roomTypeId?.name || 'Deluxe Room'}</h4>
                    <span className="text-[10px] text-blue-400 font-mono font-bold">Room {editingBooking.roomId?.roomNumber || 'N/A'}</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <label className="block text-slate-500 text-[10px] uppercase font-bold mb-1">Adults</label>
                      <select 
                        value={editingBooking.adults || 2} 
                        onChange={(e) => handleEditFieldChange('adults', Number(e.target.value))}
                        className="w-full bg-[#0a0b0e] border border-white/10 rounded-lg p-1.5 text-white outline-none font-semibold text-xs"
                      >
                        {[1, 2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-500 text-[10px] uppercase font-bold mb-1">Child</label>
                      <select 
                        value={editingBooking.children || 0} 
                        onChange={(e) => handleEditFieldChange('children', Number(e.target.value))}
                        className="w-full bg-[#0a0b0e] border border-white/10 rounded-lg p-1.5 text-white outline-none font-semibold text-xs"
                      >
                        {[0, 1, 2, 3, 4].map(n => <option key={n} value={n}>{n}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-500 text-[10px] uppercase font-bold mb-1">Infant</label>
                      <select 
                        value={editingBooking.infant || 0} 
                        onChange={(e) => handleEditFieldChange('infant', Number(e.target.value))}
                        className="w-full bg-[#0a0b0e] border border-white/10 rounded-lg p-1.5 text-white outline-none font-semibold text-xs"
                      >
                        {[0, 1, 2, 3].map(n => <option key={n} value={n}>{n}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <label className="block text-slate-500 text-[10px] uppercase font-bold mb-1">Meal Plan</label>
                      <select 
                        value={editingBooking.mealPlan || 'Room Only'} 
                        onChange={(e) => handleEditFieldChange('mealPlan', e.target.value)}
                        className="w-full bg-[#0a0b0e] border border-white/10 rounded-lg p-1.5 text-white outline-none truncate font-semibold text-xs"
                      >
                        <option>Room Only</option>
                        <option>EP</option>
                        <option>CP</option>
                        <option>MAP</option>
                        <option>AP</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-500 text-[10px] uppercase font-bold mb-1">Cost (₹)</label>
                      <input 
                        type="number" 
                        value={editingBooking.cost || 0} 
                        onChange={(e) => handleEditFieldChange('cost', Math.max(0, Number(e.target.value)))}
                        className="w-full bg-[#0a0b0e] border border-white/10 rounded-lg p-1.5 text-white outline-none text-right font-bold text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs border-t border-white/5 pt-2">
                    <div className="flex justify-between items-center gap-1">
                      <span className="text-slate-500 text-[10px] uppercase font-bold">GST (18%)</span>
                      <input 
                        type="number" 
                        value={Number((editingBooking.gst || 0).toFixed(2))} 
                        disabled={(editingBooking.gstMode || 'exclusive') === 'out_of_scope'}
                        onChange={(e) => handleEditFieldChange('gst', Math.max(0, Number(e.target.value)))}
                        className="bg-[#0a0b0e] border border-white/10 rounded p-1 w-20 text-white text-right outline-none disabled:opacity-30 disabled:cursor-not-allowed font-bold"
                      />
                    </div>
                    <div className="flex justify-between items-center gap-1">
                      <span className="text-slate-500 text-[10px] uppercase font-bold">Total</span>
                      <input 
                        type="number" 
                        value={Number((editingBooking.totalAmount || 0).toFixed(2))} 
                        onChange={(e) => handleEditFieldChange('totalAmount', Math.max(0, Number(e.target.value)))}
                        className="bg-[#0a0b0e] border border-emerald-500/20 rounded p-1 w-24 text-emerald-400 text-right outline-none font-bold"
                      />
                    </div>
                  </div>

                  {/* Mobile Discount Controls */}
                  <div className="border-t border-white/5 pt-2 space-y-2">
                    <label className="block text-slate-500 text-[10px] uppercase font-bold">Discount System</label>
                    <div className="flex items-center gap-2">
                      <input 
                        type="number"
                        placeholder="Value"
                        value={editingBooking.discountValue || 0}
                        onChange={(e) => {
                          const val = Math.max(0, Number(e.target.value));
                          const cost = editingBooking.cost || 0;
                          const gst = editingBooking.gst || 0;
                          const subtotal = cost + gst;
                          let discAmount = 0;
                          if (editingBooking.discountType === 'percent') {
                            discAmount = subtotal * (val / 100);
                          } else {
                            discAmount = val;
                          }
                          const applied = Math.min(subtotal, discAmount);
                          handleEditFieldChange('discountValue', val);
                          handleEditFieldChange('discount', applied);
                        }}
                        className="bg-[#0a0b0e] border border-white/10 rounded-lg p-1.5 outline-none w-20 text-white text-xs font-semibold focus:border-blue-500"
                      />
                      <select 
                        value={editingBooking.discountType || 'flat'}
                        onChange={(e) => {
                          const type = e.target.value;
                          const val = editingBooking.discountValue || 0;
                          const cost = editingBooking.cost || 0;
                          const gst = editingBooking.gst || 0;
                          const subtotal = cost + gst;
                          let discAmount = 0;
                          if (type === 'percent') {
                            discAmount = subtotal * (val / 100);
                          } else {
                            discAmount = val;
                          }
                          const applied = Math.min(subtotal, discAmount);
                          handleEditFieldChange('discountType', type);
                          handleEditFieldChange('discount', applied);
                        }}
                        className="bg-[#0a0b0e] border border-white/10 rounded-lg p-1.5 outline-none text-white text-xs focus:border-blue-500 font-semibold"
                      >
                        <option value="percent">Percent (%)</option>
                        <option value="flat">Flat (₹)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Mobile Summary info */}
                <div className="bg-[#16181f] border border-white/5 rounded-xl p-4 space-y-2 text-xs font-semibold">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total Rooms</span>
                    <span className="text-white font-bold">1</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Adults</span>
                    <span className="text-white font-bold">{editingBooking.adults || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Child</span>
                    <span className="text-white font-bold">{editingBooking.children || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Net Cost</span>
                    <span className="text-white font-bold">₹{(editingBooking.cost || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total GST</span>
                    <span className="text-white font-bold">₹{(editingBooking.gst || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total Discount</span>
                    <span className="text-rose-400 font-bold">- ₹{(editingBooking.discount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between items-center border-t border-white/10 pt-2 mt-2">
                    <span className="text-slate-200 font-black">Payable Amount</span>
                    <span className="text-base font-black text-emerald-400">₹{(Math.max(0, ((editingBooking.cost || 0) + (editingBooking.gst || 0)) - (editingBooking.discount || 0))).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    fetchData();
                  }}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 px-6 rounded-xl transition-all shadow-lg active:scale-95 text-xs uppercase tracking-wider font-extrabold"
                >
                  Done & Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hidden Voucher for PDF Generation */}
      <BookingVoucher 
        ref={voucherRef}
        bookingId={currentBookingId}
        guestDetails={guestDetails}
        paymentDetails={paymentDetails}
        selectedRooms={selectedRooms}
        dates={dates}
        totalNetCost={totalNetCost}
        totalGST={totalGST}
        totalDiscount={totalDiscount}
        payableAmount={payableAmount}
      />

      {/* Hidden Retroactive Voucher for List PDF Download */}
      {downloadVoucherData && (
        <BookingVoucher 
          ref={listVoucherRef}
          bookingId={downloadVoucherData.bookingId}
          guestDetails={downloadVoucherData.guestDetails}
          paymentDetails={downloadVoucherData.paymentDetails}
          selectedRooms={downloadVoucherData.selectedRooms}
          dates={downloadVoucherData.dates}
          totalNetCost={downloadVoucherData.totalNetCost}
          totalGST={downloadVoucherData.totalGST}
          totalDiscount={downloadVoucherData.totalDiscount}
          payableAmount={downloadVoucherData.payableAmount}
        />
      )}
    </div>
  );
};

export default BookingEngine;
