export * from './lib/error.model';
export * from './lib/error.mappers';
export * from './lib/error.util';

// Nota: este arquivo é o entrypoint público da lib. O pacote raiz deve
// re-exportar a partir daqui (ex.: libs/shared/error-model/index.ts -> ./src/index).
