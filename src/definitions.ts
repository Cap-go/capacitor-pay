export interface PayPlugin {
  echo(options: { value: string }): Promise<{ value: string }>;
}
