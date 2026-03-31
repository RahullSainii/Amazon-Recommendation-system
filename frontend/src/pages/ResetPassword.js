import React, { useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { Eye, EyeOff, KeyRound, CheckCircle2, ArrowRight, Mail } from 'lucide-react';
import BrandLogo from '../components/BrandLogo';
import API_URL from '../lib/apiBase';

const ResetPassword = () => {
    const [email, setEmail] = useState('');
    const [code, setCode] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const checks = useMemo(() => ({
        length: newPassword.length >= 6,
        number: /\d/.test(newPassword),
        match: newPassword.length > 0 && newPassword === confirmPassword,
    }), [newPassword, confirmPassword]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true); setError(''); setMessage('');
        if (newPassword !== confirmPassword) { setError('Passwords do not match'); setLoading(false); return; }
        try {
            const response = await axios.post(`${API_URL}/api/auth/reset-password`, {
                email, code, new_password: newPassword,
            });
            setMessage(response.data.message || 'Password reset successful. Redirecting to login...');
            setTimeout(() => navigate('/login'), 1800);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to reset password');
        } finally { setLoading(false); }
    };

    return (
        <div style={styles.page}>
            <div style={styles.shell} className="animate-fade-in">
                <section style={styles.brandPanel}>
                    <div style={styles.logoRow}>
                        <BrandLogo size="lg" dark />
                    </div>
                    <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff', lineHeight: 1.3 }}>
                        Reset Your Password
                    </h1>
                    <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                        Use the reset code from your email to create a new password and regain secure access.
                    </p>

                    <div style={styles.pwGuide}>
                        <h4 style={{ fontSize: '0.88rem', fontWeight: 700, marginBottom: '10px' }}>Password Checklist</h4>
                        {[
                            { label: 'At least 6 characters', ok: checks.length },
                            { label: 'Contains a number', ok: checks.number },
                            { label: 'Passwords match', ok: checks.match },
                        ].map(item => (
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

                <section style={styles.formPanel}>
                    <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '2px' }}>Reset Password</h2>
                    <p style={{ color: 'var(--clr-text-muted)', fontSize: '0.88rem' }}>
                        Enter your email, recovery code, and a new password.
                    </p>

                    {message && <div style={styles.successBox}>{message}</div>}
                    {error && <div style={styles.errorBox}>{error}</div>}

                    <form onSubmit={handleSubmit} style={styles.form}>
                        <label style={styles.label} htmlFor="email-address">Email address</label>
                        <div style={{ position: 'relative' }}>
                            <Mail size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--clr-text-muted)' }} />
                            <input id="email-address" name="email" type="email" autoComplete="email" required
                                placeholder="you@company.com" value={email}
                                onChange={(e) => setEmail(e.target.value)} disabled={loading}
                                style={{ ...styles.input, paddingLeft: '40px' }} />
                        </div>

                        <label style={styles.label} htmlFor="reset-code">Reset Code</label>
                        <div style={{ position: 'relative' }}>
                            <KeyRound size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--clr-text-muted)' }} />
                            <input id="reset-code" name="code" type="text" autoComplete="one-time-code" required
                                placeholder="6-digit code" value={code}
                                onChange={(e) => setCode(e.target.value)} disabled={loading} maxLength={6}
                                style={{ ...styles.input, paddingLeft: '40px', letterSpacing: '4px', fontWeight: 700, textAlign: 'center' }} />
                        </div>

                        <label style={styles.label} htmlFor="new-password">New Password</label>
                        <div style={styles.passwordWrap}>
                            <input id="new-password" name="new_password"
                                type={showNewPassword ? 'text' : 'password'}
                                autoComplete="new-password" required placeholder="Create new password"
                                value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                                disabled={loading} style={{ ...styles.input, paddingRight: '44px', marginBottom: 0 }} />
                            <button type="button" onClick={() => setShowNewPassword(v => !v)} style={styles.eyeBtn}>
                                {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>

                        <label style={styles.label} htmlFor="confirm-password">Confirm Password</label>
                        <div style={styles.passwordWrap}>
                            <input id="confirm-password" name="confirm_password"
                                type={showConfirmPassword ? 'text' : 'password'}
                                autoComplete="new-password" required placeholder="Confirm new password"
                                value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                                disabled={loading} style={{ ...styles.input, paddingRight: '44px', marginBottom: 0 }} />
                            <button type="button" onClick={() => setShowConfirmPassword(v => !v)} style={styles.eyeBtn}>
                                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>

                        <button type="submit" disabled={loading} className="btn btn-primary"
                            style={{ width: '100%', padding: '12px', marginTop: '12px' }}>
                            {loading ? 'Resetting...' : 'Reset Password'} <ArrowRight size={16} />
                        </button>
                    </form>

                    <p style={{ fontSize: '0.85rem', color: 'var(--clr-text-muted)', textAlign: 'center', marginTop: '12px' }}>
                        Remembered it? <Link to="/login" style={{ fontWeight: 700 }}>Back to Login</Link>
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
    pwGuide: { marginTop: 'auto', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '16px' },
    checkItem: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', marginBottom: '6px', transition: 'color 200ms' },
    formPanel: { background: 'var(--clr-surface)', padding: '36px 32px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '12px' },
    successBox: { background: 'var(--clr-success-bg)', color: 'var(--clr-success)', padding: '10px 14px', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 600 },
    errorBox: { background: 'var(--clr-danger-bg)', color: 'var(--clr-danger)', padding: '10px 14px', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 600 },
    form: { display: 'flex', flexDirection: 'column', gap: '4px' },
    label: { fontSize: '0.82rem', fontWeight: 600, color: 'var(--clr-text)', marginTop: '8px' },
    input: { width: '100%', padding: '11px 14px', borderRadius: '10px', border: '1.5px solid var(--clr-border)', fontFamily: 'inherit', fontSize: '0.9rem', outline: 'none', marginBottom: '2px' },
    passwordWrap: { position: 'relative' },
    eyeBtn: { position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--clr-text-muted)', cursor: 'pointer', padding: 0 },
};

export default ResetPassword;
