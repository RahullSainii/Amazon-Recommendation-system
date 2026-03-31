import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useShop } from '../context/ShopContext';
import { Star, ShoppingCart, Heart, ArrowLeft, Tag, Truck, Shield, Sparkles } from 'lucide-react';
import API_URL from '../lib/apiBase';

const ProductDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { addToCart, toggleWishlist } = useShop();
    const [product, setProduct] = useState(null);
    const [similarProducts, setSimilarProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState('');
    const [qty, setQty] = useState(1);

    useEffect(() => {
        const fetchProductAndSimilar = async () => {
            setLoading(true);
            try {
                const prodResponse = await axios.get(`${API_URL}/api/products/${id}`);
                setProduct(prodResponse.data);

                const simResponse = await axios.get(`${API_URL}/api/products/${id}/similar?limit=8`);
                setSimilarProducts(Array.isArray(simResponse.data) ? simResponse.data : []);

                const token = localStorage.getItem('token');
                if (token) {
                    await axios.post(
                        `${API_URL}/api/interactions`,
                        { product_id: id, type: 'view' },
                        { headers: { Authorization: `Bearer ${token}` } }
                    ).catch(() => { });
                }
            } catch (err) {
                console.error('Error fetching product data:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchProductAndSimilar();
        window.scrollTo(0, 0);
    }, [id]);

    const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2000); };

    if (loading) return (
        <div className="page-loading">
            <div className="spinner" />
            <span>Loading product details...</span>
        </div>
    );

    if (!product) return (
        <div className="container" style={{ textAlign: 'center', paddingTop: '80px' }}>
            <h2>Product not found</h2>
            <Link to="/" className="btn btn-primary" style={{ marginTop: '16px' }}>Back to Home</Link>
        </div>
    );

    return (
        <div className="container" style={{ paddingTop: '24px', paddingBottom: '48px' }}>
            {/* Breadcrumb */}
            <button onClick={() => navigate(-1)} style={styles.backBtn}>
                <ArrowLeft size={16} /> Back
            </button>

            {/* Main Product Section */}
            <div style={styles.mainGrid} className="animate-fade-in">
                {/* Image */}
                <div style={styles.imageSection}>
                    <div style={styles.imageContainer}>
                        <img
                            src={product.img_link}
                            alt={product.product_name}
                            style={styles.mainImage}
                            onError={(e) => { e.target.onerror = null; e.target.src = 'https://via.placeholder.com/500x500?text=No+Image'; }}
                        />
                    </div>
                </div>

                {/* Details */}
                <div style={styles.detailSection}>
                    {product.category && (
                        <span className="badge badge-accent" style={{ marginBottom: '8px' }}>
                            <Tag size={10} /> {product.category.split('|').slice(0, 2).join(' > ')}
                        </span>
                    )}
                    <h1 style={styles.productTitle}>{product.product_name || product.name}</h1>

                    {/* Rating */}
                    <div style={styles.ratingSection}>
                        <div style={styles.ratingStars}>
                            {[1, 2, 3, 4, 5].map(s => (
                                <Star key={s} size={16}
                                    fill={s <= Math.round(parseFloat(product.rating) || 0) ? '#f08804' : 'none'}
                                    color="#f08804"
                                />
                            ))}
                        </div>
                        <span style={styles.ratingValue}>{product.rating || 'N/A'}</span>
                        <span style={styles.ratingCount}>({product.rating_count || 0} ratings)</span>
                    </div>

                    {/* Price */}
                    <div style={styles.priceSection}>
                        <span style={styles.price}>{product.discounted_price || product.price || 'N/A'}</span>
                        {product.actual_price && (
                            <span style={styles.mrp}>MRP: <s>{product.actual_price}</s></span>
                        )}
                        {product.discount_percentage && (
                            <span className="badge badge-success">{product.discount_percentage} OFF</span>
                        )}
                    </div>

                    {/* Description */}
                    <div style={styles.descSection}>
                        <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '8px' }}>About this item</h3>
                        <p style={styles.description}>
                            {product.about_product || product.description || 'No description available.'}
                        </p>
                    </div>

                    {/* Trust Badges */}
                    <div style={styles.trustRow}>
                        <div style={styles.trustBadge}>
                            <Truck size={16} color="var(--clr-accent)" />
                            <span>Free Delivery</span>
                        </div>
                        <div style={styles.trustBadge}>
                            <Shield size={16} color="var(--clr-success)" />
                            <span>Secure Payment</span>
                        </div>
                    </div>

                    {/* Quantity + Actions */}
                    <div style={styles.qtyRow}>
                        <label style={{ fontSize: '0.88rem', fontWeight: 600 }}>Qty:</label>
                        <select value={qty} onChange={e => setQty(Number(e.target.value))} style={styles.qtySelect}>
                            {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}
                        </select>
                    </div>

                    <div style={styles.actionRow}>
                        <button
                            onClick={async () => {
                                if (!user) return navigate('/login');
                                await addToCart(id, qty);
                                showToast('✓ Added to cart');
                            }}
                            className="btn btn-primary"
                            style={{ flex: 1, padding: '14px 20px', fontSize: '0.95rem' }}
                        >
                            <ShoppingCart size={18} /> Add to Cart
                        </button>
                        <button
                            onClick={async () => {
                                if (!user) return navigate('/login');
                                const res = await toggleWishlist(id);
                                showToast(res.in_wishlist ? '♥ Added to wishlist' : 'Removed from wishlist');
                            }}
                            className="btn btn-secondary"
                            style={{ padding: '14px 20px' }}
                        >
                            <Heart size={18} /> Wishlist
                        </button>
                    </div>
                </div>
            </div>

            {/* Similar Products */}
            <section style={{ marginTop: '48px' }} className="animate-fade-in-up">
                <div className="section-header">
                    <h2><Sparkles size={18} /> Customers who viewed this also liked</h2>
                    <span className="count">{similarProducts.length} items</span>
                </div>
                {similarProducts.length > 0 ? (
                    <div style={styles.similarGrid}>
                        {similarProducts.map((simProduct, i) => (
                            <SimilarProductCard key={simProduct.product_id} product={simProduct} index={i} />
                        ))}
                    </div>
                ) : (
                    <p style={{ color: 'var(--clr-text-muted)' }}>No similar products found.</p>
                )}
            </section>

            {toast && <div className="toast">{toast}</div>}
        </div>
    );
};

