import { EnvironmentRepository } from '../repositories/environment.repository';
import { substituteInRequest } from '../utils/variable-substitution';
import { AppError } from '../errors/app-error';
import type { Environment, EnvironmentsData } from '../models/environment';
import type { ProxyRequest } from '../models/proxy';

export class EnvironmentService {
  constructor(private readonly repo: EnvironmentRepository) {}

  getAll(): EnvironmentsData {
    return this.repo.getAll();
  }

  getActive(): Environment | null {
    return this.repo.getActive();
  }

  findById(id: string): Environment | undefined {
    return this.repo.findById(id);
  }

  save(environment: Environment): Environment {
    this.repo.save(environment);
    return environment;
  }

  delete(id: string): void {
    const success = this.repo.delete(id);
    if (!success) {
      throw AppError.badRequest('Cannot delete the last remaining environment');
    }
  }

  setActive(id: string): void {
    const success = this.repo.setActive(id);
    if (!success) {
      throw AppError.notFound('Environment not found');
    }
  }

  replaceAll(data: EnvironmentsData): void {
    this.repo.replaceAll(data);
  }

  substituteInRequest(partialRequest: Pick<ProxyRequest, 'url' | 'headers' | 'body' | 'formDataEntries'>): Pick<ProxyRequest, 'url' | 'headers' | 'body' | 'formDataEntries'> {
    const active = this.repo.getActive();
    return substituteInRequest(partialRequest, active);
  }
}
