import React, { useEffect, useState } from 'react';
import { ImageOff } from 'lucide-react';

const ProductImage = ({
  src,
  alt,
  height = 180,
  imageStyle = {},
  fallbackLabel = 'Image unavailable',
  timeoutMs = 8000,
}) => {
  const [status, setStatus] = useState(src ? 'loading' : 'error');

  useEffect(() => {
    setStatus(src ? 'loading' : 'error');
    if (!src) return undefined;

    const timer = window.setTimeout(() => {
      setStatus((current) => (current === 'loading' ? 'error' : current));
    }, timeoutMs);

    return () => window.clearTimeout(timer);
  }, [src, timeoutMs]);

  const showFallback = status === 'error';

  return (
    <div style={{ ...styles.frame, height }}>
      {src && !showFallback && (
        <img
          src={src}
          alt={alt || 'Product image'}
          loading="lazy"
          style={{
            ...styles.image,
            opacity: status === 'loaded' ? 1 : 0,
            ...imageStyle,
          }}
          onLoad={() => setStatus('loaded')}
          onError={() => setStatus('error')}
        />
      )}
      {status === 'loading' && <div className="skeleton" style={styles.skeleton} />}
      {showFallback && (
        <div style={styles.fallback} aria-label={fallbackLabel}>
          <ImageOff size={26} />
          <span>{fallbackLabel}</span>
        </div>
      )}
    </div>
  );
};

const styles = {
  frame: {
    position: 'relative',
    width: '100%',
    background: '#f8f9fa',
    borderRadius: '12px',
    display: 'grid',
    placeItems: 'center',
    overflow: 'hidden',
  },
  image: {
    maxWidth: '100%',
    maxHeight: '100%',
    objectFit: 'contain',
    transition: 'opacity 0.25s ease',
  },
  skeleton: {
    position: 'absolute',
    inset: 0,
    animation: 'pulse 1.5s infinite',
  },
  fallback: {
    height: '100%',
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    color: 'var(--clr-text-muted)',
    background: 'linear-gradient(135deg, #f6f8fd 0%, #f1f4f9 100%)',
    fontSize: '0.78rem',
    fontWeight: 600,
    textAlign: 'center',
    padding: '12px',
  },
};

export default ProductImage;
