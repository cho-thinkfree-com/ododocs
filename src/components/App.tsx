import { CssBaseline, ThemeProvider, createTheme } from '@mui/material'
import AuthLanding from './auth/AuthLanding'
import WorkspaceDashboard from './workspace/WorkspaceDashboard'
import { AuthProvider, useAuth } from '../context/AuthContext'

const theme = createTheme()

const App = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  )
}

const AppContent = () => {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? <WorkspaceDashboard /> : <AuthLanding />
}

export default App

