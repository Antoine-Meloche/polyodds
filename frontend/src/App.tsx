import { QueryClientProvider } from '@tanstack/react-query';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import queryClient from '@/api/queryClient';
import { Layout } from '@/components/layout/Layout';
import { AuthGuard } from '@/components/shared/AuthGuard';

// Pages
import { MarketsPage } from '@/pages/MarketsPage';
import { MarketDetailPage } from '@/pages/MarketDetailPage';
import { CreateMarketPage } from '@/pages/CreateMarketPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { LeaderboardPage } from '@/pages/LeaderboardPage';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';

const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/register',
    element: <RegisterPage />,
  },
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        path: '',
        element: <MarketsPage />,
      },
      {
        path: 'bets',
        element: <MarketsPage />,
      },
      {
        path: 'bets/:id',
        element: <MarketDetailPage />,
      },
      {
        path: 'bets/create',
        element: (
          <AuthGuard>
            <CreateMarketPage />
          </AuthGuard>
        ),
      },
      {
        path: 'profile/:id',
        element: <ProfilePage />,
      },
      {
        path: 'leaderboard',
        element: <LeaderboardPage />,
      },
    ],
  },
]);

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}



export default App;

