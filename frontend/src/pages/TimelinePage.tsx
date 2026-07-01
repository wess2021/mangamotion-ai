import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  LinearProgress,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material'
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward'
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward'
import MovieIcon from '@mui/icons-material/Movie'
import MicIcon from '@mui/icons-material/Mic'
import MergeIcon from '@mui/icons-material/MergeType'
import DownloadIcon from '@mui/icons-material/Download'
import SubtitlesIcon from '@mui/icons-material/Subtitles'
import { useParams } from 'react-router-dom'
import { getProject, getPanels, triggerExport, updatePanelOrder, type Panel, type Project } from '../api/client'

const PANEL_DURATION = 6  // seconds per panel

export default function TimelinePage() {
  const { projectId } = useParams<{ projectId: string }>()
  const [project, setProject] = useState<Project | null>(null)
  const [panels, setPanels] = useState<Panel[]>([])
  const [error, setError] = useState<string | null>(null)
  const [merging, setMerging] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const loadData = useCallback(async () => {
    if (!projectId) return
    try {
      const [proj, pnls] = await Promise.all([getProject(projectId), getPanels(projectId)])
      setProject(proj)
      setPanels(pnls.slice().sort((a, b) => a.sortOrder - b.sortOrder))
      if (proj.status === 'MERGING') {
        setMerging(true)
      } else {
        setMerging(false)
        if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load timeline')
    }
  }, [projectId])

  useEffect(() => {
    loadData()
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [loadData])

  async function movePanel(index: number, direction: -1 | 1) {
    if (!projectId) return
    const newPanels = [...panels]
    const swapIdx = index + direction
    if (swapIdx < 0 || swapIdx >= newPanels.length) return
    ;[newPanels[index], newPanels[swapIdx]] = [newPanels[swapIdx], newPanels[index]]
    setPanels(newPanels)
    try {
      await updatePanelOrder(projectId, newPanels.map((p) => p.id))
    } catch (err) {
      setError('Failed to save panel order')
    }
  }

  async function handleExport() {
    if (!projectId) return
    setMerging(true)
    setError(null)
    try {
      await triggerExport(projectId)
      pollRef.current = setInterval(loadData, 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed')
      setMerging(false)
    }
  }

  const animatedPanels = panels.filter((p) => p.videoUrl)
  const totalDuration   = animatedPanels.length * PANEL_DURATION
  const totalMin        = Math.floor(totalDuration / 60)
  const totalSec        = totalDuration % 60

  if (!projectId) return <Alert severity="error">Missing project ID</Alert>

  return (
    <Stack spacing={3}>
      {/* Header */}
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>Timeline editor</Typography>
          <Typography color="text.secondary">
            Drag panels into order, then merge everything into a final MP4 with audio.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="flex-start" flexWrap="wrap">
          <Button
            variant="contained"
            color="success"
            startIcon={merging ? <CircularProgress size={16} color="inherit" /> : <MergeIcon />}
            onClick={handleExport}
            disabled={merging || animatedPanels.length === 0}
            size="large"
          >
            {merging ? 'Merging…' : 'Merge & Export MP4'}
          </Button>
          {project?.exportUrl && (
            <>
              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
                href={project.exportUrl}
                download
                component="a"
              >
                Download MP4
              </Button>
              {project.srtUrl && (
                <Button
                  variant="outlined"
                  color="secondary"
                  startIcon={<SubtitlesIcon />}
                  href={project.srtUrl}
                  download
                  component="a"
                >
                  Download SRT
                </Button>
              )}
            </>
          )}
        </Stack>
      </Stack>

      {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}

      {/* Export ready banner */}
      {project?.exportUrl && !merging && (
        <Alert severity="success" icon={<MovieIcon />}>
          <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
            <span>
              Final MP4 is ready! {totalMin}m {totalSec}s · {animatedPanels.length} panels
              {project.dominantMood && ` · ${project.dominantMood} mood`}
            </span>
            <Button size="small" variant="outlined" href={project.exportUrl} download component="a" startIcon={<DownloadIcon />}>
              Download MP4
            </Button>
            {project.srtUrl && (
              <Button size="small" variant="outlined" color="secondary" href={project.srtUrl} download component="a" startIcon={<SubtitlesIcon />}>
                Download SRT
              </Button>
            )}
          </Stack>
        </Alert>
      )}

      {/* Merging progress */}
      {merging && (
        <Box>
          <Stack direction="row" spacing={1} alignItems="center" mb={1}>
            <CircularProgress size={16} />
            <Typography variant="body2" color="text.secondary">
              {project?.progressMessage ?? 'Merging…'} ({project?.progressPercent ?? 0}%)
            </Typography>
          </Stack>
          <LinearProgress variant="indeterminate" />
        </Box>
      )}

      {/* Stats bar */}
      <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
        <Chip icon={<MovieIcon />} label={`${animatedPanels.length} animated`}
              color={animatedPanels.length > 0 ? 'success' : 'default'} size="small" />
        <Chip label={`⏱ ${totalMin}m ${totalSec}s total`} size="small" variant="outlined" />
        {project?.musicUrl && (
          <Chip label={`🎵 ${project.dominantMood ?? 'music'} mood`} color="primary" size="small" />
        )}
      </Stack>

      {/* Timeline strip */}
      {panels.length === 0 ? (
        <Alert severity="info">No panels yet. Upload and process a chapter first.</Alert>
      ) : (
        <Card>
          <CardContent>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Panel sequence — use arrows to reorder ({panels.length} total)
            </Typography>
            <Divider sx={{ mb: 2 }} />

            {/* Horizontal scrollable timeline */}
            <Box sx={{ overflowX: 'auto', pb: 1 }}>
              <Stack direction="row" spacing={0} sx={{ minWidth: panels.length * 130 }}>
                {panels.map((panel, idx) => (
                  <Box
                    key={panel.id}
                    sx={{
                      width: 120,
                      flexShrink: 0,
                      border: '1px solid',
                      borderColor: panel.videoUrl ? 'success.dark' : 'divider',
                      borderRadius: 1,
                      mr: 1,
                      overflow: 'hidden',
                      bgcolor: panel.videoUrl ? 'rgba(76,175,80,0.05)' : 'background.paper',
                    }}
                  >
                    {/* Thumbnail */}
                    <Box sx={{ position: 'relative', height: 80, bgcolor: 'background.default' }}>
                      <Box
                        component="img"
                        src={panel.imageUrl}
                        alt={`Panel ${idx + 1}`}
                        sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                      />
                      {/* Timestamp label */}
                      <Box sx={{
                        position: 'absolute', bottom: 2, left: 2,
                        bgcolor: 'rgba(0,0,0,0.7)', borderRadius: 0.5, px: 0.5,
                      }}>
                        <Typography variant="caption" sx={{ color: 'white', fontSize: 9 }}>
                          {(idx * PANEL_DURATION / 60 | 0).toString().padStart(2, '0')}:
                          {((idx * PANEL_DURATION) % 60).toString().padStart(2, '0')}
                        </Typography>
                      </Box>
                    </Box>

                    {/* Info */}
                    <Box sx={{ p: 0.75 }}>
                      <Typography variant="caption" sx={{ fontWeight: 700 }}>#{idx + 1}</Typography>
                      <Stack direction="row" spacing={0.25} flexWrap="wrap" mt={0.25}>
                        {panel.videoUrl && <Chip label="🎬" size="small" sx={{ height: 16, fontSize: 9 }} />}
                        {panel.voiceUrl && <Chip label="🎙" size="small" sx={{ height: 16, fontSize: 9 }} />}
                        {panel.sfxUrl   && <Chip label="💥" size="small" sx={{ height: 16, fontSize: 9 }} />}
                      </Stack>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: 9, display: 'block', mt: 0.25 }}>
                        {PANEL_DURATION}s
                      </Typography>
                    </Box>

                    {/* Order buttons */}
                    <Stack direction="row" justifyContent="center" sx={{ pb: 0.5 }}>
                      <Tooltip title="Move earlier">
                        <span>
                          <IconButton size="small" onClick={() => movePanel(idx, -1)} disabled={idx === 0}>
                            <ArrowUpwardIcon sx={{ fontSize: 14 }} />
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Tooltip title="Move later">
                        <span>
                          <IconButton size="small" onClick={() => movePanel(idx, 1)} disabled={idx === panels.length - 1}>
                            <ArrowDownwardIcon sx={{ fontSize: 14 }} />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </Stack>
                  </Box>
                ))}
              </Stack>
            </Box>

            {/* Duration ruler */}
            <Box sx={{ mt: 2 }}>
              <Typography variant="caption" color="text.secondary">
                Total duration: {totalMin}m {totalSec}s at {PANEL_DURATION}s/panel
              </Typography>
              <LinearProgress
                variant="determinate"
                value={panels.length > 0 ? (animatedPanels.length / panels.length) * 100 : 0}
                sx={{ mt: 0.5, height: 4, borderRadius: 1 }}
              />
              <Typography variant="caption" color="text.secondary">
                {animatedPanels.length}/{panels.length} panels animated
              </Typography>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Animated panels without video — note */}
      {panels.length > 0 && animatedPanels.length === 0 && (
        <Alert severity="warning">
          No animated panels yet. Go to the Storyboard editor and click "Animate all panels" first.
        </Alert>
      )}
    </Stack>
  )
}
