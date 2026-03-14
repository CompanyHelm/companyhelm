export interface RuntimePorts {
  apiHttp: number;
  ui: number;
  runnerGrpc: number;
  agentCliGrpc: number;
}

export interface DockerManagedServiceRuntime {
  source: "docker";
}

export interface LocalManagedServiceRuntime {
  source: "local";
  repoPath: string;
  logPath: string;
  pid: number;
}

export type ManagedServiceRuntime = DockerManagedServiceRuntime | LocalManagedServiceRuntime;

export interface RuntimeState {
  version: 1;
  company: {
    id: string;
    name: string;
  };
  auth: {
    username: string;
    password: string;
    jwtPrivateKeyPem: string;
    jwtPublicKeyPem: string;
  };
  runner: {
    name: string;
    secret: string;
  };
  ports: RuntimePorts;
  services: {
    api: ManagedServiceRuntime;
    frontend: ManagedServiceRuntime;
  };
}
