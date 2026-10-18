import { useEffect, useState } from 'react';
import { Monitor } from 'lucide-react';

export default function MobileBlocker({ children }: { children: React.ReactNode }) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => {
      const ua = navigator.userAgent;
      const mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
      setIsMobile(mobile);
    };
    check();
  }, []);

  if (!isMobile) return <>{children}</>;

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <div className="w-20 h-20 bg-blue-900 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Monitor size={40} className="text-blue-400" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-3">Desktop Only</h1>
        <p className="text-gray-400 text-sm leading-relaxed">
          WebbeaCRM is designed for desktop use only. Please open this application on a computer or laptop for the best experience.
        </p>
        <div className="mt-6 px-4 py-3 bg-blue-900/30 rounded-xl">
          <p className="text-blue-300 text-xs">Minimum screen width: 768px</p>
        </div>
      </div>
    </div>
  );
}
