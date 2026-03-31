import React, { useState } from 'react';
import { Search, X } from 'lucide-react';

const SearchBar = ({ onSearch }) => {
    const [query, setQuery] = useState('');

    const handleChange = (e) => {
        const value = e.target.value;
        setQuery(value);
        onSearch(value);
    };

    const handleClear = () => {
        setQuery('');
        onSearch('');
    };

    return (
        <div style={styles.wrapper}>
            <Search size={18} style={styles.icon} />
            <input
                type="text"
                value={query}
                onChange={handleChange}
                placeholder="Search products by name..."
                style={styles.input}
                id="search-bar"
            />
            {query && (
                <button onClick={handleClear} style={styles.clearBtn} aria-label="Clear search">
                    <X size={16} />
                </button>
            )}
        </div>
    );
};

const styles = {
    wrapper: {
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        background: 'var(--clr-surface)',
        border: '2px solid var(--clr-border)',
        borderRadius: '14px',
        transition: 'border-color 200ms, box-shadow 200ms',
        overflow: 'hidden',
    },
    icon: {
        position: 'absolute',
        left: '16px',
        color: 'var(--clr-text-muted)',
        pointerEvents: 'none',
    },
    input: {
        width: '100%',
        padding: '14px 44px 14px 46px',
        border: 'none',
        outline: 'none',
        fontSize: '0.95rem',
        fontFamily: 'inherit',
        background: 'transparent',
        color: 'var(--clr-text)',
    },
    clearBtn: {
        position: 'absolute',
        right: '12px',
        background: 'var(--clr-bg)',
        border: 'none',
        borderRadius: '50%',
        width: '28px',
        height: '28px',
        display: 'grid',
        placeItems: 'center',
        cursor: 'pointer',
        color: 'var(--clr-text-muted)',
        transition: 'background 200ms',
    },
};

export default SearchBar;