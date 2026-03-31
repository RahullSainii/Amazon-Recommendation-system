import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useShop } from '../context/ShopContext';
import { ShoppingCart, User, LogOut, Heart, LayoutDashboard } from 'lucide-react';
import BrandLogo from './BrandLogo';

const Navbar = () => {
    const { user, logout } = useAuth();
    const { cart, wishlist } = useShop();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <nav style={styles.nav}>
            <div style={styles.inner}>
                <Link to="/" style={styles.logo}>
                    <BrandLogo size="sm" dark />
                </Link>

                <div style={styles.navLinks}>
                    <NavLink to="/" label="Home" />
                    {user && <NavLink to="/dashboard" label="Dashboard" icon={<LayoutDashboard size={15} />} />}
                </div>

                <div style={styles.rightSection}>
                    {user ? (
                        <>
                            <span style={styles.greeting}>
                                Hello, <strong>{user.username || 'User'}</strong>
                            </span>

                            <Link to="/wishlist" style={styles.iconBtn} title="Wishlist">
                                <Heart size={20} />
                                {(wishlist?.count > 0) && (
                                    <span style={styles.counterBadge}>{wishlist.count}</span>
                                )}
                            </Link>

                            <Link to="/cart" style={styles.iconBtn} title="Cart">
                                <ShoppingCart size={20} />
                                {(cart?.count > 0) && (
                                    <span style={styles.counterBadge}>{cart.count}</span>
                                )}
                            </Link>

                            <button onClick={handleLogout} style={styles.logoutBtn} title="Logout">
                                <LogOut size={16} />
                                <span>Logout</span>
                            </button>
                        </>
                    ) : (
                        <Link to="/login" style={styles.loginBtn}>
                            <User size={16} />
                            <span>Sign In</span>
                        </Link>
                    )}
                </div>
            </div>
        </nav>
    );
};

const NavLink = ({ to, label, icon }) => (
    <Link to={to} style={styles.navLink}>
        {icon}
        {label}
    </Link>
);

const styles = {
    nav: {
        background: 'linear-gradient(135deg, #131921 0%, #1a2332 100%)',
        color: '#fff',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        boxShadow: '0 2px 20px rgba(0,0,0,0.3)',
        backdropFilter: 'blur(10px)',
    },
    inner: {
        maxWidth: '1280px',
        margin: '0 auto',
        padding: '0 20px',
        height: '60px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '24px',
    },
    logo: {
        display: 'flex',
        alignItems: 'center',
        textDecoration: 'none',
        color: '#fff',
        flexShrink: 0,
    },
    navLinks: {
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        flex: 1,
    },
    navLink: {
        color: 'rgba(255,255,255,0.8)',
        textDecoration: 'none',
        padding: '6px 14px',
        borderRadius: '8px',
        fontSize: '0.88rem',
        fontWeight: 500,
        transition: 'all 200ms',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
    },
    rightSection: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        flexShrink: 0,
    },
    greeting: {
        fontSize: '0.85rem',
        color: 'rgba(255,255,255,0.7)',
        marginRight: '4px',
    },
    iconBtn: {
        position: 'relative',
        color: '#fff',
        textDecoration: 'none',
        width: '38px',
        height: '38px',
        display: 'grid',
        placeItems: 'center',
        borderRadius: '10px',
        transition: 'background 200ms',
    },
    counterBadge: {
        position: 'absolute',
        top: '-2px',
        right: '-4px',
        background: '#ff9900',
        color: '#131921',
        borderRadius: '50%',
        width: '18px',
        height: '18px',
        display: 'grid',
        placeItems: 'center',
        fontSize: '0.7rem',
        fontWeight: 800,
        lineHeight: 1,
    },
    logoutBtn: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        background: 'rgba(255,255,255,0.08)',
        color: 'rgba(255,255,255,0.85)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '8px',
        padding: '6px 14px',
        fontSize: '0.85rem',
        fontWeight: 500,
        cursor: 'pointer',
        transition: 'all 200ms',
    },
    loginBtn: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        background: 'linear-gradient(135deg, #ff9900, #e88800)',
        color: '#131921',
        borderRadius: '8px',
        padding: '8px 18px',
        fontSize: '0.88rem',
        fontWeight: 700,
        textDecoration: 'none',
        transition: 'all 200ms',
    },
};

export default Navbar;
