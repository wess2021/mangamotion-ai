import { useEffect, useRef, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  LinearProgress,
  Stack,
  Typography,
} from '@mui/material'
import DownloadIcon from '@mui/icons-material/Download'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import PauseIcon from '@mui/icons-material/Pause'
import SkipNextIcon from '@mui/icons-material/SkipNext'
import SkipPreviousIcon from '@mui/icons-material/SkipPrevious'
import MovieIcon from '@mui/icons-material/Movie'
import { useParams } from 'react-router-dom'
import { getPanels, getProject, type Panel, type Project } from '../api/client'

export default function PreviewPage() {
  const { projectId } = useParams()
  const [project, setProject] = useState<Project | null>(null)
  const [panels, setPanels] = useState<Panel[]>([])
  const [error, setError] = useState<string | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (!projectId) return
    Promise.all([getProject(projectId), getPanels(projectId)])
      .then(([proj, pnls]) => {
        setProject(proj)
        const videoPanels = pnls.filter((p) => p.videoUrl)
        setPanels(videoPanels)
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load preview'))
  }, [projectId])

  const videoPanels = panels.filter((p) => p.videoUrl)
  const current = videoPanels[currentIndex]

  useEffect(() => {
    if (videoRef.current && current?.videoUrl) {
      videoRef.current.src = current.videoUrl
      videoRef.current.load()
      if (isPlaying) videoRef.current.play().catch(() => {})
    }
  }, [currentIndex, current?.videoUrl])

  function handleVideoEnded() {
    if (currentIndex < videoPanels.length - 1) {
      setCurrentIndex((i) => i + 1)
    } else {
      setIsPlaying(false)
    }
  }

  function togglePlay() {
    if (!videoRef.current) return
    if (isPlaying) {
      videoRef.current.pause()
    } else {
      videoRef.current.play().catch(() => {})
    }
    setIsPlaying(!isPlaying)
  }

  function goTo(index: number) {
    setCurrentIndex(Math.max(0, Math.min(index, videoPanels.length - 1)))
  }

  if (!projectId) return <Alert severity="error">Missing project ID</Alert>

  return (
    <Stack spacing={3} sx={{ maxWidth: 1000 }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={2}>
        <Box>
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 700 }}>
            Video preview
          </Typography>
          <Typography color="text.secondary">
            Watch your animated panels in sequence and download the final export.
          </Typography>
        </Box>
        <Chip
          icon={<MovieIcon />}
          label={`${videoPanels.length} / ${panels.length + videoPanels.length} panels animated`}
          color={videoPanels.length > 0 ? 'success' : 'default'}
        />
      </Stack>

      {error && <Alert severity="error">{error}</Alert>}

      {videoPanels.length === 0 ? (
        <Alert severity="info">
          No animated panels yet. Go to the Storyboard editor and click "Animate all panels" first.
        </Alert>
      ) : (
        <Card>
          <CardContent>
            <Stack spacing={2}>
              {/* Main video player */}
              <Box
                sx={{
                  aspectRatio: '16 / 9',
                  borderRadius: 2,
                  bgcolor: 'black',
                  overflow: 'hidden',
                  position: 'relative',
                }}
              >
                <Box
                  component="video"
                  ref={videoRef}
                  src={current?.videoUrl ?? ''}
                  onEnded={handleVideoEnded}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  sx={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              </Box>

              {/* Controls */}
              <Stack direction="row" spacing={1} alignItems="center" justifyContent="center">
                <Button
                  onClick={() => goTo(currentIndex - 1)}
                  disabled={currentIndex === 0}
                  variant="outlined"
                  size="small"
                >
                  <SkipPreviousIcon />
                </Button>
                <Button onClick={togglePlay} variant="contained" size="large" sx={{ minWidth: 100 }}>
                  {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
                </Button>
                <Button
                  onClick={() => goTo(currentIndex + 1)}
                  disabled={currentIndex >= videoPanels.length - 1}
                  variant="outlined"
                  size="small"
                >
                  <SkipNextIcon />
                </Button>
              </Stack>

              {/* Progress bar */}
              <Box>
                <LinearProgress
                  variant="determinate"
                  value={videoPanels.length > 1 ? (currentIndex / (videoPanels.length - 1)) * 100 : 100}
                  sx={{ borderRadius: 1, height: 6 }}
                />
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                  Panel {currentIndex + 1} of {videoPanels.length}
                  {current && ` — Page ${current.pageNumber}, Panel ${current.panelNumber}`}
                </Typography>
              </Box>

              <Divider />

              {/* Panel strip */}
              <Stack direction="row" spacing={1} sx={{ overflowX: 'auto', pb: 1 }}>
                {videoPanels.map((panel, idx) => (
                  <Box
                    key={panel.id}
                    onClick={() => goTo(idx)}
                    sx={{
                      flexShrink: 0,
                      width: 100,
                      cursor: 'pointer',
                      border: '2px solid',
                      borderColor: idx === currentIndex ? 'primary.main' : 'transparent',
                      borderRadius: 1,
                      overflow: 'hidden',
                      opacity: idx === currentIndex ? 1 : 0.6,
                      transition: 'all 0.2s',
                      '&:hover': { opacity: 1, borderColor: 'primary.light' },
                    }}
                  >
                    <Box
                      component="img"
                      src={panel.imageUrl}
                      alt={`Panel ${panel.panelNumber}`}
                      sx={{ width: '100%', height: 60, objectFit: 'cover', display: 'block' }}
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                    />
                    <Typography variant="caption" sx={{ display: 'block', p: 0.5, textAlign: 'center' }}>
                      {idx + 1}
                    </Typography>
                  </Box>
                ))}
              </Stack>

              <Divider />

              {/* Download */}
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="h6">{project?.title ?? 'Loading...'}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Full MP4 merge via FFmpeg coming in Phase 6
                  </Typography>
                </Box>
                <Tooltip title="Full MP4 export available in Phase 6">
                  <span>
                    <Button variant="contained" startIcon={<DownloadIcon />} disabled>
                      Download MP4
                    </Button>
                  </span>
                </Tooltip>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      )}
    </Stack>
  )
}
