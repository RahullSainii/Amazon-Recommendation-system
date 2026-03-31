import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, Sparkles, ShieldCheck, BarChart3, ArrowRight } from 'lucide-react';
import BrandLogo from '../components/BrandLogo';
import api from '../lib/api';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsSubmitting(true);
        try {
            const response = await api.post('/auth/login', { email, password });
            const { token, user } = response.data;
            login(token, user || { email });
            try {
                const prefResponse = await api.get('/preferences', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const categories = prefResponse.data?.categories || [];
                navigate(Array.isArray(categories) && categories.length === 0 ? '/onboarding' : '/dashboard');
            } catch {
                navigate('/dashboard');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Login failed');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div style={styles.page}>
            <div style={styles.shell} className="animate-fade-in">
                <section style={styles.brandPanel}>
                    <div>
                        <div style={styles.logoRow}>
                            <BrandLogo size="lg" dark />
                        </div>
                        <span style={styles.badgeTag}>Recommendation Intelligence Platform</span>
                    </div>
                    <h1 style={styles.brandTitle}>
                        Build <span style={{ color: 'var(--clr-primary)' }}>real-time personalization</span> customers remember.
                    </h1>
                    <p style={styles.brandSub}>
                        Sign in to monitor ranking quality, engagement lift, and recommendation performance.
                    </p>
                    <div style={styles.highlights}>
                        <HighlightCard icon={<Sparkles size={18} />} title="Hybrid Ranking" desc="Collaborative + content-aware retrieval." />
                        <HighlightCard icon={<BarChart3 size={18} />} title="Performance Analytics" desc="Track Precision@K, NDCG, and coverage." />
                        <HighlightCard icon={<ShieldCheck size={18} />} title="Secure Access" desc="JWT-protected APIs with role controls." />
                    </div>
                </section>

                <section style={styles.formPanel}>
                    <div>
                        <h2 style={styles.formTitle}>Welcome Back</h2>
                        <p style={styles.formSub}>Sign in to your recommendation dashboard.</p>
                    </div>

                    {error && <div style={styles.errorBox}>{error}</div>}

                    <form onSubmit={handleSubmit} style={styles.form}>
                        <label style={styles.label} htmlFor="email-address">Email</label>
                        <input
                            id="email-address" name="email" type="email" autoComplete="email" required
                            placeholder="you@company.com"
                            value={email} onChange={(e) => setEmail(e.target.value)}
                            style={styles.input}
                        />

                        <label style={styles.label} htmlFor="password">Password</label>
                        <div style={styles.passwordWrap}>
                            <input
                                id="password" name="password"
                                type={showPassword ? 'text' : 'password'}
                                autoComplete="current-password" required
                                placeholder="Enter your password"
                                value={password} onChange={(e) => setPassword(e.target.value)}
                                style={{ ...styles.input, paddingRight: '44px', marginBottom: 0 }}
                            />
                            <button type="button" onClick={() => setShowPassword(p => !p)} style={styles.eyeBtn}
                                aria-label={showPassword ? 'Hide password' : 'Show password'}>
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>

                        <div style={{ textAlign: 'right', marginTop: '4px' }}>
                            <Link to="/forget-password" style={{ fontSize: '0.82rem', color: 'var(--clr-accent)' }}>Forgot password?</Link>
                        </div>

                        <button type="submit" disabled={isSubmitting} className="btn btn-primary"
                            style={{ width: '100%', padding: '14px', fontSize: '0.95rem', marginTop: '8px' }}>
                            {isSubmitting ? 'Signing in...' : 'Sign In'} <ArrowRight size={16} />
                        </button>
                    </form>

                    <p style={styles.footer}>
                        New to the platform? <Link to="/signup" style={{ fontWeight: 700 }}>Create an account</Link>
                    </p>
                </section>
            </div>
        </div>
    );
};

const HighlightCard = ({ icon, title, desc }) => (
    <div style={styles.highlightCard}>
        <div style={{ color: '#ff9900', flexShrink: 0 }}>{icon}</div>
        <div>
            <strong style={{ display: 'block', fontSize: '0.88rem' }}>{title}</strong>
            <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.55)' }}>{desc}</span>
        </div>
    </div>
);

const styles = {
    page: {
        minHeight: 'calc(100vh - 60px)',
        display: 'grid', placeItems: 'center',
        padding: '24px 16px',
        background: 'var(--clr-bg)',
    },
    shell: {
        display: 'grid', gridTemplateColumns: '1.1fr 0.9fr',
        maxWidth: '960px', width: '100%',
        borderRadius: '20px', overflow: 'hidden',
        boxShadow: 'var(--shadow-xl)',
        border: '1px solid var(--clr-border)',
    },
    brandPanel: {
        background: 'linear-gradient(160deg, #131921 0%, #1a2332 60%, #232f3e 100%)',
        color: '#fff', padding: '40px 36px',
        display: 'flex', flexDirection: 'column', gap: '20px',
    },
    logoRow: { marginBottom: '10px' },
    badgeTag: {
        display: 'inline-block', background: 'rgba(255,153,0,0.15)', color: '#ff9900',
        padding: '4px 12px', borderRadius: '9999px', fontSize: '0.7rem',
        fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px',
    },
    brandTitle: { fontSize: '1.5rem', fontWeight: 800, lineHeight: 1.3, color: '#fff' },
    brandSub: { fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 },
    highlights: { display: 'flex', flexDirection: 'column', gap: '10px', marginTop: 'auto' },
    highlightCard: {
        display: 'flex', alignItems: 'flex-start', gap: '12px',
        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: '12px', padding: '12px 14px',
    },
    formPanel: {
        background: 'var(--clr-surface)', padding: '40px 36px',
        display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '20px',
    },
    formTitle: { fontSize: '1.5rem', fontWeight: 800, marginBottom: '2px' },
    formSub: { color: 'var(--clr-text-muted)', fontSize: '0.9rem' },
    errorBox: {
        background: 'var(--clr-danger-bg)', color: 'var(--clr-danger)',
        padding: '10px 14px', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 600,
    },
    form: { display: 'flex', flexDirection: 'column', gap: '4px' },
    label: { fontSize: '0.82rem', fontWeight: 600, color: 'var(--clr-text)', marginTop: '10px' },
    input: {
        width: '100%', padding: '12px 14px', borderRadius: '10px',
        border: '1.5px solid var(--clr-border)', fontFamily: 'inherit',
        fontSize: '0.9rem', transition: 'border-color 200ms',
        outline: 'none', marginBottom: '4px',
    },
    passwordWrap: { position: 'relative' },
    eyeBtn: {
        position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
        background: 'none', border: 'none', color: 'var(--clr-text-muted)', cursor: 'pointer', padding: 0,
    },
    footer: { fontSize: '0.85rem', color: 'var(--clr-text-muted)', textAlign: 'center' },
};

export default Login;
