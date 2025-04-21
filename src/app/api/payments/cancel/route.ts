import { NextRequest, NextResponse } from 'next/server';
import { cancelPixelReservation } from '@/lib/db/pixels';
import { updateTransactionStatus } from '@/lib/db/transactions';

/**
 * Payment Cancellation API
 * 
 * This endpoint cancels a payment and releases the reserved pixels.
 * It should be called when a user cancels the payment process.
 */
export async function POST(request: NextRequest) {
  try {
    // Get the charge ID from the query parameters
    const { searchParams } = new URL(request.url);
    const chargeId = searchParams.get('chargeId');
    
    if (!chargeId) {
      return NextResponse.json(
        { error: 'Missing charge ID' },
        { status: 400 }
      );
    }
    
    // Cancel the pixel reservation
    await cancelPixelReservation(chargeId);
    
    // Update the transaction status to failed
    await updateTransactionStatus(chargeId, 'failed');
    
    return NextResponse.json({
      success: true,
      message: 'Payment cancelled and pixels released'
    });
  } catch (error) {
    console.error('Error cancelling payment:', error);
    
    return NextResponse.json(
      { error: 'An error occurred while cancelling the payment' },
      { status: 500 }
    );
  }
}
