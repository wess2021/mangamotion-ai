import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080'

export const api = axios.create({
  baseURL: `${API_URL}/api`,
})

export type ProjectStatus =
  | 'CREATED'
  | 'UPLOADING'
  | 'EXTRACTING_PAGES'
  | 'DETECTING_PANELS'
  | 'OCR'
  | 'STORY_ANALYSIS'
  | 'PROMPT_GENERATION'
  | 'VIDEO_GENERATION'
  | 'VOICE_GENERATION'
  | 'AUDIO_GENERATION'
  | 'MERGING'
  | 'READY'
  | 'FAILED'

export interface Project {
  id: string
  title: string
  status: ProjectStatus
  progressMessage: string
  progressPercent: number
  panelCount: number
  createdAt: string
  updatedAt: string
}

export interface Panel {
  id: string
  pageNumber: number
  panelNumber: number
  imageUrl: string
  ocrText: string | null
  cinematicPrompt: string | null
  videoUrl: string | null
  sortOrder: number
}

export async function createProject(title?: string) {
  const { data } = await api.post<Project>('/projects', title ? { title } : {})
  return data
}

export async function uploadChapter(projectId: string, file: File) {
  const formData = new FormData()
  formData.append('file', file)
  const { data } = await api.post<Project>(`/projects/${projectId}/upload`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

export async function getProject(projectId: string) {
  const { data } = await api.get<Project>(`/projects/${projectId}`)
  return data
}

export async function getPanels(projectId: string) {
  const { data } = await api.get<Panel[]>(`/projects/${projectId}/panels`)
  return data
}
