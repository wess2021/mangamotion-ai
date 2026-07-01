import { useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import { useNavigate } from 'react-router-dom'
import { createProject, uploadChapter } from '../api/client'

const acceptedFormats = '.pdf,.zip,.jpg,.jpeg,.png,.webp'

export default function UploadPage() {
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    if (!file) {
      setError('Please select a chapter file to upload.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const project = await createProject(title || undefined)
      await uploadChapter(project.id, file)
      navigate(`/projects/${project.id}/processing`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Stack spacing={3} sx={{ maxWidth: 720 }}>
      <Box>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 700 }}>
          Upload chapter
        </Typography>
        <Typography color="text.secondary">
          Supported formats: PDF, ZIP, JPG, PNG, WEBP, or a folder exported as ZIP.
        </Typography>
      </Box>

      <Card>
        <CardContent>
          <Stack spacing={3}>
            <TextField
              label="Project title"
              placeholder="Chapter 42 — The Final Battle"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              fullWidth
            />

            <Button variant="outlined" component="label" startIcon={<CloudUploadIcon />}>
              {file ? file.name : 'Choose file'}
              <input
                hidden
                type="file"
                accept={acceptedFormats}
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </Button>

            {error && <Alert severity="error">{error}</Alert>}

            <Button
              variant="contained"
              size="large"
              disabled={loading || !file}
              onClick={handleSubmit}
              startIcon={loading ? <CircularProgress size={18} color="inherit" /> : undefined}
            >
              {loading ? 'Uploading...' : 'Upload & process'}
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  )
}
