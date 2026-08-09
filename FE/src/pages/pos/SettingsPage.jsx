import ProfilePage from '../profile/ProfilePage.jsx';

/** Cashier account settings — same capabilities as BM /profile, within cashier permissions. */
export default function SettingsPage() {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-3 lg:p-4">
      <ProfilePage />
    </div>
  );
}
