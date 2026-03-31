import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ArrowRight, SkipForward } from 'lucide-react';
import BrandLogo from '../components/BrandLogo';
import api from '../lib/api';

const CATEGORIES = [
  { name: 'Electronics', emoji: '🔌' },
  { name: 'Computers', emoji: '💻' },
  { name: 'Accessories', emoji: '🎧' },
  { name: 'Home', emoji: '🏠' },
  { name: 'Kitchen', emoji: '🍳' },
  { name: 'Fashion', emoji: '👗' },
  { name: 'Fitness', emoji: '💪' },
  { name: 'Books', emoji: '📚' },
];

const Onboarding = () => {
  const navigate = useNavigate();
  const [selected, setSelected] = useState([]);
  const [priceRange, setPriceRange] = useState('any');
  const [saving, setSaving] = useState(false);
  const token = localStorage.getItem('token');

  const canContinue = useMemo(() => selected.length > 0 && !saving, [selected, saving]);

  const toggleCategory = (category) => {
    setSelected(prev =>
      prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]
    );
  };

  const handleContinue = async () => {
    if (!token) return navigate('/login');
    setSaving(true);
    try {
      await api.put('/preferences', { categories: selected, price_range: priceRange });
      navigate('/dashboard');
    } catch (err) {
      navigate('/dashboard');
    } finally { setSaving(false); }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card} className="animate-fade-in">
        <div style={styles.brandBanner}>
          <BrandLogo size="md" />
        </div>
        <div style={styles.header}>
          <Sparkles size={24} color="var(--clr-primary)" />
          <div>
            <h1 style={styles.title}>Tune Your Feed</h1>
            <p style={styles.subtitle}>
              Pick your interests and budget so we can personalize ranking from your first session.
            </p>
          </div>
        </div>

        {/* Category Grid */}
        <h3 style={styles.sectionTitle}>Preferred Categories</h3>
        <div style={styles.categoryGrid}>
          {CATEGORIES.map(c => (
            <button
              key={c.name}
              onClick={() => toggleCategory(c.name)}
              style={{
                ...styles.categoryChip,
                ...(selected.includes(c.name) ? styles.categoryChipActive : {}),
              }}
            >
              <span style={{ fontSize: '1.3rem' }}>{c.emoji}</span>
              <span style={{ fontWeight: 600 }}>{c.name}</span>
            </button>
          ))}
        </div>

        {/* Budget */}
        <h3 style={{ ...styles.sectionTitle, marginTop: '24px' }}>Budget Preference</h3>
        <div style={styles.priceRow}>
          {[
            { value: 'any', label: 'Any Budget', emoji: '💰' },
            { value: 'budget', label: 'Budget', emoji: '🪙' },
            { value: 'mid', label: 'Mid-range', emoji: '💵' },
            { value: 'premium', label: 'Premium', emoji: '💎' },
          ].map(opt => (
            <button key={opt.value}
              onClick={() => setPriceRange(opt.value)}
              style={{
                ...styles.priceChip,
                ...(priceRange === opt.value ? styles.priceChipActive : {}),
              }}>
              <span>{opt.emoji}</span>
              <span>{opt.label}</span>
            </button>
          ))}
        </div>

        {/* Actions */}
        <div style={styles.actionRow}>
          <button onClick={handleContinue} disabled={!canContinue}
            className="btn btn-primary"
            style={{ padding: '14px 28px', fontSize: '0.95rem', opacity: canContinue ? 1 : 0.5 }}>
            {saving ? 'Saving...' : 'Continue to Dashboard'} <ArrowRight size={16} />
          </button>
          <button onClick={() => navigate('/dashboard')} className="btn btn-secondary"
            style={{ padding: '14px 24px', fontSize: '0.9rem' }}>
            <SkipForward size={15} /> Skip for now
          </button>
        </div>

        <p style={styles.hint}>
          Select at least one category to get started. You can change these anytime.
        </p>
      </div>
    </div>
  );
};

const styles = {
  page: {
    minHeight: 'calc(100vh - 60px)', display: 'grid', placeItems: 'center',
    padding: '24px 16px', background: 'var(--clr-bg)',
  },
  card: {
    maxWidth: '700px', width: '100%',
    background: 'var(--clr-surface)', borderRadius: '20px',
    boxShadow: 'var(--shadow-xl)', border: '1px solid var(--clr-border)',
    padding: '40px 36px',
  },
  brandBanner: {
    marginBottom: '20px',
    paddingBottom: '18px',
    borderBottom: '1px solid var(--clr-border-light)',
  },
  header: {
    display: 'flex', gap: '14px', alignItems: 'flex-start', marginBottom: '24px',
  },
  title: { fontSize: '1.6rem', fontWeight: 800, marginBottom: '4px', lineHeight: 1.2 },
  subtitle: { color: 'var(--clr-text-muted)', fontSize: '0.92rem', lineHeight: 1.5, maxWidth: '500px' },
  sectionTitle: { fontSize: '0.95rem', fontWeight: 700, marginBottom: '12px' },
  categoryGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '10px',
  },
  categoryChip: {
    display: 'flex', alignItems: 'center', gap: '8px',
    padding: '12px 14px', borderRadius: '12px',
    border: '1.5px solid var(--clr-border)', background: 'var(--clr-surface)',
    cursor: 'pointer', transition: 'all 200ms', fontSize: '0.88rem',
  },
  categoryChipActive: {
    borderColor: 'var(--clr-accent)', background: 'rgba(20,110,180,0.06)',
    boxShadow: '0 0 0 2px rgba(20,110,180,0.15)',
  },
  priceRow: { display: 'flex', gap: '10px', flexWrap: 'wrap' },
  priceChip: {
    display: 'flex', alignItems: 'center', gap: '6px',
    padding: '10px 16px', borderRadius: '10px',
    border: '1.5px solid var(--clr-border)', background: 'var(--clr-surface)',
    cursor: 'pointer', transition: 'all 200ms', fontSize: '0.85rem', fontWeight: 600,
  },
  priceChipActive: {
    borderColor: 'var(--clr-primary)', background: 'rgba(255,153,0,0.06)',
    boxShadow: '0 0 0 2px rgba(255,153,0,0.15)',
  },
  actionRow: { display: 'flex', gap: '12px', marginTop: '28px' },
  hint: { fontSize: '0.78rem', color: 'var(--clr-text-light)', marginTop: '12px' },
};

export default Onboarding;
