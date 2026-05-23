import React from 'react';
import { Routes, Route } from 'react-router-dom';
import UserLayout from '../components/user-dashboard/UserLayout';
import Overview from './user-dashboard/Overview';
import MyBookings from './user-dashboard/MyBookings';
import SavedProperties from './user-dashboard/SavedProperties';
import Notifications from './user-dashboard/Notifications';
import ProfileSettings from './user-dashboard/ProfileSettings';

const UserDashboard = () => {
  return (
    <Routes>
      <Route element={<UserLayout />}>
        <Route index element={<Overview />} />
        <Route path="bookings" element={<MyBookings />} />
        <Route path="saved" element={<SavedProperties />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="settings" element={<ProfileSettings />} />
      </Route>
    </Routes>
  );
};

export default UserDashboard;
