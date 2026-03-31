import React from 'react';

const LOGO_SRC = '/amazon-brand-logo.webp';

const SIZE_MAP = {
  sm: { frameWidth: 62, frameHeight: 34, imageWidth: 50, titleSize: '1rem', subtitleSize: '0.58rem', gap: 10 },
  md: { frameWidth: 82, frameHeight: 44, imageWidth: 66, titleSize: '1.18rem', subtitleSize: '0.62rem', gap: 12 },
  lg: { frameWidth: 108, frameHeight: 58, imageWidth: 88, titleSize: '1.35rem', subtitleSize: '0.68rem', gap: 14 },
};

const BrandLogo = ({ size = 'md', showWordmark = true, dark = false, align = 'left' }) => {
  const sizeStyles = SIZE_MAP[size] || SIZE_MAP.md;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: align === 'center' ? 'center' : 'flex-start',
        gap: sizeStyles.gap,
      }}
    >
      <div
        style={{
          width: sizeStyles.frameWidth,
          height: sizeStyles.frameHeight,
          borderRadius: 14,
          display: 'grid',
          placeItems: 'center',
          background: dark ? 'rgba(255,255,255,0.06)' : '#131921',
          border: dark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(19,25,33,0.08)',
          boxShadow: dark ? '0 12px 28px rgba(0,0,0,0.18)' : '0 10px 24px rgba(19,25,33,0.12)',
        }}
      >
        <img
          src={LOGO_SRC}
          alt="Amazon"
          style={{
            width: sizeStyles.imageWidth,
            height: 'auto',
            objectFit: 'contain',
            display: 'block',
          }}
        />
      </div>
      {showWordmark && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span
            style={{
              fontSize: sizeStyles.titleSize,
              fontWeight: 800,
              letterSpacing: '-0.03em',
              color: dark ? '#ffffff' : 'var(--clr-text)',
              lineHeight: 1,
            }}
          >
            AmazonRecs
          </span>
          <span
            style={{
              fontSize: sizeStyles.subtitleSize,
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: dark ? 'rgba(255,255,255,0.58)' : 'var(--clr-text-muted)',
              lineHeight: 1.1,
            }}
          >
            Recommender Studio
          </span>
        </div>
      )}
    </div>
  );
};

export default BrandLogo;
