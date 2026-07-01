import { useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Stack,
  Typography,
} from '@mui/material'
import DownloadIcon from '@mui/icons-material/Download'
import { useParams } from 'react-router-dom'
import { getProject, type Project } from '../api/client'

export default function PreviewPage() {
  const { projectId } = useParams()
  const [project, setProject] = useState<Project | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!projectId) return

    getProject(projectId)
      .then(setProject)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load preview'))
  }, [projectId])

  if (!projectId) {
    return <Alert severity="error">Missing project ID</Alert>
  }

  return (
    <Stack spacing={3} sx={{ maxWidth: 960 }}>
      <Box>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 700 }}>
          Video preview
        </Typography>
        <Typography color="text.secondary">
          Preview the merged animation timeline and download the final MP4.
        </Typography>
      </Box>

      {error && <Alert severity="error">{error}</Alert>}

      <Card>
        <CardContent>
          <Stack spacing={3}>
            <Box
              sx={{
                aspectRatio: '16 / 9',
                borderRadius: 2,
                bgcolor: 'black',
                display: 'grid',
                placeItems: 'center',
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Typography color="text.secondary">
                Video player — available after Phase 6 (FFmpeg merge)
              </Typography>
            </Box>

            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              sx={{ justifyContent: 'space-between' }}
              spacing={2}
            >
              <Box>
                <Typography variant="h6">{project?.title ?? 'Loading...'}</Typography>
                <Typography color="text.secondary">
                  Timeline editor and MP4 export coming in Phase 6
                </Typography>
              </Box>
              <Button variant="contained" startIcon={<DownloadIcon />} disabled>
                Download MP4
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  )
}
