// components/ui/PageLoader.tsx
import Spinner from "./Spinner";

export default function PageLoader() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80">
      <Spinner size={48} className="border-blue-600" />
    </div>
  );
}
