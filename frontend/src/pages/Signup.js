import React, { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { CheckCircle2, Eye, EyeOff, ArrowRight, UserPlus } from 'lucide-react';
import BrandLogo from '../components/BrandLogo';
import API_URL from '../lib/apiBase';

const Signup = () => {
    const [formData, setFormData] = useState({
        username: '', email: '', password: '', confirmPassword: ''
    });
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const navigate = useNavigate();
    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (formData.password !== formData.confirmPassword) {
            return setError('Passwords do not match');
        }
        setIsSubmitting(true);
        try {
            await axios.post(`${API_URL}/api/auth/signup`, {
                username: formData.username, email: formData.email, password: formData.password
            });
            navigate('/login');
        } catch (err) {
            setError(err.response?.data?.message || 'Registration failed');
        } finally {
            setIsSubmitting(false);
        }
    };

    const passwordChecks = useMemo(() => [
        { label: '6+ characters', ok: formData.password.length >= 6 },
        { label: 'Contains a number', ok: /\d/.test(formData.password) },
        { label: 'Matches confirmation', ok: formData.password && formData.password === formData.confirmPassword },
    ], [formData.password, formData.confirmPassword]);

    return (
        <div style={styles.page}>
            <div style={styles.shell} className="animate-fade-in">
                {/* Form Panel */}
                <section style={styles.formPanel}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                        <UserPlus size={22} color="var(--clr-primary)" />
                        <h2 style={styles.formTitle}>Create Account</h2>
                    </div>
                    <p style={styles.formSub}>Start building recommendations that adapt in real time.</p>

                    {error && <div style={styles.errorBox}>{error}</div>}

                    <form onSubmit={handleSubmit} style={styles.form}>
                        <label style={styles.label} htmlFor="username">Username</label>
                        <input id="username" name="username" type="text" autoComplete="username" required
                            placeholder="Enter username" value={formData.username}
                            onChange={handleChange} style={styles.input} />

                        <label style={styles.label} htmlFor="email-address">Email</label>
                        <input id="email-address" name="email" type="email" autoComplete="email" required
                            placeholder="you@company.com" value={formData.email}
                            onChange={handleChange} style={styles.input} />

                        <label style={styles.label} htmlFor="password">Password</label>
                        <div style={styles.passwordWrap}>
                            <input id="password" name="password"
                                type={showPassword ? 'text' : 'password'}
                                autoComplete="new-password" required placeholder="Create password"
                                value={formData.password} onChange={handleChange}
                                style={{ ...styles.input, paddingRight: '44px', marginBottom: 0 }} />
                            <button type="button" onClick={() => setShowPassword(p => !p)} style={styles.eyeBtn}>
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>

                        <label style={styles.label} htmlFor="confirm-password">Confirm Password</label>
                        <div style={styles.passwordWrap}>
                            <input id="confirm-password" name="confirmPassword"
                                type={showConfirmPassword ? 'text' : 'password'}
                                autoComplete="new-password" required placeholder="Confirm password"
                                value={formData.confirmPassword} onChange={handleChange}
                                style={{ ...styles.input, paddingRight: '44px', marginBottom: 0 }} />
                            <button type="button" onClick={() => setShowConfirmPassword(p => !p)} style={styles.eyeBtn}>
                                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>

                        <button type="submit" disabled={isSubmitting} className="btn btn-primary"
                            style={{ width: '100%', padding: '14px', fontSize: '0.95rem', marginTop: '12px' }}>
                            {isSubmitting ? 'Creating account...' : 'Create Account'} <ArrowRight size={16} />
                        </button>
                    </form>

                    <p style={styles.footer}>
                        Already have an account? <Link to="/login" style={{ fontWeight: 700 }}>Log in</Link>
                    </p>
                </section>

                {/* Side Panel */}
                <section style={styles.sidePanel}>
                    <div style={{ marginBottom: '4px' }}>
                        <BrandLogo size="lg" dark />
                    </div>
                    <h3 style={styles.sideTitle}>What you unlock</h3>
                    <ul style={styles.featureList}>
                        <li>📊 Track recommendation performance and engagement</li>
                        <li>🤖 Personalized product feeds powered by hybrid ML</li>
                        <li>🔐 Secure JWT-based access with role-aware workflows</li>
                        <li>📈 Real-time Precision@K, NDCG, and coverage metrics</li>
                    </ul>

                    <div style={styles.pwGuide}>
                        <h4 style={{ fontSize: '0.88rem', fontWeight: 700, marginBottom: '10px' }}>Password Checklist</h4>
                        {passwordChecks.map(item => (
                            <div key={item.label} style={{
                                ...styles.checkItem,
                                color: item.ok ? 'var(--clr-success)' : 'rgba(255,255,255,0.4)',
                            }}>
                                <CheckCircle2 size={15} />
                                <span>{item.label}</span>
                            </div>
                        ))}
                    </div>
                </section>
            </div>
        </div>
    );
};

const styles = {
    page: {
        minHeight: 'calc(100vh - 60px)', display: 'grid', placeItems: 'center',
        padding: '24px 16px', background: 'var(--clr-bg)',
    },
    shell: {
        display: 'grid', gridTemplateColumns: '1fr 0.85fr',
        maxWidth: '920px', width: '100%', borderRadius: '20px',
        overflow: 'hidden', boxShadow: 'var(--shadow-xl)',
        border: '1px solid var(--clr-border)',
    },
    formPanel: {
        background: 'var(--clr-surface)', padding: '36px 32px',
        display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '14px',
    },
    formTitle: { fontSize: '1.4rem', fontWeight: 800, margin: 0 },
    formSub: { color: 'var(--clr-text-muted)', fontSize: '0.88rem', marginBottom: '4px' },
    errorBox: {
        background: 'var(--clr-danger-bg)', color: 'var(--clr-danger)',
        padding: '10px 14px', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 600,
    },
    form: { display: 'flex', flexDirection: 'column', gap: '2px' },
    label: { fontSize: '0.82rem', fontWeight: 600, color: 'var(--clr-text)', marginTop: '8px' },
    input: {
        width: '100%', padding: '11px 14px', borderRadius: '10px',
        border: '1.5px solid var(--clr-border)', fontFamily: 'inherit',
        fontSize: '0.9rem', outline: 'none', marginBottom: '2px',
    },
    passwordWrap: { position: 'relative' },
    eyeBtn: {
        position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
        background: 'none', border: 'none', color: 'var(--clr-text-muted)', cursor: 'pointer', padding: 0,
    },
    footer: { fontSize: '0.85rem', color: 'var(--clr-text-muted)', textAlign: 'center', marginTop: '4px' },
    sidePanel: {
        background: 'linear-gradient(160deg, #131921 0%, #1a2332 60%, #232f3e 100%)',
        color: '#fff', padding: '36px 28px',
        display: 'flex', flexDirection: 'column', gap: '20px',
    },
    sideTitle: { fontSize: '1.1rem', fontWeight: 800 },
    featureList: {
        listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '10px',
        fontSize: '0.88rem', color: 'rgba(255,255,255,0.75)', lineHeight: 1.5,
    },
    pwGuide: {
        marginTop: 'auto', background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '14px', padding: '16px',
    },
    checkItem: {
        display: 'flex', alignItems: 'center', gap: '8px',
        fontSize: '0.82rem', marginBottom: '6px', transition: 'color 200ms',
    },
};

export default Signup;
