import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useShop } from '../context/ShopContext';
import { Heart, Star, ShoppingCart, Trash2 } from 'lucide-react';

const WishlistPage = () => {
  const { wishlist, toggleWishlist, addToCart } = useShop();
  const [toast, setToast] = useState('');
  const items = wishlist?.items || [];

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2000); };

  if (items.length === 0) {
    return (
      <div className="container" style={{ paddingTop: '80px', textAlign: 'center' }}>
        <div className="animate-fade-in" style={{ maxWidth: '400px', margin: '0 auto' }}>
          <Heart size={56} style={{ color: 'var(--clr-text-muted)', marginBottom: '16px' }} />
          <h2 style={{ marginBottom: '8px' }}>Your wishlist is empty</h2>
          <p style={{ color: 'var(--clr-text-muted)', marginBottom: '24px' }}>
            Save items you love for later by clicking the heart icon.
          </p>
          <Link to="/" className="btn btn-primary">Explore Products</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingTop: '32px', paddingBottom: '48px' }}>
      <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.5rem', fontWeight: 800, marginBottom: '24px' }}>
        <Heart size={24} fill="var(--clr-danger)" color="var(--clr-danger)" /> My Wishlist
        <span style={{ fontSize: '0.95rem', fontWeight: 500, color: 'var(--clr-text-muted)' }}>({items.length} items)</span>
      </h1>

      <div className="product-grid">
        {items.map((product, i) => {
          const title = product.product_name || product.title || 'Product';
          return (
            <div key={product.product_id} className={`card animate-fade-in-up stagger-${(i % 8) + 1}`} style={styles.card}>
              <Link to={`/product/${product.product_id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div style={styles.imgWrap}>
                  <img src={product.img_link} alt={title}
                    style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                    onError={(e) => { e.target.onerror = null; e.target.src = 'https://via.placeholder.com/200?text=No+Image'; }}
                  />
                </div>
                <h3 style={styles.title}>{title}</h3>
              </Link>

              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Star size={13} fill="#f08804" color="#f08804" />
                <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>{product.rating || 'N/A'}</span>
              </div>

              <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>{product.discounted_price || product.price || 'N/A'}</div>

              <div style={styles.actions}>
                <button className="btn btn-primary" style={{ flex: 1, fontSize: '0.78rem', padding: '8px' }}
                  onClick={() => { addToCart(product.product_id, 1); showToast('✓ Added to cart'); }}>
                  <ShoppingCart size={13} /> Add to Cart
                </button>
                <button className="btn-icon" style={{ width: '34px', height: '34px' }}
                  onClick={() => { toggleWishlist(product.product_id); showToast('Removed from wishlist'); }}>
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
};

const styles = {
  card: { padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px' },
  imgWrap: {
    height: '180px', background: '#f8f9fa', borderRadius: '12px',
    display: 'grid', placeItems: 'center', overflow: 'hidden', marginBottom: '4px',
  },
  title: {
    fontSize: '0.88rem', fontWeight: 600, lineHeight: 1.3,
    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
  },
  actions: { display: 'flex', gap: '6px', marginTop: 'auto', paddingTop: '4px' },
};

export default WishlistPage;
