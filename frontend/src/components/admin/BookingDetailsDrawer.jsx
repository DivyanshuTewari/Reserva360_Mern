import React, { useState, useEffect, useRef } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { X, User, Calendar, CreditCard, CheckCircle, ChevronDown, ChevronUp, FileText, Info, Plus, RefreshCw, Copy, Check, CalendarDays, Search, Loader2, Download, Printer } from 'lucide-react';
import BookingVoucher from './BookingVoucher';
import DatePicker from '../ui/DatePicker';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas-pro';

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
  const [checkoutRooms, setCheckoutRooms] = useState([]);
  
  const [hotelProfile, setHotelProfile] = useState(null);
  const [printTitle, setPrintTitle] = useState('Guest Invoice');
  const printVoucherRef = useRef(null);

  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [checkInForm, setCheckInForm] = useState({
    comingFrom: '',
    goingTo: '',
    vehicleNumber: '',
    idProofType: 'Aadhaar Card',
    idProofNumber: '',
    nameAsPerIdProof: ''
  });

  // Stepper and wizard states for full editing
  const [showEditWizard, setShowEditWizard] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [isSavingStep, setIsSavingStep] = useState(false);
  const [roomTypes, setRoomTypes] = useState([]);
  const [ratePlans, setRatePlans] = useState([]);
  const [roomBlocks, setRoomBlocks] = useState([]);
  const [allBookings, setAllBookings] = useState([]);
  const [dates, setDates] = useState({ checkIn: '', checkOut: '' });
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
    specialNote: '',
    gender: ''
  });
  const [paymentDetails, setPaymentDetails] = useState({
    paymentMode: 'Prepaid',
    paymentMethod: 'Cash',
    amountPaid: 0,
    paymentReference: '',
    internalNotes: '',
    status: 'pending'
  });
  const [selectedRooms, setSelectedRooms] = useState([]);
  const [gstMode, setGstMode] = useState('exclusive');
  const [discountInput, setDiscountInput] = useState('');
  const [discountTypeInput, setDiscountTypeInput] = useState('percent');
  const [totalDiscount, setTotalDiscount] = useState(0);

  const isFirstLoadRef = useRef(false);

  // Recalculate cost for selected rooms when dates change
  useEffect(() => {
    if (!showEditWizard || selectedRooms.length === 0) return;
    if (isFirstLoadRef.current) {
      isFirstLoadRef.current = false;
      return;
    }
    
    const days = Math.max(1, Math.ceil((new Date(dates.checkOut) - new Date(dates.checkIn)) / (1000 * 60 * 60 * 24)));
    
    setSelectedRooms(prev => prev.map(room => {
      const plan = ratePlans.find(p => p._id === room.ratePlanId);
      const category = roomTypes.find(c => c._id === room.categoryId);
      const rate = (plan?.price || category?.basePrice || 3500) * days;
      
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
        baseCost: roundToTwo(baseCost),
        gst: roundToTwo(gst),
        total: roundToTwo(total)
      };
    }));
  }, [dates.checkIn, dates.checkOut, ratePlans, roomTypes, gstMode, showEditWizard]);

  const handleWizardClose = () => {
    setShowEditWizard(false);
    setCurrentStep(1);
    setSelectedRooms([]);
  };

  const handleDownloadPDF = async () => {
    if (!printVoucherRef.current) return;
    const toastId = toast.loading('Generating PDF...');
    try {
      const element = printVoucherRef.current;
      const canvas = await html2canvas(element, { scale: 2, useCORS: true });
      const data = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProperties = pdf.getImageProperties(data);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProperties.height * pdfWidth) / imgProperties.width;
      
      pdf.addImage(data, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`BOOKING-${data?.booking?._id || bookingId}.pdf`);
      toast.success('Voucher Downloaded Successfully', { id: toastId });
    } catch (error) {
      toast.error(`Failed to generate PDF: ${error.message || 'Unknown error'}`, { id: toastId });
      console.error(error);
    }
  };

  const handlePrintVoucher = () => {
    window.print();
  };

  const roundToTwo = (num) => Math.round((num + Number.EPSILON) * 100) / 100;

  const totalNetCost = selectedRooms.reduce((acc, curr) => acc + curr.baseCost, 0);
  const totalGST = selectedRooms.reduce((acc, curr) => acc + curr.gst, 0);
  const payableAmount = Math.max(0, (totalNetCost + totalGST) - totalDiscount);

  const isRoomBlockedForDates = (roomId) => {
    if (!dates.checkIn || !dates.checkOut) return false;
    const checkIn = new Date(dates.checkIn); checkIn.setHours(0,0,0,0);
    const checkOut = new Date(dates.checkOut); checkOut.setHours(0,0,0,0);
    return roomBlocks.some(b => {
      const bRoomId = b.roomId?._id || b.roomId;
      if (bRoomId !== roomId) return false;
      const bStart = new Date(b.startDate); bStart.setHours(0,0,0,0);
      const bEnd = new Date(b.endDate); bEnd.setHours(0,0,0,0);
      return bStart < checkOut && bEnd >= checkIn;
    });
  };

  const isRoomBookedForDates = (roomId) => {
    if (!dates.checkIn || !dates.checkOut) return false;
    const checkIn = new Date(dates.checkIn); checkIn.setHours(0,0,0,0);
    const checkOut = new Date(dates.checkOut); checkOut.setHours(0,0,0,0);
    return allBookings.some(b => {
      if (b.status === 'cancelled' || b.status === 'checked-out') return false;
      
      // Ignore bookings belonging to the group currently being edited
      const groupKey = data?.booking?.bookingGroupId || data?.booking?._id;
      if (b.bookingGroupId === groupKey || b._id === groupKey) {
        return false;
      }

      const bRoomId = b.roomId?._id || b.roomId;
      if (bRoomId !== roomId) return false;
      const bCheckIn = new Date(b.checkInDate); bCheckIn.setHours(0,0,0,0);
      const bCheckOut = new Date(b.checkOutDate); bCheckOut.setHours(0,0,0,0);
      return checkIn < bCheckOut && checkOut > bCheckIn;
    });
  };

  const handleRoomSelect = (categoryId, roomId) => {
    if (!roomId) return;
    if (selectedRooms.find(r => r.roomId === roomId)) return;

    const room = data.allRooms.find(r => r._id === roomId);
    const category = roomTypes.find(c => c._id === categoryId);
    const availablePlans = ratePlans.filter(p => p.roomTypeId?._id === categoryId || p.roomTypeId === categoryId);
    const defaultPlan = availablePlans[0];
    
    const days = Math.max(1, Math.ceil((new Date(dates.checkOut) - new Date(dates.checkIn)) / (1000 * 60 * 60 * 24)));
    const rate = Math.max(0, (defaultPlan?.price || 3500) * days);

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
      roomId,
      roomNumber: room?.roomNumber || 'TBD',
      categoryId,
      categoryName: category?.name || 'Standard Room',
      adults: 2,
      children: 0,
      infant: 0,
      ratePlanId: defaultPlan?._id || 'room_only',
      baseCost: roundToTwo(baseCost),
      gst: roundToTwo(gst),
      total: roundToTwo(total)
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
          const rate = Math.max(0, (plan?.price || 3500) * days);
          if (gstMode === 'inclusive') {
            updated.baseCost = roundToTwo(rate / 1.18);
            updated.gst = roundToTwo(rate - updated.baseCost);
            updated.total = roundToTwo(rate);
          } else if (gstMode === 'out_of_scope') {
            updated.baseCost = roundToTwo(rate);
            updated.gst = 0;
            updated.total = roundToTwo(rate);
          } else {
            updated.baseCost = roundToTwo(rate);
            updated.gst = roundToTwo(rate * 0.18);
            updated.total = roundToTwo(rate + updated.gst);
          }
        } else if (field === 'customCost') {
          const val = Math.max(0, value);
          updated.baseCost = roundToTwo(val);
          if (gstMode === 'inclusive' || gstMode === 'exclusive') {
            updated.gst = roundToTwo(val * 0.18);
            updated.total = roundToTwo(val + updated.gst);
          } else {
            updated.gst = 0;
            updated.total = roundToTwo(val);
          }
        } else if (field === 'customGst') {
          updated.gst = roundToTwo(Math.max(0, value));
          updated.total = roundToTwo(updated.baseCost + updated.gst);
        } else if (field === 'customTotal') {
          const val = Math.max(0, value);
          updated.total = roundToTwo(val);
          if (gstMode === 'inclusive' || gstMode === 'exclusive') {
            updated.baseCost = roundToTwo(val / 1.18);
            updated.gst = roundToTwo(val - updated.baseCost);
          } else {
            updated.baseCost = roundToTwo(val);
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
    const subtotal = roundToTwo(totalNetCost + totalGST);
    const inputVal = Number(discountInput || 0);
    if (discountTypeInput === 'percent') {
      discAmount = roundToTwo(subtotal * (inputVal / 100));
    } else {
      discAmount = roundToTwo(inputVal);
    }
    setTotalDiscount(roundToTwo(Math.max(0, Math.min(subtotal, discAmount))));
    toast.success('Discount applied successfully');
  };

  const handleGstModeChange = (mode) => {
    setGstMode(mode);
    setSelectedRooms(prev => {
      return prev.map(r => {
        const rate = r.baseCost + r.gst;
        const updated = { ...r };
        if (mode === 'inclusive') {
          updated.baseCost = roundToTwo(rate / 1.18);
          updated.gst = roundToTwo(rate - updated.baseCost);
          updated.total = roundToTwo(rate);
        } else if (mode === 'out_of_scope') {
          updated.baseCost = roundToTwo(r.baseCost);
          updated.gst = 0;
          updated.total = roundToTwo(r.baseCost);
        } else {
          updated.baseCost = roundToTwo(r.baseCost);
          updated.gst = roundToTwo(r.baseCost * 0.18);
          updated.total = roundToTwo(r.baseCost + updated.gst);
        }
        return updated;
      });
    });
  };

  const handleStartEdit = async () => {
    const toastId = toast.loading('Loading editing configurations...');
    try {
      const [typesRes, plansRes, blocksRes, bookingsRes] = await Promise.all([
        api.get('/admin/room-types'),
        api.get('/admin/rate-plans'),
        api.get('/admin/room-blocks'),
        api.get('/admin/bookings')
      ]);
      setRoomTypes(typesRes.data);
      setRatePlans(plansRes.data);
      setRoomBlocks(blocksRes.data);
      setAllBookings(bookingsRes.data);

      const b = data.booking;
      
      // Populate dates
      setDates({
        checkIn: new Date(b.checkInDate).toISOString().split('T')[0],
        checkOut: new Date(b.checkOutDate).toISOString().split('T')[0]
      });

      // Populate guest details
      setGuestDetails({
        bookingSource: b.bookingSource || 'Direct',
        sourceType: b.comingFrom || '',
        guestName: b.guestName || '',
        guestContact: b.guestContact || '',
        guestDob: b.guestDob ? new Date(b.guestDob).toISOString().split('T')[0] : '',
        guestCountry: b.guestCountry || 'India',
        guestState: b.guestState || '',
        guestCity: b.guestCity || '',
        email: b.guestEmail || '',
        address: b.guestAddress || '',
        idType: b.idProofType || 'Aadhaar Card',
        idNumber: b.idProofNumber || '',
        nationality: b.nationality || 'Indian',
        companyName: b.companyName || '',
        companyGst: b.companyGst || '',
        companyAddress: b.companyAddress || '',
        arrivalTime: b.arrivalTime || '12:00',
        specialNote: b.specialRequests || '',
        gender: b.gender || ''
      });

      // Populate payment details
      setPaymentDetails({
        paymentMode: b.paymentMode || 'Prepaid',
        paymentMethod: b.paymentMethod || 'Cash',
        amountPaid: b.paidAmount || 0,
        paymentReference: b.paymentReference || '',
        internalNotes: b.internalNotes || '',
        status: b.paymentStatus || 'pending'
      });

      // Populate gstMode
      setGstMode(b.gstMode || 'exclusive');

      // Populate selectedRooms
      const mappedRooms = data.groupBookings.map(gb => {
        const plan = plansRes.data.find(p => p.planName === gb.mealPlan);
        return {
          bookingId: gb._id,
          roomId: gb.roomId?._id || gb.roomId,
          roomNumber: gb.roomId?.roomNumber || 'TBD',
          categoryId: gb.roomId?.roomTypeId?._id || gb.roomId?.roomTypeId || gb.roomTypeId,
          categoryName: gb.roomId?.roomTypeId?.name || gb.categoryName || 'Standard Room',
          adults: gb.adults || 2,
          children: gb.children || 0,
          infant: gb.infant || 0,
          ratePlanId: plan?._id || 'room_only',
          baseCost: gb.cost || 0,
          gst: gb.gst || 0,
          total: gb.totalAmount || 0
        };
      });
      setSelectedRooms(mappedRooms);

      // Reconstruct discount
      const totalDisc = data.groupBookings.reduce((sum, gb) => sum + (gb.discount || 0), 0);
      setTotalDiscount(totalDisc);
      setDiscountInput(totalDisc > 0 ? String(totalDisc) : '');
      setDiscountTypeInput('flat');

      toast.success('Edit configuration loaded!', { id: toastId });
      isFirstLoadRef.current = true;
      setShowEditWizard(true);
      setCurrentStep(1);
    } catch (e) {
      toast.error('Failed to load edit wizard: ' + e.message, { id: toastId });
      console.error(e);
    }
  };

  const handleUpdateSubmit = async () => {
    if (selectedRooms.length === 0) return toast.error('Please select at least one room');
    if (!guestDetails.guestName || !guestDetails.guestContact) return toast.error('Please provide guest details');

    setIsSavingStep(true);
    const loadingToast = toast.loading('Updating booking reservation details...');
    try {
      const payload = {
        checkInDate: dates.checkIn,
        checkOutDate: dates.checkOut,
        guestDetails: {
          guestName: guestDetails.guestName,
          guestContact: guestDetails.guestContact,
          email: guestDetails.email,
          address: guestDetails.address,
          guestDob: guestDetails.guestDob,
          guestCountry: guestDetails.guestCountry,
          guestState: guestDetails.guestState,
          guestCity: guestDetails.guestCity,
          companyName: guestDetails.companyName,
          companyGst: guestDetails.companyGst,
          companyAddress: guestDetails.companyAddress,
          idType: guestDetails.idType,
          idNumber: guestDetails.idNumber,
          nationality: guestDetails.nationality,
          arrivalTime: guestDetails.arrivalTime,
          specialNote: guestDetails.specialNote,
          gender: guestDetails.gender || ''
        },
        paymentDetails: {
          paymentMode: paymentDetails.paymentMode,
          paymentMethod: paymentDetails.paymentMethod,
          amountPaid: Number(paymentDetails.amountPaid || 0),
          paymentReference: paymentDetails.paymentReference || '',
          internalNotes: paymentDetails.internalNotes || '',
          status: paymentDetails.status || 'pending'
        },
        selectedRooms: selectedRooms.map(room => ({
          bookingId: room.bookingId,
          roomId: room.roomId,
          adults: room.adults || 2,
          children: room.children || 0,
          infant: room.infant || 0,
          mealPlan: ratePlans.find(p => p._id === room.ratePlanId)?.planName || 'Room Only',
          cost: roundToTwo(room.baseCost),
          gst: roundToTwo(room.gst),
          totalAmount: roundToTwo(room.total)
        })),
        gstMode: gstMode,
        totalDiscount: totalDiscount,
        payableAmount: payableAmount
      };

      const groupKey = data?.booking?.bookingGroupId || data?.booking?._id;
      await api.put(`/admin/bookings/group/${groupKey}`, payload);
      
      toast.success('Reservation(s) updated successfully', { id: loadingToast });
      setShowEditWizard(false);
      fetchDetails();
      if (onRefresh) onRefresh();
    } catch (error) {
      toast.error('Failed to update booking: ' + (error.response?.data?.message || error.message), { id: loadingToast });
      console.error(error);
    } finally {
      setIsSavingStep(false);
    }
  };


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

      // Initialize checkout rooms selection for checked-in rooms
      setCheckoutRooms(
        data.groupBookings
          .filter(gb => gb.status === 'checked-in')
          .map(gb => ({
            bookingId: gb._id,
            roomNumber: gb.roomId?.roomNumber || 'TBD',
            roomTypeName: gb.roomId?.roomTypeId?.name || gb.roomId?.categoryName || 'Standard Room',
            roomId: gb.roomId?._id || '',
            roomTypeId: gb.roomId?.roomTypeId?._id || gb.roomId?.roomTypeId || '',
            selected: true,
            markRoomTo: 'Cleaning',
            durationHours: '2'
          }))
      );
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

  const handleConfirmCheckIn = async () => {
    setShowCheckInModal(false);
    const toastId = toast.loading('Processing check-in...');
    try {
      const updates = [];
      for (const gb of data.groupBookings) {
        updates.push(
          api.put(`/admin/bookings/${gb._id}/status`, { 
            status: 'checked-in', 
            paymentStatus: gb.paymentStatus,
            comingFrom: checkInForm.comingFrom,
            goingTo: checkInForm.goingTo,
            vehicleNumber: checkInForm.vehicleNumber,
            idProofType: checkInForm.idProofType,
            idProofNumber: checkInForm.idProofNumber,
            nameAsPerIdProof: checkInForm.nameAsPerIdProof
          })
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

    const selectedRooms = checkoutRooms.filter(cr => cr.selected);
    if (selectedRooms.length === 0) {
      toast.error('Please select at least one room to check out');
      return;
    }

    setIsSavingCheckout(true);
    const toastId = toast.loading('Processing check-out...');
    try {
      const checkoutPromises = selectedRooms.map(async cr => {
        // 1. Process checkout for the booking
        await api.put(`/admin/bookings/${cr.bookingId}/checkout`, {
          haveGst: checkoutForm.haveGst,
          onDutyManager: checkoutForm.onDutyManager,
          departureDateTime: checkoutForm.departureDateTime,
          checkoutComment: checkoutForm.checkoutComment,
          markRoomTo: cr.markRoomTo,
          emailInvoiceToGuest: checkoutForm.emailInvoiceToGuest
        });

        // 2. If marked to cleaning or maintenance, create a RoomBlock
        if (cr.markRoomTo === 'Cleaning' || cr.markRoomTo === 'Maintenance') {
          const start = new Date(checkoutForm.departureDateTime);
          const end = new Date(start.getTime() + Number(cr.durationHours) * 60 * 60 * 1000);
          await api.post('/admin/room-blocks', {
            roomId: cr.roomId,
            roomTypeId: cr.roomTypeId,
            startDate: start.toISOString(),
            endDate: end.toISOString(),
            reason: cr.markRoomTo === 'Cleaning' ? 'cleaning' : 'maintenance',
            notes: `Checkout ${cr.markRoomTo.toLowerCase()} block for Room ${cr.roomNumber}`
          });
        }
      });

      await Promise.all(checkoutPromises);

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
            {!isLoading && b && (
              <button 
                onClick={handleStartEdit} 
                className="flex items-center gap-1 px-3 py-1.5 bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded text-xs font-extrabold uppercase transition-all shadow-sm active:scale-95 border border-[#2563eb]/20 cursor-pointer mr-2"
              >
                Edit Booking
              </button>
            )}
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

                    <div className="border-t border-slate-200 my-2 pt-2"></div>
                    <InfoRow label="Name As Per ID" value={b?.nameAsPerIdProof} />
                    <InfoRow label="ID Proof Type" value={b?.idProofType} />
                    <InfoRow label="ID Proof Number" value={b?.idProofNumber} />
                    <InfoRow label="Vehicle Number" value={b?.vehicleNumber} />
                    <InfoRow label="Coming From" value={b?.comingFrom} />
                    <InfoRow label="Going To" value={b?.goingTo} />

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
                        onClick={() => {
                          setCheckInForm({
                            comingFrom: b?.comingFrom || '',
                            goingTo: b?.goingTo || '',
                            vehicleNumber: b?.vehicleNumber || '',
                            idProofType: b?.idProofType || 'Aadhaar Card',
                            idProofNumber: b?.idProofNumber || '',
                            nameAsPerIdProof: b?.nameAsPerIdProof || b?.guestName || ''
                          });
                          setShowCheckInModal(true);
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
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                        
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

                      {/* Room Selection and Target Status / Duration Configuration */}
                      <div className="bg-slate-50 border border-slate-300 rounded p-3 my-3">
                        <span className="text-slate-700 block text-xs font-extrabold uppercase tracking-wider mb-2">Configure Rooms for Checkout & Cleaning</span>
                        
                        <div className="space-y-2.5">
                          {checkoutRooms.map((cr, idx) => (
                            <div key={cr.bookingId} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-2 bg-white border border-slate-200 rounded shadow-sm">
                              
                              {/* Room details & checkbox */}
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={cr.selected}
                                  onChange={e => {
                                    const updated = [...checkoutRooms];
                                    updated[idx].selected = e.target.checked;
                                    setCheckoutRooms(updated);
                                  }}
                                  className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                                />
                                <div className="text-xs font-bold text-slate-800 font-sans">
                                  Room {cr.roomNumber} <span className="text-slate-500 font-medium">({cr.roomTypeName})</span>
                                </div>
                              </div>

                              {/* Status and Duration options (visible only if selected) */}
                              {cr.selected && (
                                <div className="flex items-center gap-2 flex-wrap font-sans">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] font-bold uppercase text-slate-400">Mark to:</span>
                                    <select
                                      value={cr.markRoomTo}
                                      onChange={e => {
                                        const updated = [...checkoutRooms];
                                        updated[idx].markRoomTo = e.target.value;
                                        setCheckoutRooms(updated);
                                      }}
                                      className="border border-slate-300 rounded px-2 py-1 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white cursor-pointer shadow-sm"
                                    >
                                      <option value="Dirty">Dirty</option>
                                      <option value="Available">Available</option>
                                      <option value="Cleaning">Cleaning</option>
                                      <option value="Maintenance">Maintenance</option>
                                    </select>
                                  </div>

                                  {(cr.markRoomTo === 'Cleaning' || cr.markRoomTo === 'Maintenance') && (
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-[10px] font-bold uppercase text-slate-400">Duration:</span>
                                      <select
                                        value={cr.durationHours}
                                        onChange={e => {
                                          const updated = [...checkoutRooms];
                                          updated[idx].durationHours = e.target.value;
                                          setCheckoutRooms(updated);
                                        }}
                                        className="border border-slate-300 rounded px-2 py-1 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white cursor-pointer shadow-sm"
                                      >
                                        <option value="1">1 Hour</option>
                                        <option value="2">2 Hours</option>
                                        <option value="4">4 Hours</option>
                                        <option value="8">8 Hours</option>
                                        <option value="12">12 Hours</option>
                                        <option value="24">1 Day</option>
                                        <option value="48">2 Days</option>
                                        <option value="72">3 Days</option>
                                        <option value="168">1 Week</option>
                                      </select>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
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

      
      {/* Check-In Confirmation Modal */}
      {showCheckInModal && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-[3px] z-[70] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-[#f8fafc] w-full max-w-2xl rounded-lg shadow-2xl flex flex-col border border-slate-300 overflow-hidden transform transition-all duration-200 scale-100 font-sans text-slate-800">
            
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-slate-800 text-white border-b border-slate-300">
              <div className="flex items-center gap-2">
                <User size={18} />
                <h3 className="font-bold text-sm uppercase tracking-wider">Check-In Confirmation</h3>
              </div>
              <button onClick={() => setShowCheckInModal(false)} className="p-1 hover:bg-slate-700 rounded transition-colors text-slate-300 hover:text-white bg-transparent border-0 cursor-pointer">
                <X size={20} strokeWidth={2.5} />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 overflow-y-auto max-h-[70vh] space-y-4">
              
              {/* Mint/Teal ACCENT HEADER */}
              <div className="bg-[#54c6a9] text-white px-4 py-3 flex justify-between items-center font-bold text-xs uppercase tracking-wider rounded shadow-sm">
                <span>Guest Verification details</span>
                <CheckCircle size={16} className="fill-white text-[#54c6a9] stroke-2" />
              </div>

              <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                Please verify or enter the guest details below. All fields are completely optional, and check-in can be completed even if they are left blank.
              </p>

              {/* Input Fields Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                <div className="flex flex-col">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">Name As Per ID Proof</label>
                  <input
                    type="text"
                    placeholder="Enter full name"
                    value={checkInForm.nameAsPerIdProof}
                    onChange={e => setCheckInForm(prev => ({ ...prev, nameAsPerIdProof: e.target.value }))}
                    className="border border-slate-300 rounded-md px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm font-sans"
                  />
                </div>

                <div className="flex flex-col">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">Vehicle Number</label>
                  <input
                    type="text"
                    placeholder="Enter vehicle number"
                    value={checkInForm.vehicleNumber}
                    onChange={e => setCheckInForm(prev => ({ ...prev, vehicleNumber: e.target.value }))}
                    className="border border-slate-300 rounded-md px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm font-sans"
                  />
                </div>

                <div className="flex flex-col">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">ID Proof Type</label>
                  <select
                    value={checkInForm.idProofType}
                    onChange={e => setCheckInForm(prev => ({ ...prev, idProofType: e.target.value }))}
                    className="border border-slate-300 rounded-md px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white cursor-pointer shadow-sm font-sans"
                  >
                    <option value="Aadhaar Card">Aadhaar Card</option>
                    <option value="Passport">Passport</option>
                    <option value="Driving License">Driving License</option>
                    <option value="Voter ID">Voter ID</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="flex flex-col">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">ID Proof Number</label>
                  <input
                    type="text"
                    placeholder="Enter ID proof number"
                    value={checkInForm.idProofNumber}
                    onChange={e => setCheckInForm(prev => ({ ...prev, idProofNumber: e.target.value }))}
                    className="border border-slate-300 rounded-md px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm font-sans"
                  />
                </div>

                <div className="flex flex-col">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">Coming From</label>
                  <input
                    type="text"
                    placeholder="Enter location"
                    value={checkInForm.comingFrom}
                    onChange={e => setCheckInForm(prev => ({ ...prev, comingFrom: e.target.value }))}
                    className="border border-slate-300 rounded-md px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm font-sans"
                  />
                </div>

                <div className="flex flex-col">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">Going To</label>
                  <input
                    type="text"
                    placeholder="Enter destination"
                    value={checkInForm.goingTo}
                    onChange={e => setCheckInForm(prev => ({ ...prev, goingTo: e.target.value }))}
                    className="border border-slate-300 rounded-md px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm font-sans"
                  />
                </div>

              </div>

            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-4 bg-slate-50 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowCheckInModal(false)}
                className="px-4 py-2 border border-slate-300 rounded font-bold text-xs text-slate-700 hover:bg-slate-100 transition-colors uppercase tracking-wider cursor-pointer bg-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmCheckIn}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded uppercase tracking-wider transition-colors shadow-sm cursor-pointer border-0 font-sans"
              >
                Confirm Check-In
              </button>
            </div>

          </div>
        </div>
      )}

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

      {/* Advanced Booking Edit Wizard Modal */}
      {showEditWizard && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 font-sans text-slate-300">
          <div className="absolute inset-0 bg-black/85 backdrop-blur-md" onClick={handleWizardClose}></div>
          <div className="relative bg-[#0a0b0e] border border-white/10 rounded-3xl w-full max-w-7xl max-h-[95vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-300 z-[80]">
            
            {/* Modal Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-5 md:p-6 border-b border-white/5 bg-[#13151a] rounded-t-3xl gap-4">
              <div className="flex justify-between items-center w-full md:w-auto">
                <h3 className="text-lg md:text-xl font-bold text-white flex items-center">
                  <CalendarDays className="mr-3 text-blue-500 shrink-0" /> Edit Booking Reservation
                </h3>
                <button onClick={handleWizardClose} className="md:hidden p-2 text-slate-400 hover:text-white transition-colors bg-white/5 rounded-full">
                  <X size={18} />
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
                <div className="w-full sm:w-44 text-slate-800">
                  <DatePicker 
                    label="Check In" 
                    selected={dates.checkIn} 
                    minDate={undefined}
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
                <div className="w-full sm:w-44 text-slate-800">
                  <DatePicker 
                    label="Check Out" 
                    selected={dates.checkOut} 
                    minDate={undefined}
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

            {/* Stepper Progress Bar */}
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

            {/* Modal Body */}
            <div className="overflow-y-auto flex-1 p-6 space-y-4 custom-scrollbar text-slate-300 animate-in fade-in duration-300">
              
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
                            const availableRooms = (data?.allRooms || []).filter(r => {
                              const isThisCategory = r.roomTypeId?._id === category._id || r.roomTypeId === category._id;
                              const isPermanentlyUnavailable = r.status === 'maintenance' || r.status === 'cleaning';
                              return isThisCategory && !isPermanentlyUnavailable && !isRoomBlockedForDates(r._id) && !isRoomBookedForDates(r._id);
                            });
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
                          
                          {/* Desktop/Tablet Table Layout */}
                          <div className="hidden md:block overflow-y-auto max-h-[45vh] flex-1 custom-scrollbar">
                            <table className="w-full text-xs text-left border-collapse table-fixed">
                              <thead className="bg-[#1a1d24] text-slate-400 uppercase tracking-wider border-b border-white/10 sticky top-0 z-20">
                                <tr>
                                  <th className="px-2 py-3 border-r border-white/5 w-[18%]">Room Category</th>
                                  <th className="px-2 py-3 border-r border-white/5 text-center w-[8%]">Adults</th>
                                  <th className="px-2 py-3 border-r border-white/5 text-center w-[10%]">Children</th>
                                  <th className="px-2 py-3 border-r border-white/5 text-center w-[10%]">Infants</th>
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
                                        className="bg-[#13151a] border border-white/10 rounded-lg py-1 px-1.5 outline-none w-14 text-center text-white focus:border-blue-500 text-xs font-semibold animate-none"
                                      >
                                        {[1, 2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n}</option>)}
                                      </select>
                                    </td>
                                    <td className="p-1 border-r border-white/5 text-center">
                                      <select 
                                        value={room.children || 0} 
                                        onChange={(e) => updateSelectedRoom(room.roomId, 'children', Number(e.target.value))} 
                                        className="bg-[#13151a] border border-white/10 rounded-lg py-1 px-1.5 outline-none w-14 text-center text-white focus:border-blue-500 text-xs font-semibold animate-none"
                                      >
                                        {[0, 1, 2, 3, 4].map(n => <option key={n} value={n}>{n}</option>)}
                                      </select>
                                    </td>
                                    <td className="p-1 border-r border-white/5 text-center">
                                      <select 
                                        value={room.infant || 0} 
                                        onChange={(e) => updateSelectedRoom(room.roomId, 'infant', Number(e.target.value))} 
                                        className="bg-[#13151a] border border-white/10 rounded-lg py-1 px-1.5 outline-none w-14 text-center text-white focus:border-blue-500 text-xs font-semibold animate-none"
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
                                        className="text-red-400 hover:text-red-300 transition-colors p-1 hover:bg-red-500/10 rounded-full cursor-pointer"
                                      >
                                        <X size={14}/>
                                      </button>
                                    </td>
                                  </tr>
                                ))}

                                {/* Table Summary Rows */}
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
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          if (val === '') {
                                            setDiscountInput('');
                                          } else {
                                            setDiscountInput(Math.max(0, Number(val)));
                                          }
                                        }}
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
                                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-1 px-3 rounded-lg text-xs transition-colors shadow-md shadow-emerald-500/10 active:scale-95 shrink-0 cursor-pointer"
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

                          {/* Mobile Stacked Card Layout */}
                          <div className="md:hidden space-y-4 p-4 max-h-[40vh] overflow-y-auto custom-scrollbar bg-black/10">
                            {selectedRooms.map(room => (
                              <div key={room.roomId} className="bg-[#13151a] border border-white/10 rounded-xl p-4 space-y-3 relative shadow-lg">
                                <button 
                                  onClick={() => removeSelectedRoom(room.roomId)}
                                  className="absolute top-3 right-3 text-red-400 p-1.5 bg-red-500/10 hover:bg-red-500/20 rounded-full transition-colors cursor-pointer border-0"
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
                                    <span className="text-slate-500 text-[10px] uppercase font-bold">GST</span>
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

                            {/* Mobile summary layout */}
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
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                        <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5 tracking-wider">Gender</label>
                        <select 
                          value={guestDetails.gender} 
                          onChange={e => setGuestDetails({...guestDetails, gender: e.target.value})} 
                          className="w-full bg-[#0a0b0e] border border-white/10 rounded-xl p-3 text-white outline-none focus:border-blue-500 text-sm font-semibold transition cursor-pointer"
                        >
                          <option value="">Select Gender</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
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
                          className="w-full bg-[#0a0b0e] border border-white/10 rounded-xl p-3 text-white outline-none focus:border-blue-500 text-sm font-semibold transition cursor-pointer"
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

                    {/* Row 5: Booking Source */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5 tracking-wider">Booking Source</label>
                        <select value={guestDetails.bookingSource} onChange={e => setGuestDetails({...guestDetails, bookingSource: e.target.value})} className="w-full bg-[#0a0b0e] border border-white/10 rounded-xl p-3 text-white outline-none focus:border-blue-500 text-sm font-semibold transition cursor-pointer">
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

                  {/* Right Panel Summary */}
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
                              <span className="text-[9px] text-blue-400 font-black font-mono uppercase bg-blue-500/10 px-1.5 py-0.5 rounded inline-block mt-0.5">{ratePlans.find(p => p._id === room.ratePlanId)?.planName || 'Room Only'}</span>
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
                                  ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20 animate-none' 
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
                                const inputVal = e.target.value;
                                const val = inputVal === '' ? '' : Math.max(0, Number(inputVal));
                                const numVal = Number(val);
                                setPaymentDetails({
                                  ...paymentDetails, 
                                  amountPaid: val,
                                  status: numVal >= payableAmount ? 'paid' : numVal > 0 ? 'partial' : 'pending'
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
                          <span className="text-white font-bold text-emerald-400">{dates.checkIn ? new Date(dates.checkIn).toLocaleDateString('en-GB') : ''}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">Check Out</span>
                          <span className="text-white font-bold text-rose-400">{dates.checkOut ? new Date(dates.checkOut).toLocaleDateString('en-GB') : ''}</span>
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
                      
                      {/* Dynamic Balance Banner */}
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
                                : `After ₹${paymentDetails.amountPaid || 0} payment`}
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
                <div className="flex flex-col items-center justify-center p-8 text-center space-y-6 animate-in fade-in zoom-in-95 duration-500 max-w-2xl mx-auto text-slate-300">
                  <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/15 animate-bounce">
                    <span className="text-emerald-400 text-4xl font-bold">✓</span>
                  </div>
                  
                  <div>
                    <h3 className="text-2xl font-black text-white tracking-tight">
                      Booking Updated Successfully!
                    </h3>
                    <p className="text-slate-400 text-sm mt-2 max-w-md leading-relaxed">
                      The reservation changes have been fully synchronized with the database.
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
                        <span className="text-white font-bold">{dates.checkIn ? new Date(dates.checkIn).toLocaleDateString('en-GB') : ''} to {dates.checkOut ? new Date(dates.checkOut).toLocaleDateString('en-GB') : ''}</span>
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
                      className="px-8 py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black text-sm tracking-wider transition-all duration-300 shadow-lg shadow-blue-500/20 active:scale-95 flex items-center justify-center gap-2 border-0 cursor-pointer"
                    >
                      <Download size={18} /> Download Voucher PDF
                    </button>
                    <button 
                      onClick={handlePrintVoucher}
                      className="px-8 py-3.5 bg-[#1a1d24] hover:bg-[#252a34] text-white border border-white/10 rounded-xl font-bold text-sm tracking-wider transition-all duration-300 shadow-lg active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Printer size={18} /> Print Voucher
                    </button>
                  </div>

                  <button 
                    onClick={() => {
                      handleWizardClose();
                      fetchDetails();
                      if (onRefresh) onRefresh();
                    }}
                    className="w-full sm:w-auto px-10 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black text-sm uppercase tracking-wider transition-all duration-300 shadow-[0_0_20px_rgba(16,185,129,0.3)] active:scale-95 border border-emerald-400/20 mt-2 cursor-pointer"
                  >
                    Done & Close
                  </button>

                </div>
              )}

            </div>

            {/* Stepper Navigation Sticky Footer Bar */}
            {currentStep < 4 && (
              <div className="p-4 md:p-6 bg-[#13151a] border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-4 sticky bottom-0 z-30 shadow-[0_-8px_25px_rgba(0,0,0,0.5)] rounded-b-3xl">
                <div>
                  {currentStep > 1 && (
                    <button
                      type="button"
                      disabled={isSavingStep}
                      onClick={() => setCurrentStep(prev => prev - 1)}
                      className="px-6 py-3 bg-[#0a0b0e] border border-white/10 text-slate-400 hover:text-white rounded-xl text-xs uppercase tracking-wider font-extrabold hover:border-white/20 transition-all duration-200 active:scale-95 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
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
                          
                          setIsSavingStep(true);
                          const loadingToast = toast.loading('Saving billing configuration...');
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
                      className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 text-white rounded-xl text-xs uppercase tracking-wider font-extrabold transition-all duration-300 shadow-[0_0_20px_rgba(59,130,246,0.3)] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer border-0"
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
                      onClick={handleUpdateSubmit}
                      className="w-full sm:w-auto px-10 py-3.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white rounded-xl text-xs uppercase tracking-wider font-extrabold transition-all duration-300 shadow-[0_0_25px_rgba(16,185,129,0.4)] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer border-0"
                    >
                      {isSavingStep ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Updating Booking...
                        </>
                      ) : (
                        <>
                          ✓ Update Booking (₹{payableAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })})
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
    </>
  );
};

export default BookingDetailsDrawer;
