import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  AppBar,
  Box,
  Button,
  Container,
  Stack,
  Toolbar,
  Typography,
} from '@mui/material'
import MovieFilterIcon from '@mui/icons-material/MovieFilter'

const navItems = [
  { label: 'Home', path: '/' },
  { label: 'Upload', path: '/upload' },
]

export default function Layout() {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="sticky" color="transparent" elevation={0} sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Toolbar>
          <MovieFilterIcon color="primary" sx={{ mr: 1 }} />
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 700 }}>
            MangaMotion AI
          </Typography>
          <Stack direction="row" spacing={1}>
            {navItems.map((item) => (
              <Button
                key={item.path}
                color={location.pathname === item.path ? 'primary' : 'inherit'}
                onClick={() => navigate(item.path)}
              >
                {item.label}
              </Button>
            ))}
          </Stack>
        </Toolbar>
      </AppBar>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Outlet />
      </Container>
    </Box>
  )
}
