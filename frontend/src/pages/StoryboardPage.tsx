import { useEffect, useState, useCallback } from 'react'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Grid,
  LinearProgress,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import TextSnippetIcon from '@mui/icons-material/TextSnippet'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import MovieIcon from '@mui/icons-material/Movie'
import { useNavigate, useParams } from 'react-router-dom'
import { getPanels, getProject, triggerVideoGeneration, type Panel, type Project } from '../api/client'

function PanelCard({ panel, prompt, onPromptChange }: {
  panel: Panel
  prompt: string
  onPromptChange: (id: string, val: string) => void
}) {
  const [videoError, setVideoError] = useState(false)

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography sx={{ fontWeight: 700 }}>
            Page {panel.pageNumber} — Panel {panel.panelNumber}
          </Typography>
          <Chip label={`#${panel.sortOrder + 1}`} size="small" color="primary" variant="outlined" />
        </Stack>

        {/* Video player if video exists, else show panel image */}
        {panel.videoUrl && !videoError ? (
          <Box
            component="video"
            src={panel.videoUrl}
            controls
            loop
            muted
            autoPlay
            sx={{
              width: '100%',
              maxHeight: 220,
              borderRadius: 1,
              bgcolor: 'black',
              border: '1px solid',
              borderColor: 'primary.main',
            }}
            onError={() => setVideoError(true)}
          />
        ) : (
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
              borderColor: panel.videoUrl ? 'warning.main' : 'divider',
            }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
        )}

        {panel.videoUrl && !videoError && (
          <Chip
            icon={<MovieIcon />}
            label="Animated"
            color="success"
            size="small"
            sx={{ alignSelf: 'flex-start' }}
          />
        )}

        {/* OCR text */}
        {panel.ocrText && (
          <Box sx={{ p: 1.5, bgcolor: 'background.default', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
            <Stack direction="row" spacing={0.5} alignItems="center" mb={0.5}>
              <TextSnippetIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
              <Typography variant="caption" color="text.secondary">OCR Text</Typography>
            </Stack>
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', fontSize: 12 }}>
              {panel.ocrText}
            </Typography>
          </Box>
        )}

        {/* Cinematic prompt */}
        <Box sx={{ flex: 1 }}>
          <Stack direction="row" spacing={0.5} alignItems="center" mb={0.5}>
            <AutoAwesomeIcon sx={{ fontSize: 14, color: 'primary.main' }} />
            <Typography variant="caption" color="text.secondary">Cinematic Prompt</Typography>
          </Stack>
          <TextField
            multiline
            minRows={3}
            value={prompt}
            onChange={(e) => onPromptChange(panel.id, e.target.value)}
            placeholder="No prompt yet — generated during processing"
            fullWidth
            size="small"
          />
        </Box>

        <Stack direction="row" spacing={1}>
          <Button size="small" color="error" variant="text">Delete</Button>
        </Stack>
      </CardContent>
    </Card>
  )
}

export default function StoryboardPage() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const [project, setProject] = useState<Project | null>(null)
  const [panels, setPanels] = useState<Panel[]>([])
  const [prompts, setPrompts] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [animating, setAnimating] = useState(false)
  const [pollInterval, setPollInterval] = useState<ReturnType<typeof setInterval> | null>(null)

  const loadData = useCallback(async () => {
    if (!projectId) return
    try {
      const [projectData, panelData] = await Promise.all([
        getProject(projectId),
        getPanels(projectId),
      ])
      setProject(projectData)
      setPanels(panelData)
      const initial: Record<string, string> = {}
      panelData.forEach((p) => { initial[p.id] = p.cinematicPrompt ?? '' })
      setPrompts((prev) => ({ ...initial, ...prev }))

      if (projectData.status === 'VIDEO_GENERATION') {
        setAnimating(true)
      } else {
        setAnimating(false)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load storyboard')
    }
  }, [projectId])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    if (animating && !pollInterval) {
      const id = setInterval(loadData, 3000)
      setPollInterval(id)
    } else if (!animating && pollInterval) {
      clearInterval(pollInterval)
      setPollInterval(null)
    }
    return () => { if (pollInterval) clearInterval(pollInterval) }
  }, [animating, pollInterval, loadData])

  async function handleAnimateAll() {
    if (!projectId) return
    try {
      setAnimating(true)
      await triggerVideoGeneration(projectId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start video generation')
      setAnimating(false)
    }
  }

  function handlePromptChange(panelId: string, value: string) {
    setPrompts((prev) => ({ ...prev, [panelId]: value }))
  }

  if (!projectId) return <Alert severity="error">Missing project ID</Alert>

  const animatedCount = panels.filter((p) => p.videoUrl).length
  const hasVideos = animatedCount > 0

  return (
    <Stack spacing={3}>
      <Stack direction={{ xs: 'column', md: 'row' }} sx={{ justifyContent: 'space-between' }} spacing={2}>
        <Box>
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 700 }}>
            Storyboard editor
          </Typography>
          <Typography color="text.secondary">
            Review OCR text and cinematic prompts. Animate panels or go straight to preview.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="flex-start">
          <Button
            variant="outlined"
            startIcon={animating ? <CircularProgress size={16} /> : <AutoAwesomeIcon />}
            onClick={handleAnimateAll}
            disabled={animating || panels.length === 0}
          >
            {animating ? 'Animating…' : 'Animate all panels'}
          </Button>
          <Button
            variant="contained"
            startIcon={<PlayArrowIcon />}
            onClick={() => navigate(`/projects/${projectId}/preview`)}
            disabled={!hasVideos}
          >
            Preview video
          </Button>
        </Stack>
      </Stack>

      {error && <Alert severity="error">{error}</Alert>}

      {animating && (
        <Box>
          <Stack direction="row" spacing={1} alignItems="center" mb={1}>
            <CircularProgress size={16} />
            <Typography variant="body2" color="text.secondary">
              Animating panels… {animatedCount}/{panels.length} done
            </Typography>
          </Stack>
          <LinearProgress
            variant="determinate"
            value={panels.length > 0 ? (animatedCount / panels.length) * 100 : 0}
          />
        </Box>
      )}

      <Stack direction="row" spacing={2} alignItems="center">
        <Typography variant="subtitle1" color="text.secondary">
          {project?.title} — {panels.length} panels
        </Typography>
        {hasVideos && (
          <Chip
            icon={<MovieIcon />}
            label={`${animatedCount} animated`}
            color="success"
            size="small"
          />
        )}
      </Stack>

      <Grid container spacing={2}>
        {panels.map((panel) => (
          <Grid key={panel.id} size={{ xs: 12, md: 6, lg: 4 }}>
            <PanelCard
              panel={panel}
              prompt={prompts[panel.id] ?? ''}
              onPromptChange={handlePromptChange}
            />
          </Grid>
        ))}
      </Grid>

      {panels.length === 0 && !error && (
        <Alert severity="info">No panels yet. Finish processing to populate the storyboard.</Alert>
      )}
    </Stack>
  )
}
