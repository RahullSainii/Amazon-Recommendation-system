import React, { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { RefreshCcw, Sparkles, Compass, TrendingUp, Activity, Brain, Star, ShoppingCart, Heart, BarChart3, MousePointerClick, ShoppingBag, Eye } from 'lucide-react';
import { useShop } from '../context/ShopContext';
import API_URL from '../lib/apiBase';

const Dashboard = () => {
    const { user } = useAuth();
    const { addToCart, toggleWishlist } = useShop();
    const navigate = useNavigate();
    const [recommendations, setRecommendations] = useState([]);
    const [popularProducts, setPopularProducts] = useState([]);
    const [mlMetrics, setMlMetrics] = useState(null);
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState('');
    const [toast, setToast] = useState('');

    const token = localStorage.getItem('token');

    const fetchData = useCallback(async (isRefresh = false) => {
        if (!token) return;
        setError('');
        if (isRefresh) setRefreshing(true);
        else setLoading(true);

        try {
            const [recResponse, popularResponse, metricsResponse, analyticsResponse] = await Promise.all([
                axios.get(`${API_URL}/api/recommendations?limit=8`, {
                    headers: { Authorization: `Bearer ${token}` }
                }),
                axios.get(`${API_URL}/api/products?limit=12`),
                axios.get(`${API_URL}/api/ml/metrics`).catch(() => ({ data: {} })),
                axios.get(`${API_URL}/api/analytics/summary?days=7`, {
                    headers: { Authorization: `Bearer ${token}` }
                }).catch(() => ({ data: null })),
            ]);

            setRecommendations(Array.isArray(recResponse.data) ? recResponse.data : []);
            setPopularProducts(Array.isArray(popularResponse.data) ? popularResponse.data : []);
            setMlMetrics(metricsResponse.data);
            setAnalytics(analyticsResponse.data);
        } catch (err) {
            setError(err.response?.data?.message || 'Could not load dashboard data.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [token]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const topCategories = useMemo(() => {
        const source = recommendations.length > 0 ? recommendations : popularProducts;
        const counts = {};
        source.forEach((item) => {
            const category = (item.category || 'General').split('|')[0]?.trim();
            counts[category] = (counts[category] || 0) + 1;
        });
        return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([name]) => name);
    }, [recommendations, popularProducts]);

    const recStrategy = recommendations[0]?.rec_strategy;
    const experimentVariant = analytics?.current_experiment?.variant_key || recommendations[0]?.experiment_variant;

    const handleSurpriseMe = () => {
        const source = recommendations.length > 0 ? recommendations : popularProducts;
        if (!source.length) return;
        navigate(`/product/${source[Math.floor(Math.random() * source.length)].product_id}`);
    };

    const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2000); };

    if (loading) return (
        <div className="page-loading">
            <div className="spinner" />
            <span>Loading your personalized dashboard...</span>
        </div>
    );

    return (
        <div className="container" style={{ paddingTop: '32px', paddingBottom: '48px' }}>
            {/* Hero */}
            <header style={styles.hero} className="animate-fade-in">
                <div style={styles.heroLeft}>
                    <span className="badge badge-accent">
                        <Brain size={12} /> ML Dashboard
                    </span>
                    <h1 style={styles.heroTitle}>
                        Welcome back, <span style={{ color: 'var(--clr-primary)' }}>{user?.username || 'User'}</span>
                    </h1>
                    <p style={styles.heroSub}>
                        Your personalized feed is powered by{' '}
                        <strong style={{ color: '#fff' }}>
                            {recStrategy === 'hybrid_cf_popularity' ? 'Hybrid CF + Popularity' :
                                recStrategy === 'content_based_history' ? 'Content-Based Filtering' :
                                    recStrategy === 'popularity_baseline' ? 'Popularity Baseline' : 'our ML engine'}
                        </strong>.
                    </p>
                    {experimentVariant && (
                        <p style={{ ...styles.heroSub, marginBottom: '10px' }}>
                            Active experiment variant: <strong style={{ color: '#fff', textTransform: 'capitalize' }}>{experimentVariant}</strong>
                        </p>
                    )}
                    <div style={styles.chipRow}>
                        {topCategories.map(c => (
                            <span key={c} className="badge badge-primary" style={{ fontSize: '0.7rem' }}>{c}</span>
                        ))}
                    </div>
                    <div style={styles.heroActions}>
                        <button onClick={() => fetchData(true)} disabled={refreshing} className="btn btn-secondary" style={{ color: '#fff', borderColor: 'rgba(255,255,255,0.2)' }}>
                            <RefreshCcw size={14} className={refreshing ? 'spinning' : ''} />
                            {refreshing ? 'Refreshing...' : 'Refresh'}
                        </button>
                        <button onClick={handleSurpriseMe} className="btn btn-primary">
                            <Compass size={14} /> Surprise Me
                        </button>
                    </div>
                </div>
            </header>

            {error && <div style={styles.errorBanner}>{error}</div>}

            {/* ML Metrics */}
            {mlMetrics && (mlMetrics.n_items || mlMetrics.n_users) && (
                <section className="animate-fade-in-up" style={{ marginBottom: '36px' }}>
                    <div className="section-header">
                        <h2><Activity size={18} /> Model Performance</h2>
                        <span className="badge badge-success">
                            {mlMetrics.model_type || 'Hybrid ML'}
                        </span>
                    </div>
                    <div className="metrics-row">
                        <MetricCard value={mlMetrics.n_items || 0} label="Products" />
                        <MetricCard value={mlMetrics.n_users || 0} label="Users" />
                        <MetricCard value={mlMetrics.n_interactions || 0} label="Interactions" />
                        <MetricCard
                            value={mlMetrics.precision_at_10 != null ? (mlMetrics.precision_at_10 * 100).toFixed(1) + '%' : 'N/A'}
                            label="Precision@10"
                        />
                        <MetricCard
                            value={mlMetrics.ndcg_at_10 != null ? (mlMetrics.ndcg_at_10 * 100).toFixed(1) + '%' : 'N/A'}
                            label="NDCG@10"
                        />
                        <MetricCard
                            value={mlMetrics.catalog_coverage != null ? (mlMetrics.catalog_coverage * 100).toFixed(1) + '%' : 'N/A'}
                            label="Coverage"
                        />
                    </div>
                </section>
            )}

            {analytics && (
                <section className="animate-fade-in-up" style={{ marginBottom: '36px' }}>
                    <div className="section-header">
                        <h2><BarChart3 size={18} /> Experiment & Analytics</h2>
                        <span className="badge badge-primary">
                            {analytics.window_days}-day window
                        </span>
                    </div>
                    <div className="metrics-row" style={{ marginBottom: '18px' }}>
                        <MetricCard value={analytics.totals?.impressions || 0} label="Impressions" icon={<Eye size={16} />} />
                        <MetricCard value={analytics.totals?.click || 0} label="Clicks" icon={<MousePointerClick size={16} />} />
                        <MetricCard value={`${analytics.ctr || 0}%`} label="CTR" icon={<TrendingUp size={16} />} />
                        <MetricCard value={analytics.totals?.add_to_cart || 0} label="Add to Cart" icon={<ShoppingCart size={16} />} />
                        <MetricCard value={analytics.totals?.purchase || 0} label="Purchases" icon={<ShoppingBag size={16} />} />
                        <MetricCard value={`${analytics.conversion_rate || 0}%`} label="Conversion" icon={<Activity size={16} />} />
                    </div>
                    <div style={styles.analyticsGrid}>
                        <div className="card" style={styles.analyticsCard}>
                            <h3 style={styles.analyticsTitle}>Experiment Variants</h3>
                            <div style={styles.variantList}>
                                {(analytics.experiment_summary?.variants || []).map((variant) => (
                                    <div key={variant.variant_key} style={styles.variantRow}>
                                        <div>
                                            <div style={styles.variantName}>{variant.variant_key}</div>
                                            <div style={styles.variantMeta}>
                                                {variant.impressions} impressions | {variant.clicks} clicks
                                            </div>
                                        </div>
                                        <div style={styles.variantStats}>
                                            <span>{variant.ctr}% CTR</span>
                                            <span>{variant.conversion_rate}% CVR</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="card" style={styles.analyticsCard}>
                            <h3 style={styles.analyticsTitle}>Recent Trend</h3>
                            <div style={styles.timelineList}>
                                {(analytics.timeline || []).slice(-4).map((day) => (
                                    <div key={day.day} style={styles.timelineRow}>
                                        <span style={styles.timelineDay}>{day.day}</span>
                                        <span style={styles.timelineMetric}>{day.impressions} imp</span>
                                        <span style={styles.timelineMetric}>{day.click} clk</span>
                                        <span style={styles.timelineMetric}>{day.purchase} buy</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>
            )}

            {/* Recommendations */}
            <section style={{ marginBottom: '40px' }} className="animate-fade-in-up">
                <div className="section-header">
                    <h2><Sparkles size={18} /> Recommended For You</h2>
                    <span className="count">{recommendations.length} items</span>
                </div>
                {recommendations.length > 0 ? (
                    <div className="product-grid">
                        {recommendations.map((product, i) => (
                            <DashProductCard key={product.product_id} product={product} index={i}
                                addToCart={addToCart} toggleWishlist={toggleWishlist} token={token} showToast={showToast} />
                        ))}
                    </div>
                ) : (
                    <EmptyRecommendationState />
                )}
            </section>

            {/* Trending */}
            <section className="animate-fade-in-up">
                <div className="section-header">
                    <h2><TrendingUp size={18} /> Trending Now</h2>
                    <span className="count">{popularProducts.length} items</span>
                </div>
                <div className="product-grid">
                    {popularProducts.slice(0, 8).map((product, i) => (
                        <DashProductCard key={product.product_id} product={product} index={i}
                            addToCart={addToCart} toggleWishlist={toggleWishlist} token={token} showToast={showToast} />
                    ))}
                </div>
            </section>

            {toast && <div className="toast">{toast}</div>}
        </div>
    );
};

const MetricCard = ({ value, label, icon }) => (
    <div className="metric-card">
        {icon && <div style={{ color: 'var(--clr-primary)', marginBottom: '6px' }}>{icon}</div>}
        <div className="metric-value">{value}</div>
        <div className="metric-label">{label}</div>
    </div>
);

const EmptyRecommendationState = () => (
    <div style={styles.emptyState} className="card">
        <Sparkles size={32} style={{ color: 'var(--clr-primary)', marginBottom: '12px' }} />
        <h3 style={{ marginBottom: '8px' }}>Building your profile</h3>
        <p style={{ color: 'var(--clr-text-muted)', maxWidth: '400px', margin: '0 auto 16px' }}>
            Browse products, add items to your cart, and your personalized recommendations will improve with every interaction.
        </p>
        <Link to="/" className="btn btn-primary">Explore Products</Link>
    </div>
);

const DashProductCard = ({ product, index, addToCart, toggleWishlist, token, showToast }) => {
    const price = product.discounted_price || product.price || 'N/A';
    const title = product.product_name || product.title || 'Untitled Product';
    const explanation = product.recommendation_explanation;

    const logInteraction = async () => {
        if (!token || !product.product_id) return;
        try {
            await axios.post(
                `${API_URL}/api/interactions`,
                { product_id: product.product_id, type: 'click', experiment_variant: product.experiment_variant || '' },
                { headers: { Authorization: `Bearer ${token}` } }
            );
        } catch { }
    };

    return (
        <div className={`card animate-fade-in-up stagger-${(index % 8) + 1}`} style={styles.prodCard}>
            <Link to={`/product/${product.product_id}`} onClick={logInteraction} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div style={styles.prodImgWrap}>
                    <img src={product.img_link} alt={title}
                        style={styles.prodImg}
                        onError={(e) => { e.target.onerror = null; e.target.src = 'https://via.placeholder.com/180x180?text=No+Image'; }}
                    />
                </div>
                <h3 style={styles.prodName}>{title}</h3>
            </Link>
            {product.rec_strategy && (
                <span className="badge badge-accent" style={{ fontSize: '0.6rem', alignSelf: 'flex-start' }}>
                    {product.rec_strategy === 'hybrid_cf_popularity' ? 'Hybrid' :
                        product.rec_strategy === 'content_based_history' ? 'Content' :
                            product.rec_strategy === 'popularity_baseline' ? 'Trending' : product.rec_strategy}
                </span>
            )}
            {explanation?.reason_text && (
                <p style={styles.explanationText}>{explanation.reason_text}</p>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Star size={13} fill="#f08804" color="#f08804" />
                <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>{product.rating || 'N/A'}</span>
            </div>
            <div style={styles.prodPriceRow}>
                <span style={{ fontSize: '1.1rem', fontWeight: 800 }}>{price}</span>
                <Link to={`/product/${product.product_id}`} onClick={logInteraction} className="btn btn-accent" style={{ fontSize: '0.75rem', padding: '5px 14px' }}>
                    View
                </Link>
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
                <button onClick={() => { addToCart(product.product_id, 1); showToast('Added to cart'); }} className="btn btn-primary" style={{ flex: 1, fontSize: '0.78rem', padding: '6px 10px' }}>
                    <ShoppingCart size={12} /> Cart
                </button>
                <button onClick={() => { toggleWishlist(product.product_id); showToast('Wishlist updated'); }} className="btn-icon" style={{ width: '34px', height: '34px' }}>
                    <Heart size={13} />
                </button>
            </div>
        </div>
    );
};

const styles = {
    hero: {
        background: 'linear-gradient(135deg, #131921 0%, #1a2332 60%, #232f3e 100%)',
        borderRadius: '20px',
        padding: '40px 36px',
        marginBottom: '32px',
        color: '#fff',
    },
    heroLeft: { maxWidth: '600px' },
    heroTitle: {
        fontSize: '2rem',
        fontWeight: 900,
        color: '#fff',
        marginTop: '10px',
        marginBottom: '8px',
        letterSpacing: '-0.5px',
    },
    heroSub: { color: 'rgba(255,255,255,0.6)', fontSize: '0.95rem', lineHeight: 1.5, marginBottom: '12px' },
    chipRow: { display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '16px' },
    heroActions: { display: 'flex', gap: '10px' },
    errorBanner: { background: 'var(--clr-danger-bg)', color: 'var(--clr-danger)', padding: '12px 20px', borderRadius: '12px', marginBottom: '20px', fontWeight: 600 },
    emptyState: { textAlign: 'center', padding: '40px 20px' },
    prodCard: { padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px' },
    prodImgWrap: { height: '170px', background: '#f8f9fa', borderRadius: '12px', display: 'grid', placeItems: 'center', overflow: 'hidden' },
    prodImg: { maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', transition: 'transform 0.3s' },
    prodName: { fontSize: '0.88rem', fontWeight: 600, lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' },
    prodPriceRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    explanationText: { fontSize: '0.75rem', color: 'var(--clr-text-muted)', lineHeight: 1.45, minHeight: '34px' },
    analyticsGrid: { display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: '16px' },
    analyticsCard: { padding: '18px' },
    analyticsTitle: { fontSize: '1rem', fontWeight: 700, marginBottom: '14px' },
    variantList: { display: 'flex', flexDirection: 'column', gap: '12px' },
    variantRow: { display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' },
    variantName: { fontWeight: 700, textTransform: 'capitalize' },
    variantMeta: { fontSize: '0.8rem', color: 'var(--clr-text-muted)' },
    variantStats: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', fontSize: '0.8rem', fontWeight: 600, color: 'var(--clr-text)' },
    timelineList: { display: 'flex', flexDirection: 'column', gap: '10px' },
    timelineRow: { display: 'grid', gridTemplateColumns: '1.2fr 0.8fr 0.8fr 0.8fr', gap: '8px', fontSize: '0.82rem', alignItems: 'center' },
    timelineDay: { fontWeight: 600 },
    timelineMetric: { color: 'var(--clr-text-muted)' },
};

export default Dashboard;
