export const stats = {
  // Core Daily
  todayBookings: 24,
  todayBookingsGrowth: "+12%",
  todayEarnings: 4500,
  todayEarningsGrowth: "+8%",
  todayCheckIns: 18,
  todayCheckOuts: 15,
  
  // Core Month
  monthBookings: 342,
  monthEarnings: 124500,
  
  // POS Daily
  todayPOSOrders: 156,
  todayPOSEarnings: 2340,
  todayPOSRoomTransfers: 45,
  todayComplimentaryPOS: 12,
  
  // POS Month
  monthPOSOrders: 4200,
  monthPOSEarnings: 63000,
};

export const todayTasks = [
  { id: 'TSK-001', title: 'Room 204 VIP Setup', status: 'pending', time: '10:00 AM' },
  { id: 'TSK-002', title: 'Pool Maintenance', status: 'completed', time: '07:00 AM' },
  { id: 'TSK-003', title: 'Lobby Deep Clean', status: 'in-progress', time: '11:30 AM' },
  { id: 'TSK-004', title: 'Review POS Inventory', status: 'pending', time: '02:00 PM' },
];

export const todayBookingsTable = [
  { id: 'BKG-7721', source: 'Booking.com', guest: 'Alice Johnson', checkIn: '2024-05-23', checkOut: '2024-05-26', room: 'Deluxe Suite', status: 'Confirmed' },
  { id: 'BKG-7722', source: 'Direct Web', guest: 'Michael Smith', checkIn: '2024-05-23', checkOut: '2024-05-25', room: 'Ocean View', status: 'Checked In' },
  { id: 'BKG-7723', source: 'Expedia', guest: 'Emma Brown', checkIn: '2024-05-23', checkOut: '2024-05-28', room: 'Standard Double', status: 'Pending' },
  { id: 'BKG-7724', source: 'Walk-In', guest: 'David Wilson', checkIn: '2024-05-23', checkOut: '2024-05-24', room: 'Standard Single', status: 'Checked In' },
  { id: 'BKG-7725', source: 'Airbnb', guest: 'Sophia Martinez', checkIn: '2024-05-23', checkOut: '2024-05-27', room: 'Penthouse', status: 'Confirmed' },
];

export const recentBookings = [
  {
    id: "BKG-001",
    propertyImage: "https://images.unsplash.com/photo-1542314831-c6a4d27ce6a2?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    propertyName: "Grand Plaza Hotel",
    checkIn: "2024-06-15",
    checkOut: "2024-06-20",
    status: "Confirmed",
    paymentStatus: "Paid",
  },
  {
    id: "BKG-002",
    propertyImage: "https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    propertyName: "Oceanview Resort",
    checkIn: "2024-07-10",
    checkOut: "2024-07-15",
    status: "Pending",
    paymentStatus: "Pending",
  },
];

export const recommendedProperties = [
  {
    id: "PROP-001",
    image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    name: "Luxury City Suites",
    rating: 4.8,
    reviews: 124,
    pricePerNight: 250,
    location: "Downtown Metropolis",
  },
  {
    id: "PROP-002",
    image: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    name: "Sunrise Beach Villa",
    rating: 4.9,
    reviews: 89,
    pricePerNight: 400,
    location: "Maldives",
  },
];

export const notifications = [
  {
    id: "NOTIF-001",
    title: "Booking Confirmed",
    message: "Your booking for Grand Plaza Hotel has been confirmed.",
    date: "2 hours ago",
    read: false,
    type: "booking",
  },
];

export const savedProperties = recommendedProperties.slice(0, 2);
