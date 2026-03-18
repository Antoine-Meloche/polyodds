import { QueryClientProvider } from '@tanstack/react-query';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import queryClient from '@/api/queryClient';
import { Layout } from '@/components/layout/Layout';
import { AuthGuard } from '@/components/shared/AuthGuard';

// Pages
import { HomePage } from '@/pages/HomePage';
import { MarketsPage } from '@/pages/MarketsPage';
import { MarketDetailPage } from '@/pages/MarketDetailPage';
import { CreateMarketPage } from '@/pages/CreateMarketPage';
import { CommunitiesPage } from '@/pages/CommunitiesPage';
import { CommunityDetailPage } from '@/pages/CommunityDetailPage';
import { CreateCommunityPage } from '@/pages/CreateCommunityPage';
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
        element: <HomePage />,
      },
      {
        path: 'markets',
        element: <MarketsPage />,
      },
      {
        path: 'markets/:id',
        element: <MarketDetailPage />,
      },
      {
        path: 'markets/create',
        element: (
          <AuthGuard>
            <CreateMarketPage />
          </AuthGuard>
        ),
      },
      {
        path: 'communities',
        element: <CommunitiesPage />,
      },
      {
        path: 'communities/:id',
        element: <CommunityDetailPage />,
      },
      {
        path: 'communities/create',
        element: (
          <AuthGuard>
            <CreateCommunityPage />
          </AuthGuard>
        ),
      },
      {
        path: 'profile/:username',
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

