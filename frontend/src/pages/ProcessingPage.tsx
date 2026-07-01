import { useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  LinearProgress,
  Stack,
  Typography,
} from '@mui/material'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked'
import { useNavigate, useParams } from 'react-router-dom'
import { getProject, type Project, type ProjectStatus } from '../api/client'

const steps: { status: ProjectStatus; label: string }[] = [
  { status: 'UPLOADING', label: 'Uploading...' },
  { status: 'EXTRACTING_PAGES', label: 'Extracting pages...' },
  { status: 'DETECTING_PANELS', label: 'Detecting panels...' },
  { status: 'OCR', label: 'Reading dialogue...' },
  { status: 'STORY_ANALYSIS', label: 'Understanding story...' },
  { status: 'PROMPT_GENERATION', label: 'Generating prompts...' },
  { status: 'READY', label: 'Done' },
]

function stepIndex(status: ProjectStatus) {
  const index = steps.findIndex((step) => step.status === status)
  return index === -1 ? 0 : index
}

export default function ProcessingPage() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const [project, setProject] = useState<Project | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!projectId) return

    let active = true

    async function poll() {
      try {
        const data = await getProject(projectId!)
        if (!active) return
        setProject(data)
        setError(null)
      } catch (err) {
        if (!active) return
        setError(err instanceof Error ? err.message : 'Failed to load project status')
      }
    }

    poll()
    const interval = setInterval(poll, 2000)
    return () => {
      active = false
      clearInterval(interval)
    }
  }, [projectId])

  if (!projectId) {
    return <Alert severity="error">Missing project ID</Alert>
  }

  const currentStep = stepIndex(project?.status ?? 'CREATED')

  return (
    <Stack spacing={3} sx={{ maxWidth: 720 }}>
      <Box>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 700 }}>
          Processing
        </Typography>
        <Typography color="text.secondary">
          Real-time progress for your chapter pipeline.
        </Typography>
      </Box>

      {error && <Alert severity="error">{error}</Alert>}

      <Card>
        <CardContent>
          <Stack spacing={3}>
            <Box>
              <Typography variant="h6" gutterBottom>
                {project?.title ?? 'Loading project...'}
              </Typography>
              <Typography color="text.secondary" gutterBottom>
                {project?.progressMessage ?? 'Starting...'}
              </Typography>
              <LinearProgress
                variant="determinate"
                value={project?.progressPercent ?? 0}
                sx={{ height: 10, borderRadius: 999 }}
              />
            </Box>

            <Stack spacing={1.5}>
              {steps.map((step, index) => {
                const done = index < currentStep || project?.status === 'READY'
                const active = index === currentStep && project?.status !== 'READY'
                return (
                  <Stack
                    key={step.status}
                    direction="row"
                    spacing={1.5}
                    sx={{ alignItems: 'center' }}
                  >
                    {done ? (
                      <CheckCircleIcon color="success" fontSize="small" />
                    ) : (
                      <RadioButtonUncheckedIcon
                        color={active ? 'primary' : 'disabled'}
                        fontSize="small"
                      />
                    )}
                    <Typography color={done || active ? 'text.primary' : 'text.secondary'}>
                      {step.label}
                    </Typography>
                  </Stack>
                )
              })}
            </Stack>

            {project?.status === 'READY' && (
              <Button variant="contained" onClick={() => navigate(`/projects/${projectId}/storyboard`)}>
                Open storyboard editor
              </Button>
            )}

            {project?.status === 'FAILED' && (
              <Alert severity="error">{project.progressMessage}</Alert>
            )}
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  )
}
