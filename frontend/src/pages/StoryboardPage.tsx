import { useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import TextSnippetIcon from '@mui/icons-material/TextSnippet'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import { useNavigate, useParams } from 'react-router-dom'
import { getPanels, getProject, type Panel, type Project } from '../api/client'

export default function StoryboardPage() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const [project, setProject] = useState<Project | null>(null)
  const [panels, setPanels] = useState<Panel[]>([])
  const [prompts, setPrompts] = useState<Record<string, string>>({})
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
        const initial: Record<string, string> = {}
        panelData.forEach((p) => {
          initial[p.id] = p.cinematicPrompt ?? ''
        })
        setPrompts(initial)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load storyboard')
      }
    }
    load()
  }, [projectId])

  function handlePromptChange(panelId: string, value: string) {
    setPrompts((prev) => ({ ...prev, [panelId]: value }))
  }

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
            Review OCR text and cinematic prompts. Edit prompts before generating videos.
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
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Stack spacing={2}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Typography sx={{ fontWeight: 700 }}>
                      Page {panel.pageNumber} — Panel {panel.panelNumber}
                    </Typography>
                    <Chip
                      label={`#${panel.sortOrder + 1}`}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  </Stack>

                  {/* Panel image */}
                  <Box
                    component="img"
                    src={panel.imageUrl}
                    alt={`Page ${panel.pageNumber} Panel ${panel.panelNumber}`}
                    sx={{
                      width: '100%',
                      maxHeight: 200,
                      objectFit: 'contain',
                      borderRadius: 1,
                      bgcolor: 'background.default',
                      border: '1px solid',
                      borderColor: 'divider',
                    }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none'
                    }}
                  />

                  {/* OCR text */}
                  {panel.ocrText && (
                    <Box
                      sx={{
                        p: 1.5,
                        bgcolor: 'background.default',
                        borderRadius: 1,
                        border: '1px solid',
                        borderColor: 'divider',
                      }}
                    >
                      <Stack direction="row" spacing={0.5} alignItems="center" mb={0.5}>
                        <TextSnippetIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                        <Typography variant="caption" color="text.secondary">
                          OCR Text
                        </Typography>
                      </Stack>
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', fontSize: 12 }}>
                        {panel.ocrText}
                      </Typography>
                    </Box>
                  )}

                  {/* Cinematic prompt */}
                  <Box>
                    <Stack direction="row" spacing={0.5} alignItems="center" mb={0.5}>
                      <AutoAwesomeIcon sx={{ fontSize: 14, color: 'primary.main' }} />
                      <Typography variant="caption" color="text.secondary">
                        Cinematic Prompt
                      </Typography>
                    </Stack>
                    <TextField
                      multiline
                      minRows={3}
                      value={prompts[panel.id] ?? ''}
                      onChange={(e) => handlePromptChange(panel.id, e.target.value)}
                      placeholder="No prompt yet — will be generated during processing"
                      fullWidth
                      size="small"
                    />
                  </Box>

                  <Stack direction="row" spacing={1}>
                    <Tooltip title="Video generation coming in Phase 4">
                      <span>
                        <Button size="small" variant="outlined" disabled>
                          Animate
                        </Button>
                      </span>
                    </Tooltip>
                    <Button size="small" color="error" variant="text">
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
        <Alert severity="info">
          No panels yet. Finish processing to populate the storyboard.
        </Alert>
      )}
    </Stack>
  )
}
