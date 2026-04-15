import path from 'path';
import { Environment, EnvironmentsData } from '../models/environment';
import { BaseRepository } from './base.repository';

export class EnvironmentRepository extends BaseRepository {
  constructor(private readonly getDataDir: () => string) {
    super();
  }

  private getFilePath(): string {
    return path.join(this.getDataDir(), 'environments.json');
  }

  private read(): EnvironmentsData {
    return this.readJson<EnvironmentsData>(this.getFilePath(), {
      activeEnvironmentId: null,
      environments: [],
    });
  }

  private write(data: EnvironmentsData): void {
    this.writeJson(this.getFilePath(), data);
  }

  getAll(): EnvironmentsData {
    return this.read();
  }

  save(environment: Environment): void {
    const data = this.read();
    const index = data.environments.findIndex((e) => e.id === environment.id);
    if (index >= 0) {
      data.environments[index] = environment;
    } else {
      data.environments.push(environment);
    }
    this.write(data);
  }

  delete(id: string): boolean {
    const data = this.read();
    const index = data.environments.findIndex((e) => e.id === id);
    if (index < 0) return false;
    if (data.environments.length === 1) return false; // Cannot delete last environment

    data.environments.splice(index, 1);
    if (data.activeEnvironmentId === id) {
      data.activeEnvironmentId = data.environments[0]?.id ?? null;
    }
    this.write(data);
    return true;
  }

  setActive(id: string): boolean {
    const data = this.read();
    const exists = data.environments.some((e) => e.id === id);
    if (!exists) return false;
    data.activeEnvironmentId = id;
    this.write(data);
    return true;
  }

  getActive(): Environment | null {
    const data = this.read();
    if (!data.activeEnvironmentId) return null;
    return data.environments.find((e) => e.id === data.activeEnvironmentId) ?? null;
  }

  findById(id: string): Environment | undefined {
    const data = this.read();
    return data.environments.find((e) => e.id === id);
  }

  /** Replace the entire environments data (used for import). */
  replaceAll(data: EnvironmentsData): void {
    this.write(data);
  }
}
