import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, Star, ShoppingCart, Sparkles, TrendingUp, Zap } from 'lucide-react';
import SearchBar from '../components/SearchBar';
import { useAuth } from '../context/AuthContext';
import { useShop } from '../context/ShopContext';
import API_URL from '../lib/apiBase';

const Home = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { addToCart, toggleWishlist } = useShop();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filteredProducts, setFilteredProducts] = useState([]);
    const [message, setMessage] = useState('');
    const [activeCategory, setActiveCategory] = useState('All');

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const response = await axios.get(`${API_URL}/api/products?limit=40`);
                setProducts(response.data);
                setFilteredProducts(response.data);
            } catch (error) {
                console.error('Error fetching products:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchProducts();
    }, []);

    const categories = ['All', ...new Set(
        products.map(p => {
            const cat = p.category || '';
            return cat.split('|')[0]?.trim() || 'Other';
        }).filter(Boolean)
    )].slice(0, 8);

    const handleSearch = (query) => {
        let base = products;
        if (activeCategory !== 'All') {
            base = products.filter(p => (p.category || '').includes(activeCategory));
        }
        if (query.trim() === '') {
            setFilteredProducts(base);
        } else {
            const filtered = base.filter(product =>
                (product.product_name || '').toLowerCase().includes(query.toLowerCase())
            );
            setFilteredProducts(filtered);
        }
    };

    const handleCategoryFilter = (cat) => {
        setActiveCategory(cat);
        if (cat === 'All') {
            setFilteredProducts(products);
        } else {
            setFilteredProducts(products.filter(p => (p.category || '').includes(cat)));
        }
    };

    const showToast = (msg) => {
        setMessage(msg);
        setTimeout(() => setMessage(''), 2000);
    };

    const handleAddToCart = async (productId) => {
        if (!user) return navigate('/login');
        try {
            await addToCart(productId, 1);
            showToast('✓ Added to cart');
        } catch {
            showToast('Could not add to cart');
        }
    };

    const handleWishlist = async (productId) => {
        if (!user) return navigate('/login');
        try {
            const result = await toggleWishlist(productId);
            showToast(result.in_wishlist ? '♥ Added to wishlist' : 'Removed from wishlist');
        } catch {
            showToast('Could not update wishlist');
        }
    };

    if (loading) return (
        <div className="page-loading">
            <div className="spinner" />
            <span>Loading products...</span>
        </div>
    );

    return (
        <div className="container" style={{ paddingTop: '32px', paddingBottom: '48px' }}>
            {/* Hero Section */}
            <section style={styles.hero} className="animate-fade-in">
                <div style={styles.heroContent}>
                    <span className="badge badge-primary" style={{ marginBottom: '12px' }}>
                        <Zap size={12} /> ML-Powered Recommendations
                    </span>
                    <h1 style={styles.heroTitle}>
                        Discover Products<br />
                        <span style={{ color: 'var(--clr-primary)' }}>You'll Love</span>
                    </h1>
                    <p style={styles.heroSubtitle}>
                        Personalized recommendations powered by collaborative filtering, content analysis, and machine learning.
                    </p>
                    {user ? (
                        <Link to="/dashboard" className="btn btn-primary" style={{ marginTop: '8px' }}>
                            <Sparkles size={16} /> View My Recommendations
                        </Link>
                    ) : (
                        <Link to="/signup" className="btn btn-primary" style={{ marginTop: '8px' }}>
                            Get Started Free
                        </Link>
                    )}
                </div>
                <div style={styles.heroStats}>
                    <StatCard icon={<TrendingUp size={20} />} value={products.length + '+'} label="Products" />
                    <StatCard icon={<Sparkles size={20} />} value="3" label="ML Models" />
                    <StatCard icon={<Star size={20} />} value="Hybrid" label="Algorithm" />
                </div>
            </section>

            {/* Search & Filters */}
            <div style={styles.searchRow} className="animate-fade-in-up">
                <SearchBar onSearch={handleSearch} />
                <div style={styles.categoryRow}>
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => handleCategoryFilter(cat)}
                            style={{
                                ...styles.categoryChip,
                                ...(activeCategory === cat ? styles.categoryChipActive : {}),
                            }}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            {/* Results Count */}
            <div style={styles.resultsBar}>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>
                    {activeCategory === 'All' ? 'All Products' : activeCategory}
                </h2>
                <span style={{ color: 'var(--clr-text-muted)', fontSize: '0.88rem' }}>
                    {filteredProducts.length} results
                </span>
            </div>

            {/* Product Grid */}
            <div className="product-grid">
                {filteredProducts.map((product, i) => (
                    <ProductCard
                        key={product.product_id}
                        product={product}
                        index={i}
                        onAddToCart={handleAddToCart}
                        onWishlist={handleWishlist}
                    />
                ))}
            </div>

            {filteredProducts.length === 0 && (
                <div style={styles.emptyState}>
                    <p>No products found. Try a different search or category.</p>
                </div>
            )}

            {/* Toast */}
            {message && <div className="toast">{message}</div>}
        </div>
    );
};

const StatCard = ({ icon, value, label }) => (
    <div style={styles.statCard}>
        <div style={styles.statIcon}>{icon}</div>
        <div style={styles.statValue}>{value}</div>
        <div style={styles.statLabel}>{label}</div>
    </div>
);

