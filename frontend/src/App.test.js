import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import axios from 'axios';
import App from './App';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import SearchBar from './components/SearchBar';
import { useAuth } from './context/AuthContext';
import { useShop } from './context/ShopContext';

jest.mock('axios', () => {
  const mockAxios = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    create: jest.fn(function () {
      return this;
    }),
    interceptors: {
      request: { use: jest.fn(), eject: jest.fn() },
      response: { use: jest.fn(), eject: jest.fn() },
    },
  };
  return mockAxios;
});
// Mock contexts
jest.mock('./context/AuthContext', () => ({
  useAuth: jest.fn(),
  AuthProvider: ({ children }) => <div>{children}</div>,
}));

jest.mock('./context/ShopContext', () => ({
  useShop: jest.fn(),
  ShopProvider: ({ children }) => <div>{children}</div>,
}));

const mockProducts = [
  {
    product_id: '1',
    product_name: 'Test Product 1',
    discounted_price: '$10',
    img_link: 'http://test1.jpg',
    category: 'Electronics'
  },
  {
    product_id: '2',
    product_name: 'Test Product 2',
    discounted_price: '$20',
    img_link: 'http://test2.jpg',
    category: 'Books'
  }
];

const mockRecommendations = [
  {
    product_id: '3',
    product_name: 'Rec Product 1',
    discounted_price: '$15',
    img_link: 'http://rec1.jpg',
    rec_strategy: 'popularity_baseline'
  }
];

describe('Frontend App Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuth.mockReturnValue({
      user: null,
      loading: false,
      login: jest.fn(),
      logout: jest.fn(),
    });
    useShop.mockReturnValue({
      cart: { count: 0, items: [] },
      wishlist: { count: 0, items: [] },
      addToCart: jest.fn(),
      toggleWishlist: jest.fn(),
    });
  });

  // 1. Product loading test
  test('1. Home renders and displays product cards', async () => {
    axios.get.mockResolvedValueOnce({ data: mockProducts });

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );

    // Initial loading state
    expect(screen.getByText(/Loading products.../i)).toBeInTheDocument();

    // Wait for products to load and be displayed
    await waitFor(() => {
      expect(screen.getByText('Test Product 1')).toBeInTheDocument();
      expect(screen.getByText('Test Product 2')).toBeInTheDocument();
    });
  });

  // 2. Search/filter test
  test('2. SearchBar renders and accepts input', async () => {
    const mockOnSearch = jest.fn();
    render(<SearchBar onSearch={mockOnSearch} />);
    
    const input = screen.getByPlaceholderText(/Search products by name.../i);
    expect(input).toBeInTheDocument();
    
    await userEvent.type(input, 'phone');
    expect(input.value).toBe('phone');
    
    // Check if onSearch was called
    expect(mockOnSearch).toHaveBeenCalled();
  });

  // 3. Login redirect test
  test('3. Unauthenticated users are redirected from /dashboard to /login', async () => {
    // Set initial URL to /dashboard before rendering App (which uses BrowserRouter)
    window.history.pushState({}, 'Test page', '/dashboard');

    render(<App />);

    // Since user is null (from useAuth mock), PrivateRoute should redirect to /login
    // We can verify this by checking for elements specific to the Login page
    await waitFor(() => {
      // Look for the "Sign In" heading or email input from Login page
      expect(screen.getByRole('button', { name: /Sign In/i })).toBeInTheDocument();
    });
  });

  // 4. Cart add test
  test('4. Add to cart button exists on product cards', async () => {
    axios.get.mockResolvedValueOnce({ data: mockProducts });
    const mockAddToCart = jest.fn();
    useShop.mockReturnValue({
      cart: { count: 0 },
      wishlist: { count: 0 },
      addToCart: mockAddToCart,
      toggleWishlist: jest.fn(),
    });

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Test Product 1')).toBeInTheDocument();
    });

    const addButtons = screen.getAllByText(/Add to Cart/i);
    expect(addButtons.length).toBeGreaterThan(0);
  });

  // 5. Dashboard recommendations test
  test('5. Dashboard renders recommendation cards for authenticated user', async () => {
    useAuth.mockReturnValue({
      user: { username: 'TestUser', id: 'user1' },
      loading: false,
    });
    
    // Mock the multiple axios calls in Dashboard
    axios.get.mockImplementation((url) => {
      if (url.includes('/recommendations')) {
        return Promise.resolve({ data: mockRecommendations });
      }
      if (url.includes('/products')) {
        return Promise.resolve({ data: mockProducts });
      }
      if (url.includes('/ml/metrics')) {
        return Promise.resolve({ data: { n_items: 100 } });
      }
      if (url.includes('/analytics/summary')) {
        return Promise.resolve({ data: { totals: { impressions: 50 } } });
      }
      return Promise.reject(new Error('not found'));
    });

    localStorage.setItem('token', 'fake-token');

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    // Initial loading state
    expect(screen.getByText(/Loading your personalized dashboard.../i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Rec Product 1')).toBeInTheDocument();
      expect(screen.getByText('TestUser')).toBeInTheDocument();
    });
  });
});
