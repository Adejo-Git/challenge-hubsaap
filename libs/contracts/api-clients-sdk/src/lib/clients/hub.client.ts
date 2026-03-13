import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClientBase } from '../api-client.base';
import { Project } from '../models/project.model';

@Injectable()
export class HubClient extends ApiClientBase {
  getProject(projectId: string): Observable<Project> {
    return this.get<Project>(`/projects/${projectId}`);
  }

  listProjects(params?: { page?: number; pageSize?: number }): Observable<Project[]> {
    return this.get<Project[]>('/projects', params as Record<string, string | number> | undefined);
  }
}