const SimilarProductCard = ({ product, index }) => {
    const title = product.product_name || product.title || 'Untitled Product';

    return (
        <Link
            to={`/product/${product.product_id}`}
            className={`card animate-fade-in-up stagger-${(index % 8) + 1}`}
            style={styles.similarCard}
        >
            <div style={styles.simImgWrap}>
                <img src={product.img_link} alt={title}
                    style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                    onError={(e) => { e.target.onerror = null; e.target.src = 'https://via.placeholder.com/150x150?text=No+Image'; }}
                />
            </div>
            <h4 style={styles.simTitle}>{title}</h4>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Star size={12} fill="#f08804" color="#f08804" />
                <span style={{ fontSize: '0.78rem', fontWeight: 600 }}>{product.rating || 'N/A'}</span>
            </div>
            <div style={{ fontWeight: 800, color: 'var(--clr-text)' }}>{product.discounted_price || product.price || 'N/A'}</div>
            {product.similarity_score != null && (
                <span className="badge badge-primary" style={{ fontSize: '0.6rem' }}>
                    {(product.similarity_score * 100).toFixed(0)}% match
                </span>
            )}
        </Link>
    );
};

const styles = {
    backBtn: {
        display: 'inline-flex', alignItems: 'center', gap: '6px',
        background: 'none', border: 'none', color: 'var(--clr-accent)',
        fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer', marginBottom: '16px', padding: 0,
    },
    mainGrid: {
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px',
        alignItems: 'start',
    },
    imageSection: {},
    imageContainer: {
        background: '#f8f9fa', borderRadius: '20px', padding: '32px',
        display: 'grid', placeItems: 'center', minHeight: '400px',
        border: '1px solid var(--clr-border)',
    },
    mainImage: {
        maxWidth: '100%', maxHeight: '380px', objectFit: 'contain',
        transition: 'transform 0.4s',
    },
    detailSection: { display: 'flex', flexDirection: 'column', gap: '6px' },
    productTitle: {
        fontSize: '1.6rem', fontWeight: 800, lineHeight: 1.3,
        color: 'var(--clr-text)', letterSpacing: '-0.5px',
    },
    ratingSection: { display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' },
    ratingStars: { display: 'flex', gap: '2px' },
    ratingValue: { fontSize: '0.95rem', fontWeight: 700, color: 'var(--clr-star)' },
    ratingCount: { fontSize: '0.85rem', color: 'var(--clr-text-muted)' },
    priceSection: {
        display: 'flex', alignItems: 'baseline', gap: '10px',
        marginTop: '8px', flexWrap: 'wrap',
    },
    price: { fontSize: '1.8rem', fontWeight: 900, color: 'var(--clr-text)' },
    mrp: { fontSize: '0.9rem', color: 'var(--clr-text-muted)' },
    descSection: {
        marginTop: '16px', padding: '16px', background: 'var(--clr-bg)',
        borderRadius: '12px',
    },
    description: {
        color: 'var(--clr-text-muted)', lineHeight: 1.7, fontSize: '0.9rem',
    },
    trustRow: {
        display: 'flex', gap: '16px', marginTop: '16px',
    },
    trustBadge: {
        display: 'flex', alignItems: 'center', gap: '6px',
        fontSize: '0.82rem', fontWeight: 500, color: 'var(--clr-text-muted)',
    },
    qtyRow: {
        display: 'flex', alignItems: 'center', gap: '10px', marginTop: '16px',
    },
    qtySelect: {
        padding: '8px 14px', borderRadius: '10px', border: '1.5px solid var(--clr-border)',
        fontFamily: 'inherit', fontSize: '0.9rem', fontWeight: 600,
    },
    actionRow: {
        display: 'flex', gap: '12px', marginTop: '16px',
    },
    similarGrid: {
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '14px',
    },
    similarCard: {
        textDecoration: 'none', color: 'inherit', padding: '14px',
        display: 'flex', flexDirection: 'column', gap: '6px',
    },
    simImgWrap: {
        height: '140px', borderRadius: '10px', background: '#f8f9fa',
        display: 'grid', placeItems: 'center', overflow: 'hidden',
    },
    simTitle: {
        fontSize: '0.82rem', fontWeight: 600, lineHeight: 1.3,
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
    },
};

export default ProductDetails;
