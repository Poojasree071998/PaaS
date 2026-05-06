import Docker from 'dockerode';
import config from '../config';

const docker = new Docker({ socketPath: config.DOCKER_SOCKET_PATH });

export default docker;

export const getFrameworkImage = (framework: string): string => {
  const images: Record<string, string> = {
    NEXTJS: 'node:20-alpine',
    REACT: 'node:20-alpine',
    VUE: 'node:20-alpine',
    EXPRESS: 'node:20-alpine',
    STATIC: 'node:20-alpine',
    // ... add more
  };
  return images[framework] || 'node:20-alpine';
};
