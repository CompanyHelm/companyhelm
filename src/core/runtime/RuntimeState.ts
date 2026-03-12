export interface RuntimePorts {
  apiHttp: number;
  ui: number;
  runnerGrpc: number;
  agentCliGrpc: number;
}

export interface RuntimeState {
  version: 1;
  company: {
    id: string;
    name: string;
  };
  auth: {
    username: "admin";
    password: string;
    jwtPrivateKeyPem: string;
    jwtPublicKeyPem: string;
  };
  runner: {
    name: string;
    secret: string;
  };
  ports: RuntimePorts;
}
