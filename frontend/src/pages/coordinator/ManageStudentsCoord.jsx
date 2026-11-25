import React from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { ManageStudentsAdmin } from '../admin/ManageStudentsAdmin';
import { useAuth } from '../../context/AuthContext';

export const ManageStudentsCoord = () => {
  const { user } = useAuth();

  return (
    <DashboardLayout
      title="Class Roster Management"
      subtitle={`Enrolled students restricted to your authorized sections: ${(user?.assignedSections || []).join(', ')}`}
    >
      <ManageStudentsAdmin
        isCoordinatorScope={true}
        coordinatorSections={user?.assignedSections || []}
      />
    </DashboardLayout>
  );
};
