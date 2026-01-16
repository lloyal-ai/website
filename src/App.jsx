import { RouterProvider, Outlet } from '@tanstack/react-router';
import { router } from './router';
import './index.css';

function App() {
  return <RouterProvider router={router} />;
}

export default App;
