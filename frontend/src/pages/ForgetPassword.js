import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Eye, EyeOff, Mail, ShieldCheck, ArrowRight, KeyRound } from 'lucide-react';
import BrandLogo from '../components/BrandLogo';
import API_URL from '../lib/apiBase';

const ForgetPassword = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [devCode, setDevCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [code, setCode] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [resetLoading, setResetLoading] = useState(false);
    const [showResetForm, setShowResetForm] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true); setError(''); setMessage(''); setDevCode('');
        try {
            const response = await axios.post(`${API_URL}/api/auth/forget-password`, { email });
            setMessage(response.data.message || 'Reset code sent successfully.');
            setShowResetForm(true);
            if (response.data.reset_code) setDevCode(response.data.reset_code);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to send reset code');
        } finally { setLoading(false); }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault(); setError(''); setMessage('');
        if (newPassword !== confirmPassword) { setError('Passwords do not match'); return; }
        setResetLoading(true);
        try {
            const response = await axios.post(`${API_URL}/api/auth/reset-password`, {
                email, code, new_password: newPassword,
            });
            setMessage(response.data.message || 'Password reset successful.');
            setTimeout(() => navigate('/login'), 1500);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to reset password');
        } finally { setResetLoading(false); }
    };

    return (
        <div style={styles.page}>
            <div style={styles.shell} className="animate-fade-in">
                <section style={styles.brandPanel}>
                    <div style={styles.logoRow}>
                        <BrandLogo size="lg" dark />
                    </div>
                    <h1 style={styles.brandTitle}>Secure Account Recovery</h1>
                    <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                        We will send a one-time recovery code to your registered email. Use it to reset your password in the next step.
                    </p>
                    <div style={styles.featureCard}>
                        <ShieldCheck size={18} color="#ff9900" />
                        <span>JWT-secured account workflow</span>
                    </div>
                    <div style={styles.featureCard}>
                        <KeyRound size={18} color="#ff9900" />
                        <span>Code expires in 10 minutes</span>
                    </div>
                </section>

                <section style={styles.formPanel}>
                    <h2 style={styles.formTitle}>Forgot Password</h2>
                    <p style={{ color: 'var(--clr-text-muted)', fontSize: '0.88rem' }}>
                        Enter your email to receive a 6-digit reset code.
                    </p>

                    {message && <div style={styles.successBox}>{message}</div>}
                    {error && <div style={styles.errorBox}>{error}</div>}
                    {devCode && (
                        <div style={styles.devCodeBox}>
                            Development code: <strong>{devCode}</strong>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} style={styles.form}>
                        <label style={styles.label} htmlFor="email-address">Email address</label>
                        <div style={styles.inputWrap}>
                            <Mail size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--clr-text-muted)' }} />
                            <input id="email-address" name="email" type="email" autoComplete="email" required
                                placeholder="you@company.com" value={email}
                                onChange={(e) => setEmail(e.target.value)} disabled={loading}
                                style={{ ...styles.input, paddingLeft: '40px' }} />
                        </div>
                        <button type="submit" disabled={loading} className="btn btn-primary"
                            style={{ width: '100%', padding: '12px', marginTop: '8px' }}>
                            {loading ? 'Sending...' : 'Send Reset Code'} <ArrowRight size={16} />
                        </button>
                    </form>

                    {showResetForm && (
                        <form onSubmit={handleResetPassword} style={{ ...styles.form, marginTop: '20px', paddingTop: '20px', borderTop: '1px solid var(--clr-border)' }}>
                            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '8px' }}>Enter Code & New Password</h3>

                            <label style={styles.label} htmlFor="reset-code">Reset Code</label>
                            <input id="reset-code" name="code" type="text" autoComplete="one-time-code" required
                                placeholder="6-digit code" value={code} onChange={(e) => setCode(e.target.value)}
                                maxLength={6} disabled={resetLoading} style={{ ...styles.input, letterSpacing: '4px', fontWeight: 700, textAlign: 'center' }} />

                            <label style={styles.label} htmlFor="new-password">New Password</label>
                            <div style={styles.passwordWrap}>
                                <input id="new-password" name="new_password"
                                    type={showNewPassword ? 'text' : 'password'}
                                    autoComplete="new-password" required placeholder="Enter new password"
                                    value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                                    disabled={resetLoading} style={{ ...styles.input, paddingRight: '44px', marginBottom: 0 }} />
                                <button type="button" onClick={() => setShowNewPassword(v => !v)} style={styles.eyeBtn}>
                                    {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>

                            <label style={styles.label} htmlFor="confirm-password">Confirm Password</label>
                            <div style={styles.passwordWrap}>
                                <input id="confirm-password" name="confirm_password"
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    autoComplete="new-password" required placeholder="Re-enter new password"
                                    value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                                    disabled={resetLoading} style={{ ...styles.input, paddingRight: '44px', marginBottom: 0 }} />
                                <button type="button" onClick={() => setShowConfirmPassword(v => !v)} style={styles.eyeBtn}>
                                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>

                            <button type="submit" disabled={resetLoading} className="btn btn-accent"
                                style={{ width: '100%', padding: '12px', marginTop: '8px' }}>
                                {resetLoading ? 'Resetting...' : 'Reset Password'} <ArrowRight size={16} />
                            </button>
                        </form>
                    )}

                    <p style={{ fontSize: '0.85rem', color: 'var(--clr-text-muted)', textAlign: 'center', marginTop: '12px' }}>
                        Remember your password? <Link to="/login" style={{ fontWeight: 700 }}>Back to Login</Link>
                    </p>
                </section>
            </div>
        </div>
    );
};

