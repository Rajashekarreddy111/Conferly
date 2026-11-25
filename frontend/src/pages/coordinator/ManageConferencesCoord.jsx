import React from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { ManageConferencesAdmin } from '../admin/ManageConferencesAdmin';

export const ManageConferencesCoord = () => {
  return (
    <DashboardLayout
      title="Coordinator Conference Desk"
      subtitle="Create and schedule conference submissions targeted to your authorized student cohorts"
    >
      <ManageConferencesAdmin isCoordinator={true} />
    </DashboardLayout>
  );
};
