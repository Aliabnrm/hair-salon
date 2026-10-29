export abstract class DatabaseHealthCheck {
  abstract isAvailable(): Promise<boolean>;
}
