import type { Meta, StoryObj } from '@storybook/react-vite';
import { AlignLeftIcon, AlignCenterIcon, AlignRightIcon, BoldIcon, ItalicIcon } from 'lucide-react';

import { Toggle, ToggleGroup, ToggleGroupItem } from '@/index';

const meta = {
  title: 'Forms/Toggle',
  component: Toggle,
  subcomponents: { ToggleGroup },
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Pressed-state controls for binary actions and grouped formatting or view preferences.',
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Toggle>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    'aria-label': 'Toggle bold',
    pressed: true,
    children: <BoldIcon />,
  },
};

export const GroupedFormatting: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <ToggleGroup type="multiple" defaultValue={['bold', 'left']}>
        <ToggleGroupItem value="bold" aria-label="Toggle bold">
          <BoldIcon />
        </ToggleGroupItem>
        <ToggleGroupItem value="italic" aria-label="Toggle italic">
          <ItalicIcon />
        </ToggleGroupItem>
      </ToggleGroup>

      <ToggleGroup type="single" defaultValue="left">
        <ToggleGroupItem value="left" aria-label="Align left">
          <AlignLeftIcon />
        </ToggleGroupItem>
        <ToggleGroupItem value="center" aria-label="Align center">
          <AlignCenterIcon />
        </ToggleGroupItem>
        <ToggleGroupItem value="right" aria-label="Align right">
          <AlignRightIcon />
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  ),
};
