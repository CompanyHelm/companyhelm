export interface PreflightCheck {
  run(): Promise<void>;
}
