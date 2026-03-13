import { moduleMetadata } from '@storybook/angular';

import { SmartTableComponent } from './smart-table.component';
import { SmartTableLocalDataProvider } from './providers/local.provider';
import { SmartTableRemoteDataProvider } from './providers/remote.provider';

interface StoryRow {
  id: string;
  name: string;
  status: string;
  score: number;
}

const demoRows: StoryRow[] = [
  { id: '1', name: 'Registro A', status: 'ok', score: 96 },
  { id: '2', name: 'Registro B', status: 'pending', score: 78 },
  { id: '3', name: 'Registro C', status: 'blocked', score: 35 },
  { id: '4', name: 'Registro D', status: 'ok', score: 88 },
];

const columns = [
  { key: 'name', title: 'Nome', sortable: true, filterable: true },
  { key: 'status', title: 'Status', filterable: true },
  { key: 'score', title: 'Score', sortable: true },
];

export default {
  title: 'Patterns/SmartTable',
  decorators: [
    moduleMetadata({
      imports: [SmartTableComponent],
    }),
  ],
};

export const LocalDataset = {
  render: () => ({
    props: {
      columns,
      dataProvider: new SmartTableLocalDataProvider(demoRows),
      rowKey: 'id',
      selectionMode: 'none',
      layoutOptions: { stickyHeader: true, zebra: true },
    },
    template: `
      <hub-smart-table
        [columns]="columns"
        [dataProvider]="dataProvider"
        [rowKey]="rowKey"
        [selectionMode]="selectionMode"
        [layoutOptions]="layoutOptions"
      ></hub-smart-table>
    `,
  }),
};

export const RemoteSimulation = {
  render: () => ({
    props: {
      columns,
      dataProvider: new SmartTableRemoteDataProvider<StoryRow>((queryState) => {
        const start = (queryState.page - 1) * queryState.pageSize;
        const end = start + queryState.pageSize;
        return new Promise<{ rows: StoryRow[]; total: number }>((resolve) => {
          setTimeout(() => {
            resolve({
              rows: demoRows.slice(start, end),
              total: demoRows.length,
            });
          }, 400);
        });
      }),
      rowKey: 'id',
      selectionMode: 'none',
      initialState: { pageSize: 2 },
    },
    template: `
      <hub-smart-table
        [columns]="columns"
        [dataProvider]="dataProvider"
        [rowKey]="rowKey"
        [selectionMode]="selectionMode"
        [initialState]="initialState"
      ></hub-smart-table>
    `,
  }),
};

export const SelectionAndBulk = {
  render: () => ({
    props: {
      columns,
      dataProvider: new SmartTableLocalDataProvider(demoRows),
      rowKey: 'id',
      selectionMode: 'multi',
      selectionOptions: {
        mode: 'multi',
        selectAllMatching: true,
      },
      actions: {
        bulk: [
          { id: 'approve', label: 'Aprovar seleção' },
          { id: 'archive', label: 'Arquivar seleção' },
        ],
        row: [{ id: 'open', label: 'Abrir' }],
      },
    },
    template: `
      <hub-smart-table
        [columns]="columns"
        [dataProvider]="dataProvider"
        [rowKey]="rowKey"
        [selectionMode]="selectionMode"
        [selectionOptions]="selectionOptions"
        [actions]="actions"
      ></hub-smart-table>
    `,
  }),
};
