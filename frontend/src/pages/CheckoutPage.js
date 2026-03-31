import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useShop } from '../context/ShopContext';
import { CreditCard, MapPin, CheckCircle2, ArrowLeft, Lock } from 'lucide-react';

const CheckoutPage = () => {
  const { cart, checkout } = useShop();
  const navigate = useNavigate();
  const [address, setAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);

  const items = cart?.items || [];

  const handleCheckout = async () => {
    if (!address.trim()) {
      setError('Please enter a delivery address');
      return;
    }
    setProcessing(true);
    setError('');
    try {
      const result = await checkout({ address, paymentMethod });
      setSuccess(result);
    } catch (err) {
      setError(err.response?.data?.message || 'Checkout failed');
    } finally {
      setProcessing(false);
    }
  };

  if (success) {
    return (
      <div className="container" style={{ paddingTop: '80px', textAlign: 'center' }}>
        <div className="animate-scale-in" style={{ maxWidth: '450px', margin: '0 auto' }}>
          <CheckCircle2 size={64} style={{ color: 'var(--clr-success)', marginBottom: '16px' }} />
          <h2 style={{ marginBottom: '8px' }}>Order Confirmed!</h2>
          <p style={{ color: 'var(--clr-text-muted)', marginBottom: '8px' }}>
            Your order has been placed successfully.
          </p>
          <p style={{ fontSize: '0.85rem', color: 'var(--clr-text-muted)', marginBottom: '24px' }}>
            Order ID: <strong>{success.order?.order_id?.slice(0, 8)}...</strong>
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <Link to="/dashboard" className="btn btn-primary">View Dashboard</Link>
            <Link to="/" className="btn btn-secondary">Continue Shopping</Link>
          </div>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="container" style={{ paddingTop: '80px', textAlign: 'center' }}>
        <h2>Your cart is empty</h2>
        <Link to="/" className="btn btn-primary" style={{ marginTop: '16px' }}>Shop Now</Link>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingTop: '32px', paddingBottom: '48px' }}>
      <button onClick={() => navigate('/cart')} style={styles.backBtn}>
        <ArrowLeft size={16} /> Back to Cart
      </button>

      <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '24px' }}>Checkout</h1>

      <div style={styles.layout}>
        {/* Form Section */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Address */}
          <div className="card animate-fade-in" style={styles.formCard}>
            <h3 style={styles.formTitle}>
              <MapPin size={18} color="var(--clr-accent)" /> Delivery Address
            </h3>
            <textarea
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="Enter your full delivery address..."
              rows={3}
              style={styles.textarea}
            />
          </div>

          {/* Payment */}
          <div className="card animate-fade-in-up" style={styles.formCard}>
            <h3 style={styles.formTitle}>
              <CreditCard size={18} color="var(--clr-accent)" /> Payment Method
            </h3>
            <div style={styles.paymentOptions}>
              {[
                { value: 'card', label: 'Credit / Debit Card', icon: '💳' },
                { value: 'upi', label: 'UPI Payment', icon: '📱' },
                { value: 'cod', label: 'Cash on Delivery', icon: '💵' },
              ].map(opt => (
                <label key={opt.value} style={{
                  ...styles.paymentOption,
                  ...(paymentMethod === opt.value ? styles.paymentOptionActive : {}),
                }}>
                  <input type="radio" name="payment" value={opt.value}
                    checked={paymentMethod === opt.value}
                    onChange={e => setPaymentMethod(e.target.value)}
                    style={{ display: 'none' }}
                  />
                  <span style={{ fontSize: '1.2rem' }}>{opt.icon}</span>
                  <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>{opt.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Order Summary */}
        <div className="card animate-scale-in" style={styles.summary}>
          <h3 style={{ marginBottom: '16px', fontSize: '1.1rem' }}>Order Summary</h3>
          <div style={styles.itemList}>
            {items.map(item => (
              <div key={item.product_id} style={styles.miniItem}>
                <span style={styles.miniTitle}>{item.product?.product_name || 'Product'}</span>
                <span style={{ fontWeight: 600, fontSize: '0.85rem', flexShrink: 0 }}>
                  ×{item.quantity} = ₹{item.line_total?.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
          <div style={{ ...styles.totalRow, borderTop: '2px solid var(--clr-border)', paddingTop: '12px', marginTop: '8px' }}>
            <strong style={{ fontSize: '1.1rem' }}>Total</strong>
            <strong style={{ fontSize: '1.25rem' }}>₹{cart.subtotal?.toFixed(2)}</strong>
          </div>

          {error && <div style={styles.error}>{error}</div>}

          <button onClick={handleCheckout} disabled={processing} className="btn btn-primary"
            style={{ width: '100%', marginTop: '20px', padding: '14px', fontSize: '0.95rem' }}>
            <Lock size={16} />
            {processing ? 'Processing...' : `Pay ₹${cart.subtotal?.toFixed(2)}`}
          </button>
          <p style={{ fontSize: '0.75rem', color: 'var(--clr-text-light)', textAlign: 'center', marginTop: '8px' }}>
            🔒 Secure checkout. Your data is encrypted.
          </p>
        </div>
      </div>
    </div>
  );
};

const styles = {
  backBtn: {
    display: 'inline-flex', alignItems: 'center', gap: '6px',
    background: 'none', border: 'none', color: 'var(--clr-accent)',
    fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer', marginBottom: '16px', padding: 0,
  },
  layout: {
    display: 'grid', gridTemplateColumns: '1fr 360px', gap: '24px', alignItems: 'start',
  },
  formCard: { padding: '24px' },
  formTitle: {
    display: 'flex', alignItems: 'center', gap: '8px',
    fontSize: '1rem', fontWeight: 700, marginBottom: '16px',
  },
  textarea: {
    width: '100%', padding: '12px 16px', borderRadius: '12px',
    border: '1.5px solid var(--clr-border)', fontFamily: 'inherit',
    fontSize: '0.9rem', resize: 'vertical', lineHeight: 1.5,
    transition: 'border-color 200ms',
  },
  paymentOptions: { display: 'flex', flexDirection: 'column', gap: '8px' },
  paymentOption: {
    display: 'flex', alignItems: 'center', gap: '12px',
    padding: '14px 16px', borderRadius: '12px',
    border: '1.5px solid var(--clr-border)', cursor: 'pointer',
    transition: 'all 200ms',
  },
  paymentOptionActive: {
    borderColor: 'var(--clr-accent)', background: 'rgba(20,110,180,0.04)',
  },
  summary: { padding: '24px', position: 'sticky', top: '80px' },
  itemList: { display: 'flex', flexDirection: 'column', gap: '8px' },
  miniItem: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    gap: '8px', padding: '6px 0',
  },
  miniTitle: {
    fontSize: '0.85rem', lineHeight: 1.3,
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  totalRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0',
  },
  error: {
    background: 'var(--clr-danger-bg)', color: 'var(--clr-danger)',
    padding: '10px 14px', borderRadius: '10px', marginTop: '12px',
    fontSize: '0.85rem', fontWeight: 600,
  },
};

export default CheckoutPage;
