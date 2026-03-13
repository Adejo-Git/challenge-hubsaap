import { moduleMetadata, Meta, Story } from '@storybook/angular';
import { CommonModule } from '@angular/common';
import { TimelineComponent } from './timeline.component';
import { TimelineItem } from './timeline.model';

export default {
  title: 'Patterns/Timeline',
  component: TimelineComponent,
  decorators: [
    moduleMetadata({
      imports: [CommonModule],
      declarations: [TimelineComponent],
    }),
  ],
} as Meta;

const sample: TimelineItem[] = [
  { id: '1', timestamp: new Date().toISOString(), title: 'Created', description: 'Item created', actor: 'system', type: 'create' },
  { id: '2', timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(), title: 'Approved', description: 'Approved by user', actor: 'alice', type: 'approve' },
];

export const Default: Story = (args) => ({ props: args });
Default.args = { items: sample, groupBy: 'day' };

export const Empty = Default.bind({});
Empty.args = { items: [], state: 'empty' };

export const Loading = Default.bind({});
Loading.args = { items: [], state: 'loading' };

export const Error = Default.bind({});
Error.args = {
  items: [],
  state: 'error',
  error: { message: 'Falha ao carregar histórico', code: 'TIMELINE_LOAD_FAILED' },
};

export const LargeListVirtualized = Default.bind({});
LargeListVirtualized.args = {
  items: Array.from({ length: 300 }, (_value, index) => ({
    id: `e-${index}`,
    timestamp: new Date(Date.now() - index * 1000 * 60).toISOString(),
    title: `Evento ${index}`,
    description: `Descrição ${index}`,
    actor: index % 2 === 0 ? 'system' : 'alice',
    type: index % 3 === 0 ? 'create' : 'update',
    tags: index % 2 === 0 ? ['audit'] : ['decision'],
  })),
  groupBy: 'day',
  uiOptions: {
    enableVirtualScroll: true,
    virtualScrollMinItems: 50,
    virtualScrollItemSize: 72,
    virtualScrollHeightPx: 420,
    showAvatars: true,
    showTags: true,
  },
};
