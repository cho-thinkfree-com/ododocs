import {
  Alert,
  Box,
  Button,
  Card,
  Divider,
  Stack,
  TextField,
  Typography,
  useTheme,
} from '@mui/material'
import { useMemo, useState, type ChangeEvent, type FormEvent } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useI18n } from '../../lib/i18n'

const AuthLanding = () => {
  const theme = useTheme()
  const { login, signup } = useAuth()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [form, setForm] = useState({ email: '', password: '', legalName: '' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { strings } = useI18n()
  const landing = strings.auth.landing

  const handleModeSwitch = (nextMode: 'login' | 'signup') => {
    setMode(nextMode)
    setError(null)
  }

  const handleChange =
    (field: 'email' | 'password' | 'legalName') => (event: ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }))
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      if (mode === 'login') {
        await login({ email: form.email, password: form.password })
      } else {
        await signup({ email: form.email, password: form.password, legalName: form.legalName })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: `linear-gradient(135deg, ${theme.palette.primary.light} 0%, ${theme.palette.background.default} 60%)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        py: 6,
        px: 2,
      }}
    >
      <Box
        sx={{
          width: '100%',
          maxWidth: 1200,
          borderRadius: 3,
          overflow: 'hidden',
          boxShadow: theme.shadows[8],
          backgroundColor: theme.palette.background.paper,
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 0.95fr' },
        }}
      >
        <Box
          sx={{
            px: { xs: 4, md: 6 },
            py: { xs: 4, md: 6 },
            backgroundColor: theme.palette.grey[50],
            display: 'flex',
            flexDirection: 'column',
            gap: 3,
          }}
        >
          <Typography variant='h3' component='h1'>
            {landing.heroTitle}
          </Typography>
          <Typography variant='body1' sx={{ color: theme.palette.text.secondary }}>
            {landing.heroDescription}
          </Typography>
          <Typography variant='subtitle1'>{landing.featureIntro}</Typography>
          <Stack spacing={1}>
            {landing.features.map((feature) => (
              <Typography key={feature} variant='body2' sx={{ display: 'flex', gap: 1 }}>
                <Typography component='span' color='primary.main' fontWeight={600}>
                  •
                </Typography>
                {feature}
              </Typography>
            ))}
          </Stack>
          <Divider />
          <Stack direction='row' spacing={1} flexWrap='wrap'>
            <Button
              variant={mode === 'login' ? 'contained' : 'text'}
              onClick={() => handleModeSwitch('login')}
            >
              {landing.loginLabel}
            </Button>
            <Button
              variant={mode === 'signup' ? 'contained' : 'text'}
              onClick={() => handleModeSwitch('signup')}
            >
              {landing.signupLabel}
            </Button>
          </Stack>
        </Box>
        <Card
          variant='outlined'
          square
          sx={{
            borderLeft: { xs: 'none', md: `1px solid ${theme.palette.divider}` },
            borderRadius: 0,
            px: { xs: 4, md: 6 },
            py: { xs: 6, md: 8 },
            display: 'flex',
            flexDirection: 'column',
            gap: 2.5,
          }}
        >
          <Typography variant='h5'>{mode === 'login' ? landing.loginTitle : landing.signupTitle}</Typography>
          <Typography variant='body2' color='text.secondary'>
            {landing.heroDescription}
          </Typography>
          {error && <Alert severity='error'>{error}</Alert>}
          <Box component='form' onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label={landing.emailLabel}
              type='email'
              value={form.email}
              onChange={handleChange('email')}
              required
              fullWidth
            />
            <TextField
              label={landing.passwordLabel}
              type='password'
              value={form.password}
              onChange={handleChange('password')}
              helperText={landing.passwordHint}
              required
              fullWidth
            />
            {mode === 'signup' && (
              <TextField
                label={landing.legalNameLabel}
                value={form.legalName}
                onChange={handleChange('legalName')}
                fullWidth
              />
            )}
            <Button type='submit' variant='contained' size='large' disabled={submitting} fullWidth>
              {mode === 'login' ? landing.loginButton : landing.signupButton}
            </Button>
          </Box>
        </Card>
      </Box>
    </Box>
  )
}

export default AuthLanding
