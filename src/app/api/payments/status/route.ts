import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { getTransactionByInvoiceId } from '@/lib/db/transactions';

// OpenNode API configuration
const OPENNODE_API_URL = 'https://api.opennode.com/v1/charge';
const OPENNODE_API_KEY = process.env.OPENNODE_API_KEY;

/**
 * Payment Status API
 * 
 * This endpoint checks the status of a payment with OpenNode.
 * It returns the current status of the payment.
 */
export async function GET(request: NextRequest) {
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
    
    // First, check if we have a transaction record for this charge
    const transaction = await getTransactionByInvoiceId(chargeId);
    
    // If we have a transaction and it's completed, return the status
    if (transaction && transaction.status === 'completed') {
      return NextResponse.json({
        status: 'completed',
        message: 'Payment has been completed'
      });
    }
    
    // If we don't have a transaction or it's not completed, check with OpenNode
    if (!OPENNODE_API_KEY) {
      return NextResponse.json(
        { error: 'OpenNode API key is not configured' },
        { status: 500 }
      );
    }
    
    try {
      // Call the OpenNode API to get the charge status
      const response = await axios.get(`${OPENNODE_API_URL}/${chargeId}`, {
        headers: {
          'Authorization': OPENNODE_API_KEY,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      
      const charge = response.data.data;
      
      // Return the charge status
      return NextResponse.json({
        status: charge.status,
        message: `Payment status: ${charge.status}`
      });
    } catch (error) {
      console.error('Error fetching charge from OpenNode:', error);
      
      // If we can't reach OpenNode, return the transaction status if available
      if (transaction) {
        return NextResponse.json({
          status: transaction.status,
          message: `Payment status from database: ${transaction.status}`
        });
      }
      
      return NextResponse.json(
        { error: 'Failed to fetch payment status from OpenNode' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error checking payment status:', error);
    
    return NextResponse.json(
      { error: 'An error occurred while checking payment status' },
      { status: 500 }
    );
  }
}
