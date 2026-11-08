import { RouterProvider } from '@tanstack/react-router';
import { AppProviders } from './providers/AppProviders';
import { router } from './router/router';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import './styles/index.css';

export function App() {
  return (
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  );
}
