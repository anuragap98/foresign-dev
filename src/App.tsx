import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect } from 'react'
import { createHashRouter, Navigate, RouterProvider } from 'react-router'
import { Boot } from '@/app/Boot'
import { AppShell } from '@/components/shell/AppShell'
import { HomePage } from '@/pages/home/HomePage'
import { applyLook, useLook } from '@/store/look'

const router = createHashRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="/home" replace /> },
      { path: 'home', element: <HomePage /> },
      { path: 'tasks/:taskId?', lazy: () => import('@/pages/tasks/TasksPage').then((m) => ({ Component: m.TasksPage })) },
      { path: 'calendar/:eventId?', lazy: () => import('@/pages/calendar/CalendarPage').then((m) => ({ Component: m.CalendarPage })) },
      { path: 'projects', lazy: () => import('@/pages/projects/ProjectsPage').then((m) => ({ Component: m.ProjectsPage })) },
      {
        path: 'projects/:projectId',
        lazy: () => import('@/pages/projects/ProjectDetailPage').then((m) => ({ Component: m.ProjectDetailPage })),
      },
      { path: 'insights', lazy: () => import('@/pages/insights/InsightsPage').then((m) => ({ Component: m.InsightsPage })) },
      { path: 'team/:personId?', lazy: () => import('@/pages/team/TeamPage').then((m) => ({ Component: m.TeamPage })) },
      { path: 'settings', lazy: () => import('@/pages/settings/SettingsPage').then((m) => ({ Component: m.SettingsPage })) },
      { path: '*', element: <Navigate to="/home" replace /> },
    ],
  },
])

/** Mirrors the look store onto <html>, and follows the OS when the theme is "auto". */
function useLookSync() {
  useEffect(() => {
    const unsub = useLook.subscribe((look) => applyLook(look, true))
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onSystem = () => useLook.getState().theme === 'auto' && applyLook(useLook.getState(), true)
    mq.addEventListener('change', onSystem)
    return () => {
      unsub()
      mq.removeEventListener('change', onSystem)
    }
  }, [])
}

const queryClient = new QueryClient({ defaultOptions: { queries: { refetchOnWindowFocus: true, retry: 2 } } })

export default function App() {
  useLookSync()
  return (
    <QueryClientProvider client={queryClient}>
      <Boot>
        <RouterProvider router={router} />
      </Boot>
    </QueryClientProvider>
  )
}
