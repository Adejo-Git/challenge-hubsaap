import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClientBase } from '../api-client.base';
import { Tool } from '../models/tool.model';

@Injectable()
export class ToolsClient extends ApiClientBase {
  listTools(): Observable<Tool[]> {
    return this.get<Tool[]>('/tools');
  }

  getTool(id: string): Observable<Tool> {
    return this.get<Tool>(`/tools/${id}`);
  }
}
