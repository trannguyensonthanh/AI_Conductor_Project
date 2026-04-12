import { Outlet } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';
import { AppHeader } from './AppHeader';
import { CustomCursor } from '@/components/ui/CustomCursor';

export function AppLayout() {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-background grid-bg">
      <CustomCursor />
      <AppSidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <AppHeader />
        <main className="flex-1 overflow-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
