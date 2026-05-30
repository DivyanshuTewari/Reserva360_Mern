import React, { forwardRef } from 'react';
import { createPortal } from 'react-dom';

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
  hotelProfile,
  title,
  extraServices = []
}, ref) => {
  const checkIn = new Date(dates.checkIn);
  const checkOut = new Date(dates.checkOut);
  const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
  
  return createPortal(
    <div className="fixed inset-0 pointer-events-none opacity-0 -z-50 overflow-hidden flex justify-center items-start print-voucher-wrapper">
      <div 
        ref={ref} 
        className="bg-white w-[210mm] p-6 text-slate-800 print-area font-sans box-border"
        style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}
      >
        {/* Header */}
        <div className="flex justify-between items-start border-b-2 border-slate-200 pb-3 mb-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 bg-slate-800 rounded flex items-center justify-center text-white font-bold text-lg tracking-wider">
                {hotelProfile?.name?.charAt(0) || 'H'}
              </div>
              <div>
                <h1 className="text-xl font-black text-slate-800 tracking-tight">{hotelProfile?.name || 'Grand Hotel & Suites'}</h1>
                <p className="text-[10px] text-slate-500 font-medium">{hotelProfile?.address || '123 Luxury Avenue, Metropolis, NY 10001'}</p>
              </div>
            </div>
          </div>
          <div className="text-right">
            <h2 className="text-lg font-black text-blue-600 uppercase tracking-widest mb-0.5">{title || 'Booking Voucher'}</h2>
            <div className="text-xs font-semibold text-slate-700">
              <p>Booking ID: <span className="font-bold text-slate-900">{bookingId}</span></p>
              <p>Date: <span className="font-bold text-slate-900">{new Date().toLocaleDateString('en-GB')}</span></p>
            </div>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          {/* Guest Details */}
          <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 shadow-sm">
            <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 border-b border-slate-200 pb-1">Guest Details</h3>
            <div className="space-y-1 text-xs">
              <p className="flex justify-between"><span className="font-medium text-slate-500 font-sans">Name:</span> <span className="font-bold text-slate-900 uppercase">{guestDetails.guestName}</span></p>
              <p className="flex justify-between"><span className="font-medium text-slate-500 font-sans">Mobile:</span> <span className="font-bold text-slate-900">{guestDetails.guestContact}</span></p>
              {guestDetails.email && <p className="flex justify-between"><span className="font-medium text-slate-500 font-sans">Email:</span> <span className="font-bold text-slate-900">{guestDetails.email}</span></p>}
              <p className="flex justify-between"><span className="font-medium text-slate-500 font-sans">Source:</span> <span className="font-bold text-slate-900">{guestDetails.bookingSource} {guestDetails.sourceType && `(${guestDetails.sourceType})`}</span></p>
            </div>
          </div>

          {/* Booking Details */}
          <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 shadow-sm">
            <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 border-b border-slate-200 pb-1">Stay Details</h3>
            <div className="space-y-1 text-xs">
              <p className="flex justify-between"><span className="font-medium text-slate-500 font-sans">Check In:</span> <span className="font-bold text-emerald-600">{checkIn.toLocaleDateString('en-GB')}</span></p>
              <p className="flex justify-between"><span className="font-medium text-slate-500 font-sans">Check Out:</span> <span className="font-bold text-rose-600">{checkOut.toLocaleDateString('en-GB')}</span></p>
              <p className="flex justify-between"><span className="font-medium text-slate-500 font-sans">Duration:</span> <span className="font-bold text-slate-900">{nights} Nights</span></p>
              <p className="flex justify-between"><span className="font-medium text-slate-500 font-sans">Total Rooms:</span> <span className="font-bold text-slate-900">{selectedRooms.length}</span></p>
            </div>
          </div>
        </div>

        {/* Company Details (Conditional) */}
        {paymentDetails.paymentMode === 'Bill To Company' && guestDetails.companyName && (
          <div className="bg-blue-50 rounded-lg p-3 border border-blue-100 mb-4 shadow-sm animate-in fade-in duration-250">
            <h3 className="text-[10px] font-black uppercase text-blue-400 tracking-widest mb-1.5 border-b border-blue-100 pb-1">Corporate Billing Details</h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <p><span className="font-medium text-slate-500 font-sans">Company Name:</span> <span className="font-bold text-slate-900">{guestDetails.companyName}</span></p>
              <p><span className="font-medium text-slate-500 font-sans">GST Number:</span> <span className="font-bold text-slate-900">{guestDetails.companyGst || 'N/A'}</span></p>
              <p className="col-span-2"><span className="font-medium text-slate-500 font-sans">Address:</span> <span className="font-bold text-slate-900">{guestDetails.companyAddress || 'N/A'}</span></p>
            </div>
          </div>
        )}

        {/* Room Table */}
        <div className="mb-4">
          <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 font-sans">Room Configuration</h3>
          <table className="w-full text-xs border-collapse border border-slate-200 rounded-lg overflow-hidden shadow-sm">
            <thead>
              <tr className="bg-slate-100 text-slate-600 text-[10px] uppercase tracking-wider font-bold">
                <th className="p-1.5 border border-slate-200 text-left">SR</th>
                <th className="p-1.5 border border-slate-200 text-left">Category</th>
                <th className="p-1.5 border border-slate-200 text-center">Pax (A/C/I)</th>
                <th className="p-1.5 border border-slate-200 text-center">Meal Plan</th>
                <th className="p-1.5 border border-slate-200 text-right">Net Cost</th>
                <th className="p-1.5 border border-slate-200 text-right">GST</th>
                <th className="p-1.5 border border-slate-200 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {selectedRooms.map((room, index) => (
                <tr key={index} className="text-slate-800 font-medium bg-white hover:bg-slate-50 transition-colors">
                  <td className="p-1.5 border border-slate-200 text-center">{index + 1}</td>
                  <td className="p-1.5 border border-slate-200">
                    Room {room.roomNumber} <br/>
                    <span className="text-[9px] text-slate-500 font-bold uppercase">{room.categoryName}</span>
                  </td>
                  <td className="p-1.5 border border-slate-200 text-center whitespace-nowrap">
                    {room.adults || 2}A / {room.children || 0}C / {room.infant || 0}I
                  </td>
                  <td className="p-1.5 border border-slate-200 text-center">
                    <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px] font-bold">{room.mealPlan || 'Room Only'}</span>
                  </td>
                  <td className="p-1.5 border border-slate-200 text-right">₹{Number(room.baseCost).toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                  <td className="p-1.5 border border-slate-200 text-right">₹{Number(room.gst).toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                  <td className="p-1.5 border border-slate-200 text-right font-bold text-blue-600">₹{Number(room.total).toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Extra Services Table */}
        {extraServices && extraServices.length > 0 && (
          <div className="mb-4">
            <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 font-sans">Extra Services</h3>
            <table className="w-full text-xs border-collapse border border-slate-200 rounded-lg overflow-hidden shadow-sm">
              <thead>
                <tr className="bg-slate-100 text-slate-600 text-[10px] uppercase tracking-wider font-bold">
                  <th className="p-1.5 border border-slate-200 text-left">SR</th>
                  <th className="p-1.5 border border-slate-200 text-left">Service Name</th>
                  <th className="p-1.5 border border-slate-200 text-center">Date</th>
                  <th className="p-1.5 border border-slate-200 text-right">Amount</th>
                  <th className="p-1.5 border border-slate-200 text-right">Tax</th>
                  <th className="p-1.5 border border-slate-200 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {extraServices.map((service, index) => (
                  <tr key={service._id || index} className="text-slate-800 font-medium bg-white hover:bg-slate-50 transition-colors animate-in slide-in-from-left duration-200">
                    <td className="p-1.5 border border-slate-200 text-center">{index + 1}</td>
                    <td className="p-1.5 border border-slate-200">
                      {service.name} <br/>
                      {service.referenceText && <span className="text-[9px] text-slate-500 font-bold uppercase">{service.referenceText}</span>}
                    </td>
                    <td className="p-1.5 border border-slate-200 text-center whitespace-nowrap">
                      {service.date ? new Date(service.date).toLocaleDateString('en-GB') : '-'}
                    </td>
                    <td className="p-1.5 border border-slate-200 text-right">₹{Number(service.amountWithoutTax || service.amount || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                    <td className="p-1.5 border border-slate-200 text-right">₹{Number(service.taxAmount || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                    <td className="p-1.5 border border-slate-200 text-right font-bold text-blue-600">₹{Number(service.grandTotal || service.amount || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Payment Summary */}
        <div className="grid grid-cols-2 gap-4 mb-4 border-t border-dashed border-slate-200 pt-3">
          {/* Notes & Policies */}
          <div className="space-y-2 flex flex-col justify-between h-full">
            <div>
              {guestDetails.specialNote && (
                <div className="mb-2">
                  <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-0.5">Special Notes</h3>
                  <p className="text-xs font-medium bg-amber-50 text-amber-800 p-2 rounded-lg border border-amber-200">{guestDetails.specialNote}</p>
                </div>
              )}
              {paymentDetails.internalNotes && (
                <div className="mb-2">
                  <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-0.5">Billing Notes</h3>
                  <p className="text-xs font-medium bg-blue-50 text-blue-800 p-2 rounded-lg border border-blue-200">{paymentDetails.internalNotes}</p>
                </div>
              )}
            </div>
            <div>
              <h3 className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-0.5">Important Info</h3>
              <ul className="text-[9px] text-slate-500 font-medium list-disc pl-4 space-y-0.5">
                <li>Check-in is from 14:00. Check-out is strictly by 11:00.</li>
                <li>Please present valid government ID upon arrival.</li>
                <li>Cancellation policies apply as per standard hotel rules.</li>
              </ul>
            </div>
          </div>

          {/* Financial Totals */}
          <div>
            <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 shadow-sm">
              <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 border-b border-slate-200 pb-1">Payment Summary</h3>
              
              <div className="space-y-1 text-xs mb-2">
                <p className="flex justify-between"><span className="font-medium text-slate-500 font-sans">Total Net Cost:</span> <span className="font-bold">₹{totalNetCost.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span></p>
                <p className="flex justify-between"><span className="font-medium text-slate-500 font-sans">Total GST:</span> <span className="font-bold">₹{totalGST.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span></p>
                {extraServices && extraServices.length > 0 && (
                  <p className="flex justify-between"><span className="font-medium text-slate-500 font-sans">Extra Services:</span> <span className="font-bold">₹{extraServices.reduce((sum, s) => sum + (s.grandTotal || s.amount || 0), 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}</span></p>
                )}
                {totalDiscount > 0 && (
                  <p className="flex justify-between text-rose-600"><span className="font-medium">Discount Applied:</span> <span className="font-bold">- ₹{totalDiscount.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span></p>
                )}
                <div className="border-t border-slate-200 my-1"></div>
                <p className="flex justify-between items-center"><span className="font-black text-slate-800 uppercase tracking-wider text-[10px]">Total Payable:</span> <span className="font-black text-base text-slate-900">₹{payableAmount.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span></p>
              </div>

              <div className="bg-slate-800 text-white rounded-lg p-2.5">
                <p className="flex justify-between text-[9px] mb-0.5 opacity-80"><span className="uppercase tracking-wider font-bold">Mode</span> <span className="uppercase tracking-wider font-bold">{paymentDetails.paymentMode}</span></p>
                
                <p className="flex justify-between items-center mb-1">
                  <span className="font-medium text-xs">Amount Paid</span>
                  <span className="font-bold text-emerald-400 text-sm">₹{Number(paymentDetails.amountPaid || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                </p>

                <p className="flex justify-between items-center border-t border-slate-600 pt-1">
                  <span className="font-medium text-amber-200 text-[10px] uppercase tracking-wider font-sans">Balance Pending</span>
                  <span className="font-black text-amber-400 text-xs">₹{Math.max(0, payableAmount - (paymentDetails.amountPaid || 0)).toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-slate-200 text-center mt-4">
          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mb-0.5">Computer Generated Document</p>
          <p className="text-[9px] text-slate-400">Thank you for choosing {hotelProfile?.name || 'Grand Hotel & Suites'}. We look forward to hosting you!</p>
        </div>
      </div>
    </div>,
    document.body
  );
});

BookingVoucher.displayName = 'BookingVoucher';

export default BookingVoucher;
