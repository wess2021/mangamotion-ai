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
  Tooltip,
  Typography,
} from '@mui/material'
import DownloadIcon from '@mui/icons-material/Download'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import PauseIcon from '@mui/icons-material/Pause'
import SkipNextIcon from '@mui/icons-material/SkipNext'
import SkipPreviousIcon from '@mui/icons-material/SkipPrevious'
import MovieIcon from '@mui/icons-material/Movie'
import MicIcon from '@mui/icons-material/Mic'
import MusicNoteIcon from '@mui/icons-material/MusicNote'
import SubtitlesIcon from '@mui/icons-material/Subtitles'
import { useNavigate, useParams } from 'react-router-dom'
import { getPanels, getProject, type Panel, type Project } from '../api/client'

export default function PreviewPage() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const [project, setProject] = useState<Project | null>(null)
  const [panels, setPanels] = useState<Panel[]>([])
  const [error, setError] = useState<string | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const voiceRef = useRef<HTMLAudioElement>(null)
  const musicRef = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    if (!projectId) return
    Promise.all([getProject(projectId), getPanels(projectId)])
      .then(([proj, pnls]) => {
        setProject(proj)
        const videoPanels = pnls.filter((p) => p.videoUrl).sort((a, b) => a.sortOrder - b.sortOrder)
        setPanels(videoPanels)
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load preview'))
  }, [projectId])

  const current = panels[currentIndex]

  useEffect(() => {
    if (videoRef.current && current?.videoUrl) {
      videoRef.current.src = current.videoUrl
      videoRef.current.load()
      if (isPlaying) videoRef.current.play().catch(() => {})
    }
    if (voiceRef.current) {
      if (current?.voiceUrl) {
        voiceRef.current.src = current.voiceUrl
        voiceRef.current.load()
        if (isPlaying) voiceRef.current.play().catch(() => {})
      } else {
        voiceRef.current.pause()
      }
    }
  }, [currentIndex, current?.videoUrl, current?.voiceUrl])

  function handleVideoEnded() {
    if (currentIndex < panels.length - 1) {
      setCurrentIndex((i) => i + 1)
    } else {
      setIsPlaying(false)
      musicRef.current?.pause()
    }
  }

  function togglePlay() {
    if (!videoRef.current) return
    if (isPlaying) {
      videoRef.current.pause()
      voiceRef.current?.pause()
      musicRef.current?.pause()
    } else {
      videoRef.current.play().catch(() => {})
      if (current?.voiceUrl && voiceRef.current) voiceRef.current.play().catch(() => {})
      if (project?.musicUrl && musicRef.current) musicRef.current.play().catch(() => {})
    }
    setIsPlaying(!isPlaying)
  }

  function goTo(index: number) {
    setCurrentIndex(Math.max(0, Math.min(index, panels.length - 1)))
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
            Watch animated panels in sequence. Voice and music play automatically.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="flex-start" flexWrap="wrap">
          <Chip icon={<MovieIcon />} label={`${panels.length} animated`}
                color={panels.length > 0 ? 'success' : 'default'} />
          {project?.musicUrl && (
            <Chip icon={<MusicNoteIcon />} label={project.dominantMood ?? 'music'} color="primary" />
          )}
        </Stack>
      </Stack>

      {error && <Alert severity="error">{error}</Alert>}

      {/* Hidden audio for sync */}
      <Box component="audio" ref={voiceRef} sx={{ display: 'none' }} />
      {project?.musicUrl && (
        <Box component="audio" ref={musicRef} src={project.musicUrl} loop sx={{ display: 'none' }} />
      )}

      {/* Export ready banner */}
      {project?.exportUrl && (
        <Alert severity="success" icon={<DownloadIcon />}>
          <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
            <span>Final MP4 export is ready!</span>
            <Button size="small" variant="outlined" href={project.exportUrl} download component="a"
                    startIcon={<DownloadIcon />}>Download MP4</Button>
            {project.srtUrl && (
              <Button size="small" variant="outlined" color="secondary" href={project.srtUrl} download
                      component="a" startIcon={<SubtitlesIcon />}>Download SRT</Button>
            )}
            <Button size="small" variant="text" onClick={() => navigate(`/projects/${projectId}/timeline`)}>
              Edit timeline →
            </Button>
          </Stack>
        </Alert>
      )}

      {panels.length === 0 ? (
        <Alert severity="info">
          No animated panels yet. Go to the Storyboard editor and click "Animate all panels" first.
        </Alert>
      ) : (
        <Card>
          <CardContent>
            <Stack spacing={2}>
              {/* Main video player */}
              <Box sx={{ aspectRatio: '16 / 9', borderRadius: 2, bgcolor: 'black', overflow: 'hidden', position: 'relative' }}>
                <Box
                  component="video"
                  ref={videoRef}
                  src={current?.videoUrl ?? ''}
                  onEnded={handleVideoEnded}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  sx={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
                <Stack direction="row" spacing={0.5} sx={{ position: 'absolute', top: 8, right: 8 }}>
                  {current?.voiceUrl && (
                    <Chip icon={<MicIcon sx={{ fontSize: '14px !important' }} />} label="Voice" size="small"
                          sx={{ bgcolor: 'rgba(0,0,0,0.6)', color: 'white', '& .MuiChip-icon': { color: 'secondary.light' } }} />
                  )}
                  {project?.musicUrl && (
                    <Chip icon={<MusicNoteIcon sx={{ fontSize: '14px !important' }} />}
                          label={project.dominantMood ?? 'music'} size="small"
                          sx={{ bgcolor: 'rgba(0,0,0,0.6)', color: 'white', '& .MuiChip-icon': { color: 'primary.light' } }} />
                  )}
                </Stack>
              </Box>

              {/* Controls */}
              <Stack direction="row" spacing={1} alignItems="center" justifyContent="center">
                <Button onClick={() => goTo(currentIndex - 1)} disabled={currentIndex === 0}
                        variant="outlined" size="small"><SkipPreviousIcon /></Button>
                <Button onClick={togglePlay} variant="contained" size="large" sx={{ minWidth: 100 }}>
                  {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
                </Button>
                <Button onClick={() => goTo(currentIndex + 1)} disabled={currentIndex >= panels.length - 1}
                        variant="outlined" size="small"><SkipNextIcon /></Button>
              </Stack>

              {/* Progress */}
              <Box>
                <LinearProgress
                  variant="determinate"
                  value={panels.length > 1 ? (currentIndex / (panels.length - 1)) * 100 : 100}
                  sx={{ borderRadius: 1, height: 6 }}
                />
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                  Panel {currentIndex + 1} of {panels.length}
                  {current && ` — Page ${current.pageNumber}, Panel ${current.panelNumber}`}
                </Typography>
              </Box>

              {/* Voice player */}
              {current?.voiceUrl && (
                <Box sx={{ p: 1.5, bgcolor: 'background.default', borderRadius: 1 }}>
                  <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
                    <MicIcon sx={{ fontSize: 14, color: 'secondary.main' }} />
                    <Typography variant="caption" color="text.secondary">Dialogue voice</Typography>
                    {current.ocrText && (
                      <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic', ml: 1 }}>
                        "{current.ocrText.slice(0, 60)}{current.ocrText.length > 60 ? '…' : ''}"
                      </Typography>
                    )}
                  </Stack>
                  <Box component="audio" controls src={current.voiceUrl} sx={{ width: '100%', height: 32 }} />
                </Box>
              )}

              {/* Background music player */}
              {project?.musicUrl && (
                <Box sx={{ p: 1.5, bgcolor: 'background.default', borderRadius: 1 }}>
                  <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
                    <MusicNoteIcon sx={{ fontSize: 14, color: 'primary.main' }} />
                    <Typography variant="caption" color="text.secondary">
                      Background music — {project.dominantMood ?? 'ambient'} mood
                    </Typography>
                  </Stack>
                  <Box component="audio" controls src={project.musicUrl} loop sx={{ width: '100%', height: 32 }} />
                </Box>
              )}

              <Divider />

              {/* Thumbnail strip */}
              <Stack direction="row" spacing={1} sx={{ overflowX: 'auto', pb: 1 }}>
                {panels.map((panel, idx) => (
                  <Box key={panel.id} onClick={() => goTo(idx)} sx={{
                    flexShrink: 0, width: 100, cursor: 'pointer', border: '2px solid',
                    borderColor: idx === currentIndex ? 'primary.main' : 'transparent',
                    borderRadius: 1, overflow: 'hidden', opacity: idx === currentIndex ? 1 : 0.6,
                    transition: 'all 0.2s', '&:hover': { opacity: 1, borderColor: 'primary.light' },
                  }}>
                    <Box component="img" src={panel.imageUrl} alt={`Panel ${panel.panelNumber}`}
                         sx={{ width: '100%', height: 60, objectFit: 'cover', display: 'block' }}
                         onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                    <Stack direction="row" spacing={0.25} sx={{ p: 0.5, justifyContent: 'center' }}>
                      <Typography variant="caption" sx={{ textAlign: 'center' }}>{idx + 1}</Typography>
                      {panel.voiceUrl && <MicIcon sx={{ fontSize: 10, color: 'secondary.main', alignSelf: 'center' }} />}
                    </Stack>
                  </Box>
                ))}
              </Stack>

              <Divider />

              {/* Download row */}
              <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
                <Box>
                  <Typography variant="h6">{project?.title ?? 'Loading...'}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {project?.exportUrl
                      ? 'Final MP4 ready — includes video, voice & music'
                      : 'Go to Timeline editor to merge and download the final MP4'}
                  </Typography>
                </Box>
                <Stack direction="row" spacing={1}>
                  {project?.exportUrl ? (
                    <>
                      <Button variant="contained" startIcon={<DownloadIcon />}
                              href={project.exportUrl} download component="a">
                        Download MP4
                      </Button>
                      {project.srtUrl && (
                        <Button variant="outlined" color="secondary" startIcon={<SubtitlesIcon />}
                                href={project.srtUrl} download component="a">
                          Download SRT
                        </Button>
                      )}
                    </>
                  ) : (
                    <Tooltip title="Merge panels first in the Timeline editor">
                      <span>
                        <Button variant="contained" startIcon={<DownloadIcon />}
                                onClick={() => navigate(`/projects/${projectId}/timeline`)}>
                          Go to Timeline →
                        </Button>
                      </span>
                    </Tooltip>
                  )}
                </Stack>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      )}
    </Stack>
  )
}
