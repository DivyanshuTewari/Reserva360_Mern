import React from 'react';
import { Routes, Route } from 'react-router-dom';
import UserLayout from '../components/user-dashboard/UserLayout';
import Overview from './user-dashboard/Overview';
import MyBookings from './user-dashboard/MyBookings';
import SavedProperties from './user-dashboard/SavedProperties';
import Notifications from './user-dashboard/Notifications';
import ProfileSettings from './user-dashboard/ProfileSettings';
import Placeholder from '../components/user-dashboard/Placeholder';

const UserDashboard = () => {
  return (
    <Routes>
      <Route element={<UserLayout />}>
        <Route index element={<Overview />} />
        <Route path="bookings" element={<MyBookings />} />
        <Route path="rooms" element={<Placeholder title="Rooms Management" />} />
        <Route path="pos" element={<Placeholder title="POS Services" />} />
        <Route path="tasks" element={<Placeholder title="Task Manager" />} />
        <Route path="reports" element={<Placeholder title="Reports & Analytics" />} />
        <Route path="saved" element={<SavedProperties />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="settings" element={<ProfileSettings />} />
      </Route>
    </Routes>
  );
};

export default UserDashboard;
