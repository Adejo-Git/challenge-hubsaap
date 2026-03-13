/**
 * Tool Events Tests
 * 
 * Bateria de testes para garantir:
 * - Namespacing correto por toolKey
 * - Lifecycle helpers funcionais
 * - Validação de payload seguro
 * - Publish/subscribe funcionais
 * - Filtros e predicados
 */

import { take, toArray } from 'rxjs/operators';
import { firstValueFrom } from 'rxjs';
import { ToolEventsService } from './tool-events.service';
import {
  ToolEvent,
  ToolEventType,
  ToolEventSeverity,
  createToolEvent,
  validateSafePayload,
  generateCorrelationId,
} from './tool-events.model';

describe('ToolEventsService', () => {
  let service: ToolEventsService;
  
  beforeEach(() => {
    // instantiate directly to avoid Angular TestBed dependency in this lib
    service = new ToolEventsService();
  });
  
  afterEach(() => {
    service.clearAllStreams();
  });
  
  describe('Namespacing por toolKey', () => {
    it('deve emitir evento no stream global', (done) => {
      const event = createToolEvent('tool-a', ToolEventType.LOADED);
      
      service.on().pipe(take(1)).subscribe(receivedEvent => {
        expect(receivedEvent.toolKey).toBe('tool-a');
        expect(receivedEvent.type).toBe(ToolEventType.LOADED);
        done();
      });
      
      service.emit(event);
    });
    
    it('deve isolar eventos por toolKey', (done) => {
      const eventA = createToolEvent('tool-a', ToolEventType.LOADED);
      const eventB = createToolEvent('tool-b', ToolEventType.LOADED);
      
      const receivedEvents: ToolEvent[] = [];
      
      service.onTool('tool-a').pipe(take(1)).subscribe(event => {
        receivedEvents.push(event);
        
        expect(receivedEvents.length).toBe(1);
        expect(receivedEvents[0].toolKey).toBe('tool-a');
        done();
      });
      
      service.emit(eventA);
      service.emit(eventB);
    });
    
    it('deve permitir múltiplas tools sem colisão', async () => {
      const promises = [
        firstValueFrom(service.onTool('tool-a').pipe(take(1))),
        firstValueFrom(service.onTool('tool-b').pipe(take(1))),
        firstValueFrom(service.onTool('tool-c').pipe(take(1))),
      ];
      
      service.emit(createToolEvent('tool-a', ToolEventType.LOADED));
      service.emit(createToolEvent('tool-b', ToolEventType.LOADED));
      service.emit(createToolEvent('tool-c', ToolEventType.LOADED));
      
      const events = await Promise.all(promises);
      
      expect(events[0].toolKey).toBe('tool-a');
      expect(events[1].toolKey).toBe('tool-b');
      expect(events[2].toolKey).toBe('tool-c');
    });
  });
  
  describe('Lifecycle helpers', () => {
    it('emitLoaded deve criar evento LOADED', (done) => {
      service.onTool('tool-test').pipe(take(1)).subscribe(event => {
        expect(event.type).toBe(ToolEventType.LOADED);
        expect(event.severity).toBe(ToolEventSeverity.INFO);
        expect(event.message).toContain('carregada');
        done();
      });
      
      service.emitLoaded('tool-test');
    });
    
    it('emitReady deve criar evento READY', (done) => {
      service.onTool('tool-test').pipe(take(1)).subscribe(event => {
        expect(event.type).toBe(ToolEventType.READY);
        expect(event.severity).toBe(ToolEventSeverity.INFO);
        expect(event.message).toContain('pronta');
        done();
      });
      
      service.emitReady('tool-test');
    });
    
    it('emitError deve criar evento ERROR com detalhes', (done) => {
      const error = new Error('Falha crítica');
      
      service.onTool('tool-test').pipe(take(1)).subscribe(event => {
        expect(event.type).toBe(ToolEventType.ERROR);
        expect(event.severity).toBe(ToolEventSeverity.ERROR);
        expect(event.data).toHaveProperty('errorMessage', 'Falha crítica');
        expect(event.data).toHaveProperty('errorName', 'Error');
        done();
      });
      
      service.emitError('tool-test', error);
    });
    
    it('emitContextChanged deve criar evento com contexto', (done) => {
      const context = {
        tenantId: 'tenant-123',
        clientId: 'client-456',
      };
      
      service.onTool('tool-test').pipe(take(1)).subscribe(event => {
        expect(event.type).toBe(ToolEventType.CONTEXT_CHANGED);
        expect(event.context).toEqual(context);
        done();
      });
      
      service.emitContextChanged('tool-test', context);
    });
    
    it('emitUnloaded deve criar evento UNLOADED', (done) => {
      service.onTool('tool-test').pipe(take(1)).subscribe(event => {
        expect(event.type).toBe(ToolEventType.UNLOADED);
        expect(event.severity).toBe(ToolEventSeverity.INFO);
        done();
      });
      
      service.emitUnloaded('tool-test');
    });
  });
  
  describe('Payload seguro', () => {
    it('validateSafePayload deve aceitar payloads seguros', () => {
      const safePayloads = [
        { documentId: '123', status: 'approved' },
        { count: 42, items: ['a', 'b'] },
        { metadata: { version: '1.0' } },
      ];
      
      safePayloads.forEach(payload => {
        expect(validateSafePayload(payload)).toBe(true);
      });
    });
    
    it('validateSafePayload deve rejeitar payloads com dados sensíveis', () => {
      const unsafePayloads = [
        { token: 'abc123' },
        { password: 'secret' },
        { accessToken: 'bearer xyz' },
        { apiKey: 'key-123' },
        { cpf: '123.456.789-00' },
      ];
      
      unsafePayloads.forEach(payload => {
        expect(validateSafePayload(payload)).toBe(false);
      });
    });
    
    it('deve lançar erro ao emitir evento com payload inseguro', () => {
      // Build an event object directly with forbidden payload so createToolEvent is not invoked
      const unsafeEvent = {
        type: ToolEventType.LOADED,
        toolKey: 'tool-test',
        timestamp: new Date().toISOString(),
        correlationId: generateCorrelationId(),
        severity: ToolEventSeverity.INFO,
        data: { token: 'unsafe' } as any,
      } as any;

      expect(() => {
        service.emit(unsafeEvent);
      }).toThrow();
    });
    
    it('createToolEvent deve bloquear payload inseguro', () => {
      expect(() => {
        createToolEvent('tool-test', ToolEventType.LOADED, {
          data: { password: 'secret123' } as any,
        });
      }).toThrow(/dados sensíveis/i);
    });
  });
  
  describe('Filtros e predicados', () => {
    it('deve filtrar eventos por tipo', async () => {
      const promise = firstValueFrom(
        service.on({ type: ToolEventType.ERROR }).pipe(take(1))
      );
      
      service.emit(createToolEvent('tool-test', ToolEventType.LOADED));
      service.emit(createToolEvent('tool-test', ToolEventType.ERROR));
      
      const event = await promise;
      expect(event.type).toBe(ToolEventType.ERROR);
    });
    
    it('deve filtrar eventos por toolKey', async () => {
      const promise = firstValueFrom(
        service.on({ toolKey: 'tool-b' }).pipe(take(1))
      );
      
      service.emit(createToolEvent('tool-a', ToolEventType.LOADED));
      service.emit(createToolEvent('tool-b', ToolEventType.LOADED));
      
      const event = await promise;
      expect(event.toolKey).toBe('tool-b');
    });
    
    it('deve filtrar eventos por severidade', async () => {
      const promise = firstValueFrom(
        service.on({ severity: ToolEventSeverity.ERROR }).pipe(take(1))
      );
      
      service.emit(
        createToolEvent('tool-test', ToolEventType.LOADED, {
          severity: ToolEventSeverity.INFO,
        })
      );
      service.emit(
        createToolEvent('tool-test', ToolEventType.ERROR, {
          severity: ToolEventSeverity.ERROR,
        })
      );
      
      const event = await promise;
      expect(event.severity).toBe(ToolEventSeverity.ERROR);
    });
    
    it('deve usar predicado customizado', async () => {
      const predicate = (event: ToolEvent) =>
        event.toolKey.startsWith('tool-') && event.severity === ToolEventSeverity.ERROR;
      
      const promise = firstValueFrom(service.on(predicate).pipe(take(1)));
      
      service.emit(
        createToolEvent('other-key', ToolEventType.ERROR, {
          severity: ToolEventSeverity.ERROR,
        })
      );
      service.emit(
        createToolEvent('tool-test', ToolEventType.ERROR, {
          severity: ToolEventSeverity.ERROR,
        })
      );
      
      const event = await promise;
      expect(event.toolKey).toBe('tool-test');
    });
  });
  
  describe('Correlação', () => {
    it('deve gerar correlationId único', () => {
      const id1 = generateCorrelationId();
      const id2 = generateCorrelationId();
      
      expect(id1).toBeTruthy();
      expect(id2).toBeTruthy();
      expect(id1).not.toBe(id2);
    });
    
    it('eventos devem ter correlationId', () => {
      const event = createToolEvent('tool-test', ToolEventType.LOADED);
      
      expect(event.correlationId).toBeTruthy();
      expect(typeof event.correlationId).toBe('string');
    });
  });
  
  describe('Limpeza de streams', () => {
    it('clearToolStream deve limpar stream específico', (done) => {
      let emitCount = 0;
      
      service.onTool('tool-test').subscribe(() => {
        emitCount++;
      });
      
      service.emit(createToolEvent('tool-test', ToolEventType.LOADED));
      
      setTimeout(() => {
        service.clearToolStream('tool-test');
        service.emit(createToolEvent('tool-test', ToolEventType.READY));
        
        setTimeout(() => {
          expect(emitCount).toBe(1);
          done();
        }, 50);
      }, 50);
    });
    
    it('clearAllStreams deve limpar todos os streams', () => {
      service.emit(createToolEvent('tool-a', ToolEventType.LOADED));
      service.emit(createToolEvent('tool-b', ToolEventType.LOADED));
      
      service.clearAllStreams();
      
      // Não deve haver erro ao limpar
      expect(() => service.clearAllStreams()).not.toThrow();
    });
  });
});

describe('ToolEvents Model', () => {
  describe('createToolEvent', () => {
    it('deve criar evento com valores padrão', () => {
      const event = createToolEvent('tool-test', ToolEventType.LOADED);
      
      expect(event.toolKey).toBe('tool-test');
      expect(event.type).toBe(ToolEventType.LOADED);
      expect(event.severity).toBe(ToolEventSeverity.INFO);
      expect(event.timestamp).toBeTruthy();
      expect(event.correlationId).toBeTruthy();
    });
    
    it('deve criar evento com opções customizadas', () => {
      const context = { tenantId: 'tenant-123' };
      const data = { documentId: 'doc-456' };
      
      const event = createToolEvent('tool-test', ToolEventType.CUSTOM, {
        data,
        context,
        severity: ToolEventSeverity.WARNING,
        message: 'Evento customizado',
      });
      
      expect(event.data).toEqual(data);
      expect(event.context).toEqual(context);
      expect(event.severity).toBe(ToolEventSeverity.WARNING);
      expect(event.message).toBe('Evento customizado');
    });
  });
});
