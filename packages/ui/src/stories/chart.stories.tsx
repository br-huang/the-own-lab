import type { Meta, StoryObj } from '@storybook/react-vite';
import { Bar, BarChart, XAxis, YAxis } from 'recharts';

import {
  type ChartConfig,
  ChartContainer,
  ChartGrid,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '@/index';

const chartData = [
  { month: 'Jan', stories: 4, components: 12 },
  { month: 'Feb', stories: 9, components: 24 },
  { month: 'Mar', stories: 18, components: 39 },
  { month: 'Apr', stories: 26, components: 46 },
];

const chartConfig = {
  stories: {
    label: 'Stories',
    color: 'var(--color-chart-1)',
  },
  components: {
    label: 'Components',
    color: 'var(--color-chart-2)',
  },
} satisfies ChartConfig;

const meta = {
  title: 'Data/Chart',
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const BarOverview: Story = {
  render: () => (
    <div className="w-[760px] rounded-lg border p-4">
      <ChartContainer config={chartConfig} className="min-h-[320px] w-full">
        <BarChart data={chartData}>
          <ChartGrid vertical={false} />
          <XAxis dataKey="month" tickLine={false} axisLine={false} />
          <YAxis tickLine={false} axisLine={false} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <ChartLegend content={<ChartLegendContent />} />
          <Bar dataKey="components" fill="var(--color-components)" radius={6} />
          <Bar dataKey="stories" fill="var(--color-stories)" radius={6} />
        </BarChart>
      </ChartContainer>
    </div>
  ),
};
