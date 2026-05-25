import React, { forwardRef } from 'react';

const BookingVoucher = forwardRef(({ 
  bookingId, 
  guestDetails, 
  paymentDetails, 
  selectedRooms, 
  dates, 
  totalNetCost, 
  totalGST, 
  totalDiscount, 
  payableAmount,
  hotelProfile 
}, ref) => {
  const checkIn = new Date(dates.checkIn);
  const checkOut = new Date(dates.checkOut);
  const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
  
  return (
    <div className="fixed inset-0 pointer-events-none opacity-0 -z-50 overflow-hidden flex justify-center items-start">
      <div 
        ref={ref} 
        className="bg-white w-[210mm] min-h-[297mm] p-10 text-slate-800 print-area flex flex-col font-sans"
      >
        {/* Header */}
        <div className="flex justify-between items-start border-b-2 border-slate-200 pb-6 mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-slate-800 rounded flex items-center justify-center text-white font-bold text-xl tracking-wider">
                {hotelProfile?.name?.charAt(0) || 'H'}
              </div>
              <div>
                <h1 className="text-2xl font-black text-slate-800 tracking-tight">{hotelProfile?.name || 'Grand Hotel & Suites'}</h1>
                <p className="text-xs text-slate-500 font-medium">{hotelProfile?.address || '123 Luxury Avenue, Metropolis, NY 10001'}</p>
              </div>
            </div>
          </div>
          <div className="text-right">
            <h2 className="text-xl font-black text-blue-600 uppercase tracking-widest mb-1">Booking Voucher</h2>
            <div className="text-sm font-semibold">
              <p>Booking ID: <span className="font-bold text-slate-900">{bookingId}</span></p>
              <p>Date: <span className="font-bold text-slate-900">{new Date().toLocaleDateString('en-GB')}</span></p>
            </div>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-6 mb-8">
          {/* Guest Details */}
          <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
            <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest mb-3 border-b border-slate-200 pb-2">Guest Details</h3>
            <div className="space-y-2 text-sm">
              <p className="flex justify-between"><span className="font-medium text-slate-500">Name:</span> <span className="font-bold">{guestDetails.guestName}</span></p>
              <p className="flex justify-between"><span className="font-medium text-slate-500">Mobile:</span> <span className="font-bold">{guestDetails.guestContact}</span></p>
              {guestDetails.email && <p className="flex justify-between"><span className="font-medium text-slate-500">Email:</span> <span className="font-bold">{guestDetails.email}</span></p>}
              <p className="flex justify-between"><span className="font-medium text-slate-500">Source:</span> <span className="font-bold">{guestDetails.bookingSource} {guestDetails.sourceType && `(${guestDetails.sourceType})`}</span></p>
            </div>
          </div>

          {/* Booking Details */}
          <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
            <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest mb-3 border-b border-slate-200 pb-2">Stay Details</h3>
            <div className="space-y-2 text-sm">
              <p className="flex justify-between"><span className="font-medium text-slate-500">Check In:</span> <span className="font-bold text-emerald-600">{checkIn.toLocaleDateString('en-GB')}</span></p>
              <p className="flex justify-between"><span className="font-medium text-slate-500">Check Out:</span> <span className="font-bold text-rose-600">{checkOut.toLocaleDateString('en-GB')}</span></p>
              <p className="flex justify-between"><span className="font-medium text-slate-500">Duration:</span> <span className="font-bold">{nights} Nights</span></p>
              <p className="flex justify-between"><span className="font-medium text-slate-500">Total Rooms:</span> <span className="font-bold">{selectedRooms.length}</span></p>
            </div>
          </div>
        </div>

        {/* Company Details (Conditional) */}
        {paymentDetails.paymentMode === 'Bill To Company' && guestDetails.companyName && (
          <div className="bg-blue-50 rounded-xl p-5 border border-blue-100 mb-8">
            <h3 className="text-xs font-black uppercase text-blue-400 tracking-widest mb-3 border-b border-blue-100 pb-2">Corporate Billing Details</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <p><span className="font-medium text-slate-500">Company Name:</span> <span className="font-bold">{guestDetails.companyName}</span></p>
              <p><span className="font-medium text-slate-500">GST Number:</span> <span className="font-bold">{guestDetails.companyGst || 'N/A'}</span></p>
              <p className="col-span-2"><span className="font-medium text-slate-500">Address:</span> <span className="font-bold">{guestDetails.companyAddress || 'N/A'}</span></p>
            </div>
          </div>
        )}

        {/* Room Table */}
        <div className="mb-8">
          <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest mb-3">Room Configuration</h3>
          <table className="w-full text-sm border-collapse border border-slate-200 rounded-lg overflow-hidden">
            <thead>
              <tr className="bg-slate-100 text-slate-600 text-xs uppercase tracking-wider font-bold">
                <th className="p-3 border border-slate-200 text-left">SR</th>
                <th className="p-3 border border-slate-200 text-left">Category</th>
                <th className="p-3 border border-slate-200 text-center">Pax (A/C/I)</th>
                <th className="p-3 border border-slate-200 text-center">Meal Plan</th>
                <th className="p-3 border border-slate-200 text-right">Net Cost</th>
                <th className="p-3 border border-slate-200 text-right">GST</th>
                <th className="p-3 border border-slate-200 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {selectedRooms.map((room, index) => (
                <tr key={index} className="text-slate-800 font-medium">
                  <td className="p-3 border border-slate-200 text-center">{index + 1}</td>
                  <td className="p-3 border border-slate-200">
                    Room {room.roomNumber} <br/>
                    <span className="text-[10px] text-slate-500 font-bold uppercase">{room.categoryName}</span>
                  </td>
                  <td className="p-3 border border-slate-200 text-center whitespace-nowrap">
                    {room.adults || 2}A / {room.children || 0}C / {room.infant || 0}I
                  </td>
                  <td className="p-3 border border-slate-200 text-center">
                    <span className="bg-slate-100 px-2 py-1 rounded text-xs font-bold">{room.mealPlan || 'Room Only'}</span>
                  </td>
                  <td className="p-3 border border-slate-200 text-right">₹{Number(room.baseCost).toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                  <td className="p-3 border border-slate-200 text-right">₹{Number(room.gst).toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                  <td className="p-3 border border-slate-200 text-right font-bold text-blue-600">₹{Number(room.total).toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Payment Summary */}
        <div className="grid grid-cols-2 gap-8 mb-8 mt-auto">
          {/* Notes & Policies */}
          <div className="space-y-4">
            {guestDetails.specialNote && (
              <div>
                <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest mb-1">Special Notes</h3>
                <p className="text-sm font-medium bg-amber-50 text-amber-800 p-3 rounded-lg border border-amber-200">{guestDetails.specialNote}</p>
              </div>
            )}
            {paymentDetails.internalNotes && (
              <div>
                <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest mb-1">Billing Notes</h3>
                <p className="text-sm font-medium bg-blue-50 text-blue-800 p-3 rounded-lg border border-blue-200">{paymentDetails.internalNotes}</p>
              </div>
            )}
            <div>
              <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Important Info</h3>
              <ul className="text-[10px] text-slate-500 font-medium list-disc pl-4 space-y-1">
                <li>Check-in is from 14:00. Check-out is strictly by 11:00.</li>
                <li>Please present valid government ID upon arrival.</li>
                <li>Cancellation policies apply as per standard hotel rules.</li>
              </ul>
            </div>
          </div>

          {/* Financial Totals */}
          <div>
            <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
              <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest mb-3 border-b border-slate-200 pb-2">Payment Summary</h3>
              
              <div className="space-y-2 text-sm mb-4">
                <p className="flex justify-between"><span className="font-medium text-slate-500">Total Net Cost:</span> <span className="font-bold">₹{totalNetCost.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span></p>
                <p className="flex justify-between"><span className="font-medium text-slate-500">Total GST:</span> <span className="font-bold">₹{totalGST.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span></p>
                {totalDiscount > 0 && (
                  <p className="flex justify-between text-rose-600"><span className="font-medium">Discount Applied:</span> <span className="font-bold">- ₹{totalDiscount.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span></p>
                )}
                <div className="border-t border-slate-200 pt-2 my-2"></div>
                <p className="flex justify-between items-center"><span className="font-black text-slate-800 uppercase tracking-wider text-xs">Total Payable:</span> <span className="font-black text-lg text-slate-900">₹{payableAmount.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span></p>
              </div>

              <div className="bg-slate-800 text-white rounded-lg p-4">
                <p className="flex justify-between text-xs mb-1 opacity-80"><span className="uppercase tracking-wider font-bold">Mode</span> <span className="uppercase tracking-wider font-bold">{paymentDetails.paymentMode}</span></p>
                
                <p className="flex justify-between items-center mb-2">
                  <span className="font-medium">Amount Paid</span>
                  <span className="font-bold text-emerald-400 text-lg">₹{Number(paymentDetails.amountPaid || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                </p>

                <p className="flex justify-between items-center border-t border-slate-600 pt-2">
                  <span className="font-medium text-amber-200 text-xs uppercase tracking-wider">Balance Pending</span>
                  <span className="font-black text-amber-400">₹{Math.max(0, payableAmount - (paymentDetails.amountPaid || 0)).toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-auto pt-6 border-t border-slate-200 text-center">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Computer Generated Document</p>
          <p className="text-[10px] text-slate-400">Thank you for choosing {hotelProfile?.name || 'Grand Hotel & Suites'}. We look forward to hosting you!</p>
        </div>
      </div>
    </div>
  );
});

BookingVoucher.displayName = 'BookingVoucher';

export default BookingVoucher;
