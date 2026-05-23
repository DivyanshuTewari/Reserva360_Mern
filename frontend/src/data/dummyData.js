export const stats = {
  totalBookings: 12,
  upcomingStays: 3,
  savedProperties: 8,
  pendingPayments: 1,
};

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
  {
    id: "BKG-003",
    propertyImage: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    propertyName: "Mountain Retreat",
    checkIn: "2024-05-01",
    checkOut: "2024-05-05",
    status: "Completed",
    paymentStatus: "Paid",
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
  {
    id: "PROP-003",
    image: "https://images.unsplash.com/photo-1551882547-ff40c0d58d48?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    name: "Cozy Cabin Woods",
    rating: 4.6,
    reviews: 56,
    pricePerNight: 120,
    location: "Aspen, CO",
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
  {
    id: "NOTIF-002",
    title: "Payment Reminder",
    message: "You have a pending payment of $500 for Oceanview Resort.",
    date: "1 day ago",
    read: false,
    type: "payment",
  },
  {
    id: "NOTIF-003",
    title: "Review Request",
    message: "How was your stay at Mountain Retreat? Leave a review!",
    date: "3 days ago",
    read: true,
    type: "activity",
  },
];

export const savedProperties = recommendedProperties.slice(0, 2);