const ProductCard = ({ product, index, onAddToCart, onWishlist }) => {
    const [imgLoaded, setImgLoaded] = useState(false);

    return (
        <div className={`card animate-fade-in-up stagger-${(index % 8) + 1}`} style={styles.productCard}>
            <Link to={`/product/${product.product_id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div style={styles.imageWrap}>
                    <img
                        src={product.img_link}
                        alt={product.product_name}
                        style={{
                            ...styles.productImage,
                            opacity: imgLoaded ? 1 : 0,
                        }}
                        onLoad={() => setImgLoaded(true)}
                        onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = 'https://via.placeholder.com/200x200?text=No+Image';
                            setImgLoaded(true);
                        }}
                    />
                    {!imgLoaded && <div className="skeleton" style={{ position: 'absolute', inset: 0 }} />}
                </div>
                <h3 style={styles.productName}>{product.product_name}</h3>
            </Link>

            <div style={styles.ratingRow}>
                <Star size={14} fill="#f08804" color="#f08804" />
                <span style={styles.ratingText}>{product.rating}</span>
                <span style={styles.ratingCount}>({product.rating_count})</span>
            </div>

            <div style={styles.priceRow}>
                <span style={styles.price}>{product.discounted_price}</span>
                {product.actual_price && (
                    <span style={styles.originalPrice}>{product.actual_price}</span>
                )}
                {product.discount_percentage && (
                    <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>
                        {product.discount_percentage} OFF
                    </span>
                )}
            </div>

            <div style={styles.actionRow}>
                <button
                    onClick={(e) => { e.preventDefault(); onAddToCart(product.product_id); }}
                    className="btn btn-primary"
                    style={{ flex: 1, fontSize: '0.82rem', padding: '8px 12px' }}
                >
                    <ShoppingCart size={14} />
                    Add to Cart
                </button>
                <button
                    onClick={(e) => { e.preventDefault(); onWishlist(product.product_id); }}
                    className="btn-icon"
                    title="Add to wishlist"
                >
                    <Heart size={16} />
                </button>
            </div>
        </div>
    );
};

const styles = {
    hero: {
        background: 'linear-gradient(135deg, #131921 0%, #1a2332 60%, #232f3e 100%)',
        borderRadius: '20px',
        padding: '48px 40px',
        marginBottom: '32px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '40px',
        overflow: 'hidden',
        position: 'relative',
    },
    heroContent: {
        flex: 1,
        color: '#fff',
    },
    heroTitle: {
        fontSize: '2.5rem',
        fontWeight: 900,
        lineHeight: 1.15,
        color: '#fff',
        marginBottom: '12px',
        letterSpacing: '-1px',
    },
    heroSubtitle: {
        fontSize: '1rem',
        color: 'rgba(255,255,255,0.65)',
        lineHeight: 1.6,
        maxWidth: '480px',
    },
    heroStats: {
        display: 'flex',
        gap: '16px',
        flexShrink: 0,
    },
    statCard: {
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '16px',
        padding: '20px 24px',
        textAlign: 'center',
        backdropFilter: 'blur(8px)',
        minWidth: '100px',
    },
    statIcon: {
        color: '#ff9900',
        marginBottom: '8px',
    },
    statValue: {
        fontSize: '1.4rem',
        fontWeight: 800,
        color: '#fff',
    },
    statLabel: {
        fontSize: '0.72rem',
        color: 'rgba(255,255,255,0.5)',
        textTransform: 'uppercase',
        letterSpacing: '0.8px',
        fontWeight: 600,
        marginTop: '2px',
    },
    searchRow: {
        marginBottom: '28px',
    },
    categoryRow: {
        display: 'flex',
        gap: '8px',
        flexWrap: 'wrap',
        marginTop: '12px',
    },
    categoryChip: {
        padding: '6px 16px',
        borderRadius: '9999px',
        fontSize: '0.82rem',
        fontWeight: 500,
        background: 'var(--clr-surface)',
        color: 'var(--clr-text-muted)',
        border: '1.5px solid var(--clr-border)',
        cursor: 'pointer',
        transition: 'all 200ms',
    },
    categoryChipActive: {
        background: 'var(--clr-nav-bg)',
        color: '#fff',
        borderColor: 'var(--clr-nav-bg)',
    },
    resultsBar: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
    },
    productCard: {
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
    },
    imageWrap: {
        position: 'relative',
        background: '#f8f9fa',
        borderRadius: '12px',
        height: '200px',
        display: 'grid',
        placeItems: 'center',
        overflow: 'hidden',
        marginBottom: '4px',
    },
    productImage: {
        maxWidth: '100%',
        maxHeight: '100%',
        objectFit: 'contain',
        transition: 'opacity 0.3s, transform 0.4s',
    },
    productName: {
        fontSize: '0.92rem',
        fontWeight: 600,
        lineHeight: 1.35,
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
        color: 'var(--clr-text)',
    },
    ratingRow: {
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
    },
    ratingText: {
        fontSize: '0.85rem',
        fontWeight: 700,
        color: 'var(--clr-star)',
    },
    ratingCount: {
        fontSize: '0.78rem',
        color: 'var(--clr-text-muted)',
    },
    priceRow: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        flexWrap: 'wrap',
    },
    price: {
        fontSize: '1.15rem',
        fontWeight: 800,
        color: 'var(--clr-text)',
    },
    originalPrice: {
        fontSize: '0.82rem',
        color: 'var(--clr-text-muted)',
        textDecoration: 'line-through',
    },
    actionRow: {
        display: 'flex',
        gap: '8px',
        marginTop: 'auto',
        paddingTop: '4px',
    },
    emptyState: {
        textAlign: 'center',
        padding: '48px',
        color: 'var(--clr-text-muted)',
    },
};

export default Home;
