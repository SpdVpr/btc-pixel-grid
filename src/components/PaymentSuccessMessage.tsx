'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function PaymentSuccessMessage() {
  const [visible, setVisible] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  
  useEffect(() => {
    // Check if the URL has the payment=success parameter
    if (!searchParams) return;
    
    const paymentStatus = searchParams.get('payment');
    
    if (paymentStatus === 'success') {
      setVisible(true);
      
      // Remove the query parameter after 5 seconds
      const timeoutId = setTimeout(() => {
        // Replace the URL without the query parameter
        router.replace('/');
      }, 5000);
      
      return () => clearTimeout(timeoutId);
    }
  }, [searchParams, router]);
  
  if (!visible) return null;
  
  return (
    <div className="fixed top-4 right-4 bg-green-100 text-green-800 p-4 rounded-lg shadow-lg z-50 max-w-md">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div className="ml-3">
          <h3 className="text-lg font-medium">Purchase completed!</h3>
          <div className="mt-2">
            <p className="text-sm">
              Your pixels have been successfully purchased and are now your property. No one else can change them.
            </p>
          </div>
          <div className="mt-4">
            <button
              type="button"
              className="text-sm font-medium text-green-600 hover:text-green-500"
              onClick={() => setVisible(false)}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
