import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import api from '../lib/api';
import { getToken } from '../lib/storage';

const ShopContext = createContext(null);

export const ShopProvider = ({ children }) => {
  const { user } = useAuth();
  const [cart, setCart] = useState({ items: [], subtotal: 0, count: 0 });
  const [wishlist, setWishlist] = useState({ items: [], count: 0 });

  const token = getToken();

  const refreshCart = useCallback(async () => {
    if (!user || !token) return;
    try {
      const response = await api.get('/cart');
      setCart(response.data);
    } catch (err) {
      // silent
    }
  }, [user, token]);

  const refreshWishlist = useCallback(async () => {
    if (!user || !token) return;
    try {
      const response = await api.get('/wishlist');
      setWishlist(response.data);
    } catch (err) {
      // silent
    }
  }, [user, token]);

  useEffect(() => {
    if (user && token) {
      refreshCart();
      refreshWishlist();
    } else {
      setCart({ items: [], subtotal: 0, count: 0 });
      setWishlist({ items: [], count: 0 });
    }
  }, [user, token, refreshCart, refreshWishlist]);

  const addToCart = async (productId, quantity = 1) => {
    if (!token) throw new Error('Please login first');
    await api.post('/cart', { product_id: productId, quantity });
    await refreshCart();
  };

  const updateCartQuantity = async (productId, quantity) => {
    if (!token) throw new Error('Please login first');
    await api.patch(`/cart/${productId}`, { quantity });
    await refreshCart();
  };

  const removeFromCart = async (productId) => {
    if (!token) throw new Error('Please login first');
    await api.delete(`/cart/${productId}`);
    await refreshCart();
  };

  const toggleWishlist = async (productId) => {
    if (!token) throw new Error('Please login first');
    const response = await api.post('/wishlist/toggle', { product_id: productId });
    await refreshWishlist();
    return response.data;
  };

  const checkout = async ({ address, paymentMethod }) => {
    if (!token) throw new Error('Please login first');
    const response = await api.post('/checkout', { address, payment_method: paymentMethod });
    await refreshCart();
    return response.data;
  };

  return (
    <ShopContext.Provider
      value={{
        cart,
        wishlist,
        refreshCart,
        refreshWishlist,
        addToCart,
        updateCartQuantity,
        removeFromCart,
        toggleWishlist,
        checkout,
      }}
    >
      {children}
    </ShopContext.Provider>
  );
};

export const useShop = () => useContext(ShopContext);
