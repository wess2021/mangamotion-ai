import { useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import { useNavigate, useParams } from 'react-router-dom'
import { getPanels, getProject, type Panel, type Project } from '../api/client'

export default function StoryboardPage() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const [project, setProject] = useState<Project | null>(null)
  const [panels, setPanels] = useState<Panel[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!projectId) return

    async function load() {
      try {
        const [projectData, panelData] = await Promise.all([
          getProject(projectId!),
          getPanels(projectId!),
        ])
        setProject(projectData)
        setPanels(panelData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load storyboard')
      }
    }

    load()
  }, [projectId])

  if (!projectId) {
    return <Alert severity="error">Missing project ID</Alert>
  }

  return (
    <Stack spacing={3}>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        sx={{ justifyContent: 'space-between' }}
        spacing={2}
      >
        <Box>
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 700 }}>
            Storyboard editor
          </Typography>
          <Typography color="text.secondary">
            Reorder scenes, edit prompts, regenerate or delete panels before export.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<PlayArrowIcon />}
          onClick={() => navigate(`/projects/${projectId}/preview`)}
        >
          Preview video
        </Button>
      </Stack>

      {error && <Alert severity="error">{error}</Alert>}

      <Typography variant="subtitle1" color="text.secondary">
        {project?.title} — {panels.length} panels detected
      </Typography>

      <Grid container spacing={2}>
        {panels.map((panel) => (
          <Grid key={panel.id} size={{ xs: 12, md: 6, lg: 4 }}>
            <Card>
              <CardContent>
                <Stack spacing={2}>
                  <Typography sx={{ fontWeight: 700 }}>
                    Page {panel.pageNumber} — Panel {panel.panelNumber}
                  </Typography>
                  <Box
                    sx={{
                      height: 180,
                      borderRadius: 2,
                      bgcolor: 'background.default',
                      border: '1px dashed',
                      borderColor: 'divider',
                      display: 'grid',
                      placeItems: 'center',
                    }}
                  >
                    <Typography variant="caption" color="text.secondary">
                      Panel preview
                    </Typography>
                  </Box>
                  <TextField
                    label="Cinematic prompt"
                    multiline
                    minRows={3}
                    defaultValue={
                      panel.cinematicPrompt ??
                      'A young swordsman slowly walks through a ruined castle. Camera dolly-in. Wind moves his cape.'
                    }
                    fullWidth
                  />
                  <Stack direction="row" spacing={1}>
                    <Button size="small" variant="outlined">
                      Regenerate
                    </Button>
                    <Button size="small" color="error">
                      Delete
                    </Button>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {panels.length === 0 && !error && (
        <Alert severity="info">No panels yet. Finish processing to populate the storyboard.</Alert>
      )}
    </Stack>
  )
}
