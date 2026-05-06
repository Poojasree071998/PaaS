export enum DeploymentStatus {
  QUEUED = 'QUEUED',
  BUILDING = 'BUILDING',
  READY = 'READY',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export interface Project {
  id: string;
  name: string;
  slug: string;
  framework: string;
  repoUrl?: string;
  createdAt: string;
}

export interface Deployment {
  id: string;
  projectId: string;
  status: DeploymentStatus;
  url?: string;
  createdAt: string;
}

export interface BuildLog {
  id: string;
  deploymentId: string;
  content: string;
  level: 'info' | 'warn' | 'error';
  timestamp: string;
}
