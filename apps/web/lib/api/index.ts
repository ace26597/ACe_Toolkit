// Re-export everything so existing imports from '@/lib/api' continue to work

export { CSRF_HEADERS, getApiUrl } from './client';

export { authApi } from './auth';
export type { AuthUser, TrialInfo, LoginResponse, RegisterResponse } from './auth';

export { workspaceApi, recordingsApi } from './workspace';
export type {
  WorkspaceProject,
  WorkspaceNote,
  WorkspaceDataItem,
  ImageUploadResult,
  WorkspaceSession,
  SessionFile,
  RecordingInfo,
} from './workspace';

export { dataStudioApi, dataStudioV2Api } from './dataStudio';
export type {
  DataFile,
  DataStudioSession,
  DataStudioProject,
  ColumnInfo,
  FileAnalysis,
  ProjectMetadata,
  Dashboard,
} from './dataStudio';

export type { DashboardInfo, DashboardLayout, DashboardWidget } from './types';
