import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useShop } from '../context/ShopContext';
import { ShoppingCart, Trash2, Minus, Plus, ArrowRight, ShoppingBag } from 'lucide-react';

const CartPage = () => {
  const { cart, updateCartQuantity, removeFromCart } = useShop();
  const navigate = useNavigate();
  const [toast, setToast] = useState('');
  const items = cart?.items || [];

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2000); };

  if (items.length === 0) {
    return (
      <div className="container" style={{ paddingTop: '80px', textAlign: 'center' }}>
        <div className="animate-fade-in" style={{ maxWidth: '400px', margin: '0 auto' }}>
          <ShoppingBag size={56} style={{ color: 'var(--clr-text-muted)', marginBottom: '16px' }} />
          <h2 style={{ marginBottom: '8px' }}>Your cart is empty</h2>
          <p style={{ color: 'var(--clr-text-muted)', marginBottom: '24px' }}>
            Add products to your cart and they will appear here.
          </p>
          <Link to="/" className="btn btn-primary">Continue Shopping</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingTop: '32px', paddingBottom: '48px' }}>
      <h1 style={styles.pageTitle}>
        <ShoppingCart size={24} /> Shopping Cart
        <span style={styles.count}>({items.length} items)</span>
      </h1>

      <div style={styles.layout}>
        {/* Items list */}
        <div style={styles.itemsList}>
          {items.map((item, i) => {
            const product = item.product || {};
            const title = product.product_name || product.title || 'Product';
            return (
              <div key={item.product_id} className={`card animate-fade-in-up stagger-${(i % 8) + 1}`} style={styles.cartItem}>
                <Link to={`/product/${item.product_id}`} style={styles.itemImage}>
                  <img src={product.img_link} alt={title}
                    style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                    onError={(e) => { e.target.onerror = null; e.target.src = 'https://via.placeholder.com/100?text=No+Image'; }}
                  />
                </Link>
                <div style={styles.itemInfo}>
                  <Link to={`/product/${item.product_id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                    <h3 style={styles.itemTitle}>{title}</h3>
                  </Link>
                  <div style={{ color: 'var(--clr-text-muted)', fontSize: '0.82rem' }}>
                    {product.category ? product.category.split('|')[0] : ''}
                  </div>
                  <div style={styles.itemPrice}>
                    ₹{item.unit_price?.toFixed(2)} × {item.quantity} = <strong>₹{item.line_total?.toFixed(2)}</strong>
                  </div>
                  <div style={styles.qtyControls}>
                    <button className="btn-icon" style={{ width: '30px', height: '30px' }}
                      onClick={() => { if (item.quantity > 1) { updateCartQuantity(item.product_id, item.quantity - 1); } }}>
                      <Minus size={14} />
                    </button>
                    <span style={styles.qtyValue}>{item.quantity}</span>
                    <button className="btn-icon" style={{ width: '30px', height: '30px' }}
                      onClick={() => updateCartQuantity(item.product_id, item.quantity + 1)}>
                      <Plus size={14} />
                    </button>
                    <button className="btn-icon" style={{ width: '30px', height: '30px', marginLeft: '8px' }}
                      onClick={() => { removeFromCart(item.product_id); showToast('Item removed'); }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary */}
        <div className="card animate-scale-in" style={styles.summary}>
          <h3 style={{ marginBottom: '16px', fontSize: '1.1rem' }}>Order Summary</h3>
          <div style={styles.summaryRow}>
            <span>Subtotal ({items.length} items)</span>
            <strong>₹{cart.subtotal?.toFixed(2)}</strong>
          </div>
          <div style={styles.summaryRow}>
            <span>Shipping</span>
            <span style={{ color: 'var(--clr-success)', fontWeight: 600 }}>FREE</span>
          </div>
          <div style={{ ...styles.summaryRow, borderTop: '2px solid var(--clr-border)', paddingTop: '12px', marginTop: '8px' }}>
            <strong style={{ fontSize: '1.1rem' }}>Total</strong>
            <strong style={{ fontSize: '1.2rem', color: 'var(--clr-text)' }}>₹{cart.subtotal?.toFixed(2)}</strong>
          </div>
          <button onClick={() => navigate('/checkout')} className="btn btn-primary"
            style={{ width: '100%', marginTop: '20px', padding: '14px', fontSize: '0.95rem' }}>
            Proceed to Checkout <ArrowRight size={16} />
          </button>
          <Link to="/" style={{ display: 'block', textAlign: 'center', marginTop: '12px', fontSize: '0.85rem', color: 'var(--clr-accent)' }}>
            Continue Shopping
          </Link>
        </div>
      </div>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
};

const styles = {
  pageTitle: {
    display: 'flex', alignItems: 'center', gap: '10px',
    fontSize: '1.5rem', fontWeight: 800, marginBottom: '24px',
  },
  count: { fontSize: '0.95rem', fontWeight: 500, color: 'var(--clr-text-muted)' },
  layout: {
    display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px', alignItems: 'start',
  },
  itemsList: { display: 'flex', flexDirection: 'column', gap: '12px' },
  cartItem: {
    display: 'flex', gap: '16px', padding: '16px',
  },
  itemImage: {
    width: '100px', height: '100px', flexShrink: 0,
    background: '#f8f9fa', borderRadius: '12px',
    display: 'grid', placeItems: 'center', overflow: 'hidden',
  },
  itemInfo: { flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' },
  itemTitle: {
    fontSize: '0.95rem', fontWeight: 600, lineHeight: 1.3,
    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
  },
  itemPrice: { fontSize: '0.9rem', marginTop: '4px' },
  qtyControls: {
    display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px',
  },
  qtyValue: { fontSize: '0.95rem', fontWeight: 700, minWidth: '24px', textAlign: 'center' },
  summary: { padding: '24px', position: 'sticky', top: '80px' },
  summaryRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '8px 0', fontSize: '0.9rem',
  },
};

export default CartPage;
