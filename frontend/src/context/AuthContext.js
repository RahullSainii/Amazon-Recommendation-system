import React, { createContext, useState, useContext, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import { clearSession, getStoredUser, getToken, setSession } from '../lib/storage';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = getToken();
        const savedUser = getStoredUser();
        if (token) {
            try {
                const decoded = jwtDecode(token);
                if (decoded.exp * 1000 > Date.now()) {
                    if (savedUser) {
                        setUser(savedUser);
                    } else {
                        setUser({ id: decoded.user_id, role: decoded.role });
                    }
                } else {
                    clearSession();
                }
            } catch (error) {
                clearSession();
            }
        }
        setLoading(false);
    }, []);

    const login = (token, userData) => {
        setSession(token, userData);
        setUser(userData);
    };

    const logout = () => {
        clearSession();
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
