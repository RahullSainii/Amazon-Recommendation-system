import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Navbar from './components/Navbar';

jest.mock('./context/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    loading: false,
    login: jest.fn(),
    logout: jest.fn(),
  }),
}));

jest.mock('./context/ShopContext', () => ({
  useShop: () => ({
    cart: { count: 0 },
    wishlist: { count: 0 },
  }),
}));

test('renders app brand in the navbar', () => {
  render(
    <MemoryRouter>
      <Navbar />
    </MemoryRouter>
  );

  expect(screen.getByText(/amazonrecs/i)).toBeInTheDocument();
});