const styles = {
    page: { minHeight: 'calc(100vh - 60px)', display: 'grid', placeItems: 'center', padding: '24px 16px', background: 'var(--clr-bg)' },
    shell: { display: 'grid', gridTemplateColumns: '0.85fr 1fr', maxWidth: '900px', width: '100%', borderRadius: '20px', overflow: 'hidden', boxShadow: 'var(--shadow-xl)', border: '1px solid var(--clr-border)' },
    brandPanel: { background: 'linear-gradient(160deg, #131921 0%, #1a2332 60%, #232f3e 100%)', color: '#fff', padding: '36px 28px', display: 'flex', flexDirection: 'column', gap: '16px' },
    logoRow: { marginBottom: '4px' },
    brandTitle: { fontSize: '1.4rem', fontWeight: 800, color: '#fff', lineHeight: 1.3 },
    featureCard: { display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '10px 14px', fontSize: '0.85rem', color: 'rgba(255,255,255,0.75)' },
    formPanel: { background: 'var(--clr-surface)', padding: '36px 32px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '12px' },
    formTitle: { fontSize: '1.4rem', fontWeight: 800, marginBottom: '2px' },
    successBox: { background: 'var(--clr-success-bg)', color: 'var(--clr-success)', padding: '10px 14px', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 600 },
    errorBox: { background: 'var(--clr-danger-bg)', color: 'var(--clr-danger)', padding: '10px 14px', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 600 },
    devCodeBox: { background: '#fffbeb', color: '#92400e', border: '1px dashed #f59e0b', padding: '10px 14px', borderRadius: '10px', fontSize: '0.85rem' },
    form: { display: 'flex', flexDirection: 'column', gap: '4px' },
    label: { fontSize: '0.82rem', fontWeight: 600, color: 'var(--clr-text)', marginTop: '8px' },
    inputWrap: { position: 'relative' },
    input: { width: '100%', padding: '11px 14px', borderRadius: '10px', border: '1.5px solid var(--clr-border)', fontFamily: 'inherit', fontSize: '0.9rem', outline: 'none', marginBottom: '2px' },
    passwordWrap: { position: 'relative' },
    eyeBtn: { position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--clr-text-muted)', cursor: 'pointer', padding: 0 },
};

export default ForgetPassword;
