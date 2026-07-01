import { Box, Button, Card, CardContent, Grid, Stack, Typography } from '@mui/material'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import MovieCreationIcon from '@mui/icons-material/MovieCreation'
import GraphicEqIcon from '@mui/icons-material/GraphicEq'
import { useNavigate } from 'react-router-dom'

const features = [
  {
    icon: <UploadFileIcon fontSize="large" color="primary" />,
    title: 'Chapter Upload',
    description: 'PDF, ZIP, or image folders — upload a full manhwa chapter in one step.',
  },
  {
    icon: <AutoAwesomeIcon fontSize="large" color="primary" />,
    title: 'Smart Panel Detection',
    description: 'Automatically detect every panel, read dialogue, and understand the story.',
  },
  {
    icon: <MovieCreationIcon fontSize="large" color="primary" />,
    title: 'Cinematic Animation',
    description: 'Generate 5–10 second animated clips with Wan 2.2 and open-source models.',
  },
  {
    icon: <GraphicEqIcon fontSize="large" color="primary" />,
    title: 'Voices & Soundtrack',
    description: 'Character voices, sound effects, and mood-based background music.',
  },
]

export default function HomePage() {
  const navigate = useNavigate()

  return (
    <Stack spacing={4}>
      <Box
        sx={{
          p: 4,
          borderRadius: 3,
          background: 'linear-gradient(135deg, rgba(124,77,255,0.25), rgba(255,64,129,0.15))',
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Typography variant="h3" gutterBottom sx={{ fontWeight: 800 }}>
          Transform manhwa into animated videos
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 760, mb: 3 }}>
          MangaMotion AI is an open-source platform that turns manga chapters into cinematic short
          videos using free AI models — runnable locally on a consumer GPU.
        </Typography>
        <Button variant="contained" size="large" onClick={() => navigate('/upload')}>
          Start a project
        </Button>
      </Box>

      <Grid container spacing={3}>
        {features.map((feature) => (
          <Grid key={feature.title} size={{ xs: 12, md: 6 }}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Stack spacing={2}>
                  {feature.icon}
                  <Typography variant="h6">{feature.title}</Typography>
                  <Typography color="text.secondary">{feature.description}</Typography>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Pipeline
          </Typography>
          <Typography color="text.secondary">
            Upload → Detect panels → OCR → Story analysis → Generate prompts → Animate → Voices &
            music → Merge → Download MP4
          </Typography>
        </CardContent>
      </Card>
    </Stack>
  )
}
