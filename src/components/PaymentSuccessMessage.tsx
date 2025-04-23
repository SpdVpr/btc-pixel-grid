'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import axios from 'axios';

export default function PaymentSuccessMessage() {
  const [visible, setVisible] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();
  
  useEffect(() => {
    // Check if the URL has the payment=success parameter and a chargeId
    if (!searchParams) return;
    
    const paymentStatus = searchParams.get('payment');
    const chargeId = searchParams.get('chargeId');
    
    if (paymentStatus === 'success' && chargeId) {
      // Immediately show success message without verification
      setVisible(true);
      setIsVerifying(false);
      
      // Remove the query parameter after 5 seconds
      const timeoutId = setTimeout(() => {
        // Replace the URL without the query parameter
        router.replace('/');
      }, 5000);
      
      // We'll still try to verify the payment for logging purposes only
      try {
        axios.get(`/api/payments/status?chargeId=${chargeId}`)
          .then(response => {
            console.log('Payment verification response:', response.data);
          })
          .catch(error => {
            console.error('Error during payment verification (non-blocking):', error);
          });
      } catch (error) {
        console.error('Error setting up verification request:', error);
      }
      
      return () => clearTimeout(timeoutId);
    } else if (paymentStatus === 'success' && !chargeId) {
      // If payment=success is in the URL but no chargeId, this might be a bypass attempt
      console.error('Payment success without chargeId detected - possible bypass attempt');
      
      // Redirect to home page immediately
      router.replace('/');
    }
  }, [searchParams, router]);
  
  if (isVerifying) {
    return (
      <div className="fixed top-4 right-4 bg-blue-100 text-blue-800 p-4 rounded-lg shadow-lg z-50 max-w-md">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="animate-spin h-6 w-6 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-lg font-medium">Verifying payment...</h3>
            <div className="mt-2">
              <p className="text-sm">
                Please wait while we verify your payment.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  if (verificationError) {
    return (
      <div className="fixed top-4 right-4 bg-red-100 text-red-800 p-4 rounded-lg shadow-lg z-50 max-w-md">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-lg font-medium">Payment verification failed</h3>
            <div className="mt-2">
              <p className="text-sm">{verificationError}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
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
