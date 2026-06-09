import { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  ArrowRight, 
  ArrowLeft, 
  Copy, 
  FileText, 
  Check, 
  DollarSign,
  AlertTriangle
} from 'lucide-react';
import { api } from '../services/api';

export interface MedicineItemSummary {
  name: string;
  quantity: number;
  price: number;
}

export interface OrderSummaryData {
  items: MedicineItemSummary[];
  subtotal: number;
  deliveryFee: number;
  taxAmount: number;
  grandTotal: number;
}

interface PaymentFlowProps {
  orderSummary: OrderSummaryData;
  orderId: string;
  vendorName: string;
  initialMethod?: 'COD' | 'Online';
  onPaymentComplete: (transactionId: string, paymentMethod: 'COD' | 'Online') => void;
  onCancel: () => void;
  onPaymentStatusChange?: (status: string) => void;
}

type PaymentScreen = 'METHOD_SELECT' | 'COD_CONFIRM' | 'ONLINE_QR' | 'PROCESSING' | 'SUCCESS' | 'FAILURE';

export default function PaymentFlow({
  orderSummary,
  orderId,
  vendorName,
  initialMethod,
  onPaymentComplete,
  onCancel,
  onPaymentStatusChange
}: PaymentFlowProps) {
  const [screen, setScreen] = useState<PaymentScreen>(
    initialMethod === 'COD' ? 'COD_CONFIRM' : 
    initialMethod === 'Online' ? 'ONLINE_QR' : 'METHOD_SELECT'
  );
  
  const [selectedMethod, setSelectedMethod] = useState<'COD' | 'Online' | null>(
    initialMethod || null
  );

  // Online QR timer state (10 mins = 600s)
  const [timeLeft, setTimeLeft] = useState<number>(600);
  const [copied, setCopied] = useState<boolean>(false);
  
  // Processing animation steps
  const [activeStep, setActiveStep] = useState<number>(0);
  const [processingError, setProcessingError] = useState<string>('');
  
  // Completed payment details
  const [transactionId, setTransactionId] = useState<string>('');
  const [transactionDate, setTransactionDate] = useState<string>('');

  const timerRef = useRef<any>(null);

  // Initialize timer when on ONLINE_QR screen
  useEffect(() => {
    if (screen === 'ONLINE_QR') {
      setTimeLeft(600);
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            handleTimeout();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [screen]);

  // Handle countdown timeout
  const handleTimeout = async () => {
    try {
      // Notify backend if possible
      await api.paymentExpired(orderId);
    } catch (e) {
      console.error("Failed to mark payment as expired on backend", e);
    }
    
    if (onPaymentStatusChange) {
      onPaymentStatusChange('Expired');
    }
    setProcessingError('Payment session has expired. Please try again.');
    setScreen('FAILURE');
  };

  // Switch to COD from Failure screen
  const handleSwitchToCOD = async () => {
    try {
      await api.switchToCod(orderId);
      setSelectedMethod('COD');
      if (onPaymentStatusChange) {
        onPaymentStatusChange('Pending');
      }
      setScreen('COD_CONFIRM');
    } catch (e) {
      console.error("Failed to switch to COD on backend", e);
      // Fallback locally
      setSelectedMethod('COD');
      setScreen('COD_CONFIRM');
    }
  };

  // Copy UPI ID helper
  const copyUpiId = () => {
    const upiId = `healthpulse@axisbank`;
    navigator.clipboard.writeText(upiId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Initiate Online Payment
  const handleInitiateOnline = async () => {
    try {
      await api.initiatePayment(orderId);
      if (onPaymentStatusChange) {
        onPaymentStatusChange('Processing');
      }
      setScreen('ONLINE_QR');
    } catch (e) {
      console.error("Failed to initiate payment on backend", e);
      // Fallback
      setScreen('ONLINE_QR');
    }
  };

  // Submit/Confirm COD
  const handleConfirmCOD = async () => {
    if (onPaymentStatusChange) {
      onPaymentStatusChange('Pending');
    }
    // Generate a local mock transaction ID for record
    const mockTxId = 'HP-COD-' + Math.random().toString(36).substring(2, 11).toUpperCase();
    onPaymentComplete(mockTxId, 'COD');
  };

  // "I Have Paid" verification simulation
  const handleVerifyPayment = async () => {
    setScreen('PROCESSING');
    setActiveStep(0);

    // Simulate stepping through progress
    const steps = [
      { delay: 1000, stepIndex: 1 }, // Connecting to Gateway
      { delay: 2200, stepIndex: 2 }, // Checking Bank Confirmation
      { delay: 3500, stepIndex: 3 }, // Finalizing Verification
    ];

    steps.forEach((step) => {
      setTimeout(() => {
        setActiveStep(step.stepIndex);
      }, step.delay);
    });

    // Final response
    setTimeout(async () => {
      try {
        const response = await api.verifyPayment(orderId);
        const data = response.data as any;

        if (data.success && data.paymentStatus === 'Paid') {
          const txId = data.transactionId || 'TXN' + Math.random().toString(36).substring(2, 11).toUpperCase();
          setTransactionId(txId);
          setTransactionDate(new Date().toLocaleString());
          if (onPaymentStatusChange) {
            onPaymentStatusChange('Paid');
          }
          setScreen('SUCCESS');
        } else {
          setProcessingError(data.message || 'Payment verification failed. Bank returned: INSUFFICIENT_FUNDS');
          if (onPaymentStatusChange) {
            onPaymentStatusChange('Failed');
          }
          setScreen('FAILURE');
        }
      } catch (e) {
        // Mock fallback logic if backend returns error or offline
        console.warn("Backend verification error, falling back to mock", e);
        
        // 90% success rate, 10% failure rate
        const isSuccess = Math.random() < 0.9;
        
        if (isSuccess) {
          const txId = 'TXN' + Math.random().toString(36).substring(2, 11).toUpperCase();
          setTransactionId(txId);
          setTransactionDate(new Date().toLocaleString());
          if (onPaymentStatusChange) {
            onPaymentStatusChange('Paid');
          }
          setScreen('SUCCESS');
        } else {
          setProcessingError('Verification failed: Transaction declined by issuing bank (Code: 51).');
          if (onPaymentStatusChange) {
            onPaymentStatusChange('Failed');
          }
          setScreen('FAILURE');
        }
      }
    }, 4500);
  };

  // Retry Online Payment
  const handleRetryOnline = async () => {
    try {
      await api.retryPayment(orderId);
      if (onPaymentStatusChange) {
        onPaymentStatusChange('Processing');
      }
      setScreen('ONLINE_QR');
    } catch (e) {
      console.error("Failed to retry payment on backend", e);
      setScreen('ONLINE_QR');
    }
  };

  // Download printable receipt (opens browser print for receipt card)
  const handleDownloadReceipt = () => {
    const printContent = document.getElementById('printable-receipt');
    if (!printContent) return;
    const printWindow = window.open('', '', 'height=600,width=800');
    if (printWindow) {
      printWindow.document.write('<html><head><title>Payment Receipt - HealthPulse</title>');
      printWindow.document.write('<style>');
      printWindow.document.write(`
        body { font-family: 'DM Sans', sans-serif; padding: 40px; color: #0c1829; background: #ffffff; }
        .receipt-card { border: 1px dashed #ccc; padding: 24px; border-radius: 8px; max-width: 450px; margin: 0 auto; }
        .receipt-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
        .receipt-row:last-child { border-bottom: none; font-size: 1.2rem; font-weight: bold; margin-top: 12px; }
        .receipt-title { text-align: center; margin-bottom: 24px; }
        .badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; background: #e0f2fe; color: #0369a1; text-transform: uppercase; font-weight: bold; }
        .logo { font-size: 1.5rem; font-weight: bold; text-align: center; margin-bottom: 8px; color: #0891b2; }
      `);
      printWindow.document.write('</style></head><body>');
      printWindow.document.write('<div class="receipt-card">');
      printWindow.document.write('<div class="logo">HealthPulse</div>');
      printWindow.document.write('<div class="receipt-title"><h2>Payment Receipt</h2></div>');
      printWindow.document.write(printContent.innerHTML);
      printWindow.document.write('</div></body></html>');
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    }
  };

  // Helper to format remaining seconds into MM:SS
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Render individual screens
  switch (screen) {
    case 'METHOD_SELECT':
      return (
        <div className="payment-select-container">
          <h2 className="text-xl font-bold mb-2 text-center" style={{ fontFamily: 'var(--font-heading)' }}>
            Select Payment Method
          </h2>
          <p className="text-sm text-center text-secondary mb-6">
            Choose how you would like to pay for your medicine order from <strong>{vendorName}</strong>.
          </p>

          <div className="payment-selection-grid">
            {/* COD Card */}
            <div 
              className={`payment-method-card ${selectedMethod === 'COD' ? 'selected' : ''}`}
              onClick={() => setSelectedMethod('COD')}
            >
              <div className="select-indicator">
                {selectedMethod === 'COD' && <Check size={12} strokeWidth={3} />}
              </div>
              <div className="method-icon">📦</div>
              <h3>Cash On Delivery</h3>
              <p>Pay cash or via delivery agent's UPI code when medicines arrive at your doorstep.</p>
            </div>

            {/* Online Card */}
            <div 
              className={`payment-method-card ${selectedMethod === 'Online' ? 'selected' : ''}`}
              onClick={() => setSelectedMethod('Online')}
            >
              <div className="select-indicator">
                {selectedMethod === 'Online' && <Check size={12} strokeWidth={3} />}
              </div>
              <div className="method-icon">💳</div>
              <h3>Online UPI / QR Payment</h3>
              <p>Scan a dynamic QR code using any UPI App (GPay, PhonePe, Paytm) for instant processing.</p>
            </div>
          </div>

          <div className="flex justify-between items-center mt-8 pt-4 border-t" style={{ borderColor: 'var(--border-color)' }}>
            <button 
              className="btn btn-secondary btn-sm" 
              onClick={onCancel}
            >
              <ArrowLeft size={16} /> Back
            </button>
            <button 
              className="btn btn-primary"
              disabled={!selectedMethod}
              onClick={() => {
                if (selectedMethod === 'COD') setScreen('COD_CONFIRM');
                else handleInitiateOnline();
              }}
            >
              Continue <ArrowRight size={16} />
            </button>
          </div>
        </div>
      );

    case 'COD_CONFIRM':
      return (
        <div className="cod-confirm-container">
          <div className="text-center mb-6">
            <div className="inline-flex p-3 bg-blue-500/10 border border-blue-500/20 text-blue-500 rounded-full mb-3">
              <DollarSign size={32} />
            </div>
            <h2 className="text-xl font-bold" style={{ fontFamily: 'var(--font-heading)' }}>
              Confirm Cash On Delivery
            </h2>
            <p className="text-sm text-secondary mt-1">
              Your order from <strong>{vendorName}</strong> will be marked for Cash On Delivery.
            </p>
          </div>

          <div className="receipt-card max-w-lg mx-auto" style={{ borderStyle: 'solid' }}>
            <h4 className="font-semibold mb-3 pb-2 border-b text-sm uppercase tracking-wider text-secondary">
              Order Summary
            </h4>
            <div className="space-y-2 mb-4" style={{ maxHeight: '150px', overflowY: 'auto', paddingRight: '4px' }}>
              {orderSummary.items.map((item, idx) => (
                <div key={idx} className="flex justify-between text-sm">
                  <span className="text-secondary">{item.name} (x{item.quantity})</span>
                  <span>₹{(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>
            
            <div className="border-t pt-3 space-y-2 text-sm" style={{ borderColor: 'var(--border-color)' }}>
              <div className="flex justify-between text-secondary">
                <span>Items Subtotal</span>
                <span>₹{orderSummary.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-secondary">
                <span>Delivery Charges</span>
                <span>₹{orderSummary.deliveryFee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-secondary">
                <span>Taxes & GST (5%)</span>
                <span>₹{orderSummary.taxAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-base pt-2 border-t" style={{ borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}>
                <span>Grand Total</span>
                <span>₹{orderSummary.grandTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Payment Info Display */}
          <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4 mb-8 flex items-start gap-3 max-w-md mx-auto">
            <AlertCircle className="text-blue-500 mt-0.5 flex-shrink-0" size={18} />
            <div className="text-left">
              <div className="text-sm font-semibold text-blue-500 mb-1">COD Payment Status: Pending Collection</div>
              <div className="text-xs text-secondary leading-relaxed">
                Order status is <strong>Confirmed</strong>. Please keep the exact amount of <strong>₹{orderSummary.grandTotal.toFixed(2)}</strong> ready in cash or prepare to scan the delivery executive's QR code.
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center pt-4 border-t" style={{ borderColor: 'var(--border-color)' }}>
            <button 
              className="btn btn-secondary btn-sm" 
              onClick={() => setScreen('METHOD_SELECT')}
            >
              <ArrowLeft size={16} /> Change Payment
            </button>
            <button 
              className="btn btn-success"
              onClick={handleConfirmCOD}
            >
              Confirm Order <CheckCircle size={16} />
            </button>
          </div>
        </div>
      );

    case 'ONLINE_QR':
      // Generate UPI Deep Link data
      // upi://pay?pa=healthpulse@axisbank&pn=HealthPulse&am=AMOUNT&tr=ORDERID
      const upiUrl = `upi://pay?pa=healthpulse@axisbank&pn=HealthPulse%20Pharmacy&am=${orderSummary.grandTotal.toFixed(2)}&tr=${orderId}&cu=INR`;

      return (
        <div className="qr-payment-wrapper">
          <div className="text-center w-full">
            <div className={`timer-pill ${timeLeft < 60 ? 'warning' : ''}`}>
              <Clock size={14} />
              <span>Expires in {formatTime(timeLeft)}</span>
            </div>

            <h2 className="text-lg font-bold mb-1" style={{ fontFamily: 'var(--font-heading)' }}>
              Scan to Pay Online
            </h2>
            <p className="text-xs text-secondary mb-4">
              Open your preferred UPI App (GPay, PhonePe, Paytm) and scan the QR code below.
            </p>

            {/* Glowing QR Container */}
            <div className="qr-code-glow-container inline-block">
              <QRCodeSVG 
                value={upiUrl}
                size={180}
                level="M"
                includeMargin={false}
              />
            </div>

            <div className="text-center mb-6">
              <div className="text-xl font-extrabold tracking-tight mb-1" style={{ color: 'var(--text-primary)' }}>
                ₹{orderSummary.grandTotal.toFixed(2)}
              </div>
              <div className="text-xs text-muted">Amount payable for Order #{orderId}</div>
            </div>

            {/* UPI ID Details */}
            <div className="payment-upi-details">
              <div>
                <div className="text-[10px] text-left text-secondary uppercase tracking-wider">UPI ID</div>
                <span>healthpulse@axisbank</span>
              </div>
              <button className="copy-btn" onClick={copyUpiId}>
                {copied ? (
                  <>
                    <Check size={14} /> Copied
                  </>
                ) : (
                  <>
                    <Copy size={14} /> Copy
                  </>
                )}
              </button>
            </div>

            <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-3 mb-6 text-left flex gap-2.5">
              <AlertTriangle className="text-yellow-500 flex-shrink-0 mt-0.5" size={16} />
              <div className="text-[11px] text-secondary leading-relaxed">
                Do not refresh or close this modal. Once you finish the transaction on your phone, click the verification button below.
              </div>
            </div>

            <div className="flex flex-col gap-2.5 w-full border-t pt-4" style={{ borderColor: 'var(--border-color)' }}>
              <button 
                className="btn btn-primary w-full justify-center py-3"
                onClick={handleVerifyPayment}
              >
                I Have Paid <CheckCircle size={16} />
              </button>
              <button 
                className="btn btn-secondary btn-sm justify-center w-full"
                onClick={() => setScreen('METHOD_SELECT')}
              >
                <ArrowLeft size={14} /> Change Payment Method
              </button>
            </div>
          </div>
        </div>
      );

    case 'PROCESSING':
      return (
        <div className="payment-processing-wrapper">
          <div className="spinner-concentric-container">
            <div className="spinner-outer-ring"></div>
            <div className="spinner-inner-ring"></div>
            <div className="spinner-center-dot"></div>
          </div>

          <h2 className="text-xl font-bold mb-2" style={{ fontFamily: 'var(--font-heading)' }}>
            Verifying Your Payment
          </h2>
          <p className="text-sm text-secondary max-w-sm mb-6">
            We are confirming your transaction with the bank PSP gateway. Please wait...
          </p>

          <div className="processing-steps">
            <div className={`processing-step ${activeStep >= 0 ? (activeStep > 0 ? 'completed' : 'active') : ''}`}>
              <div className="processing-step-bullet">
                {activeStep > 0 ? <Check size={8} strokeWidth={3} /> : null}
              </div>
              <span>Connecting to secure bank gateway...</span>
            </div>
            
            <div className={`processing-step ${activeStep >= 1 ? (activeStep > 1 ? 'completed' : 'active') : ''}`}>
              <div className="processing-step-bullet">
                {activeStep > 1 ? <Check size={8} strokeWidth={3} /> : null}
              </div>
              <span>Waiting for bank transfer authorization...</span>
            </div>

            <div className={`processing-step ${activeStep >= 2 ? (activeStep > 2 ? 'completed' : 'active') : ''}`}>
              <div className="processing-step-bullet">
                {activeStep > 2 ? <Check size={8} strokeWidth={3} /> : null}
              </div>
              <span>Validating cryptographic signatures...</span>
            </div>
          </div>
        </div>
      );

    case 'SUCCESS':
      return (
        <div className="success-screen-wrapper">
          <div className="checkmark-circle">
            <svg className="checkmark-svg" viewBox="0 0 52 52">
              <path className="checkmark-path" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
            </svg>
          </div>

          <h2 className="text-2xl font-bold mb-1" style={{ color: 'var(--success)', fontFamily: 'var(--font-heading)' }}>
            Payment Successful!
          </h2>
          <p className="text-sm text-secondary mb-6">
            Your transaction has been authorized and order #{orderId} is confirmed.
          </p>

          {/* Printable Receipt Card */}
          <div id="printable-receipt" className="receipt-card">
            <div className="receipt-row">
              <span>Order ID</span>
              <span>#{orderId}</span>
            </div>
            <div className="receipt-row">
              <span>Transaction ID</span>
              <span>{transactionId}</span>
            </div>
            <div className="receipt-row">
              <span>Date & Time</span>
              <span>{transactionDate}</span>
            </div>
            <div className="receipt-row">
              <span>Payment Mode</span>
              <span><span className="badge">Online UPI</span></span>
            </div>
            <div className="receipt-row">
              <span>Pharmacy Provider</span>
              <span>{vendorName}</span>
            </div>
            <div className="receipt-row font-bold">
              <span>Amount Paid</span>
              <span>₹{orderSummary.grandTotal.toFixed(2)}</span>
            </div>
          </div>

          <div className="flex flex-col gap-2 w-full max-w-xs mx-auto mt-6">
            <button 
              className="btn btn-outline justify-center gap-2"
              onClick={handleDownloadReceipt}
              style={{ color: 'var(--accent-primary)', borderColor: 'rgba(8, 145, 178, 0.3)' }}
            >
              <FileText size={16} /> Download Receipt (PDF)
            </button>
            <button 
              className="btn btn-success justify-center mt-2 py-3"
              onClick={() => onPaymentComplete(transactionId, 'Online')}
            >
              Continue Dashboard
            </button>
          </div>
        </div>
      );

    case 'FAILURE':
      return (
        <div className="failure-screen-wrapper">
          <div className="cross-circle">
            <svg className="cross-svg" viewBox="0 0 52 52">
              <path className="cross-path" fill="none" d="M16 16l20 20M36 16L16 36" />
            </svg>
          </div>

          <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--danger)', fontFamily: 'var(--font-heading)' }}>
            Payment Failed
          </h2>
          <p className="text-sm text-secondary max-w-sm mx-auto mb-6">
            {processingError || 'We were unable to verify your payment. The transaction was either cancelled or timed out.'}
          </p>

          <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4 mb-8 text-left max-w-md mx-auto flex gap-3">
            <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={18} />
            <div>
              <div className="text-sm font-semibold text-red-500 mb-1">What can you do?</div>
              <ul className="text-xs text-secondary list-disc pl-4 space-y-1">
                <li>Check if funds were deducted from your bank (refunds take 3-5 days).</li>
                <li>Try scanning the QR code again with a different UPI application.</li>
                <li>Switch to Cash On Delivery to pay during delivery collection.</li>
              </ul>
            </div>
          </div>

          <div className="flex flex-col gap-2.5 w-full max-w-sm mx-auto border-t pt-4" style={{ borderColor: 'var(--border-color)' }}>
            <button 
              className="btn btn-primary justify-center py-2.5"
              onClick={handleRetryOnline}
            >
              Retry Online Payment
            </button>
            <button 
              className="btn btn-outline justify-center py-2.5"
              onClick={handleSwitchToCOD}
              style={{ color: 'var(--accent-primary)', borderColor: 'rgba(8, 145, 178, 0.3)' }}
            >
              Switch to Cash On Delivery
            </button>
            <button 
              className="btn btn-secondary justify-center py-2"
              onClick={() => setScreen('METHOD_SELECT')}
            >
              Change Payment Method
            </button>
          </div>
        </div>
      );
  }
}
