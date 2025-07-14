export default function GuestLimitModal() {
  return (
    <div className="fixed inset-0 flex items-center justify-center modal-backdrop z-50">
      <div className="bg-white p-6 rounded shadow-md text-center w-[90%] max-w-md modal-container">
        <h2 className="text-lg font-semibold mb-2 text-red-600">Guest Limit Reached</h2>
        <p className="text-gray-700 mb-4">You've reached your free limit of 10 messages.</p>
        <p className="text-sm text-gray-500 italic">Redirecting to login...</p>
      </div>
    </div>
  );
}
