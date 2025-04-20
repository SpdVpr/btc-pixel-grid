import { NextRequest, NextResponse } from 'next/server';
import { validateWebhookSignature } from '@/lib/opennode';
import { mockGetPixelsInRange } from '@/lib/db/mock';

/**
 * OpenNode Webhook Handler
 * 
 * This endpoint receives webhook notifications from OpenNode when a payment status changes.
 * It validates the webhook signature and updates the pixel ownership based on the payment status.
 */
export async function POST(request: NextRequest) {
  try {
    // Parse the webhook payload
    const formData = await request.formData();
    const payload = Object.fromEntries(formData.entries());
    
    // Extract relevant data from the payload
    const { 
      id, 
      status, 
      hashed_order, 
      order_id 
    } = payload;
    
    console.log('Received OpenNode webhook:', { id, status, order_id });
    
    // Validate the webhook signature
    if (!validateWebhookSignature(id as string, hashed_order as string)) {
      console.error('Invalid webhook signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }
    
    // Process the webhook based on the payment status
    if (status === 'paid') {
      // Payment was successful
      console.log(`Payment ${id} was successful`);
      
      try {
        // Here you would update your database to mark the pixels as purchased
        // For now, we'll just log the success
        console.log(`Successfully processed payment for order ${order_id}`);
        
        // In a real implementation, you would:
        // 1. Retrieve the pixels associated with this order_id
        // 2. Update their status in the database to mark them as purchased
        // 3. Associate them with the user who made the payment
        
        return NextResponse.json({ success: true });
      } catch (error) {
        console.error('Error processing successful payment:', error);
        return NextResponse.json(
          { error: 'Error processing payment' },
          { status: 500 }
        );
      }
    } else if (status === 'processing') {
      // Payment is being processed (seen in mempool for on-chain)
      console.log(`Payment ${id} is processing`);
      return NextResponse.json({ success: true });
    } else if (status === 'underpaid') {
      // Payment was underpaid
      console.log(`Payment ${id} was underpaid`);
      return NextResponse.json({ success: true });
    } else if (status === 'expired') {
      // Payment expired
      console.log(`Payment ${id} expired`);
      
      // Here you would release the reserved pixels
      // For now, we'll just log the expiration
      console.log(`Released reserved pixels for expired payment ${id}`);
      
      return NextResponse.json({ success: true });
    } else {
      // Other status
      console.log(`Payment ${id} has status: ${status}`);
      return NextResponse.json({ success: true });
    }
  } catch (error) {
    console.error('Error processing OpenNode webhook:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: 'Unknown error' },
      { status: 500 }
    );
  }
}
