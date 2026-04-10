import type { Meta, StoryObj } from '@storybook/react-vite';
import * as React from 'react';

import { Calendar } from '@/index';

const meta = {
  title: 'Forms/Calendar',
  component: Calendar,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Calendar primitive built on react-day-picker, styled with shared button tokens and selection states.',
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Calendar>;

export default meta;

type Story = StoryObj<typeof meta>;

function SingleSelectPreview() {
  const [date, setDate] = React.useState<Date | undefined>(new Date('2026-04-10'));

  return (
    <div className="rounded-lg border bg-background p-4 shadow-sm">
      <Calendar mode="single" selected={date} onSelect={setDate} className="rounded-md" />
    </div>
  );
}

function RangeSelectPreview() {
  const [range, setRange] = React.useState<{
    from?: Date;
    to?: Date;
  }>({
    from: new Date('2026-04-10'),
    to: new Date('2026-04-14'),
  });

  return (
    <div className="rounded-lg border bg-background p-4 shadow-sm">
      <Calendar
        mode="range"
        selected={range}
        onSelect={setRange}
        numberOfMonths={2}
        className="rounded-md"
      />
    </div>
  );
}

export const SingleDate: Story = {
  render: () => <SingleSelectPreview />,
};

export const DateRange: Story = {
  render: () => <RangeSelectPreview />,
};
