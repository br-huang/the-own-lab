import type { Meta, StoryObj } from '@storybook/react-vite';

import {
  Badge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/index';

const meta = {
  title: 'Data/Table',
  component: Table,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof Table>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="w-[720px]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Component</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Stories</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell className="font-medium">Button</TableCell>
            <TableCell>Core</TableCell>
            <TableCell>
              <Badge>Ready</Badge>
            </TableCell>
            <TableCell className="text-right">3</TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-medium">Dialog</TableCell>
            <TableCell>Overlay</TableCell>
            <TableCell>
              <Badge variant="secondary">Ready</Badge>
            </TableCell>
            <TableCell className="text-right">1</TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-medium">Sidebar</TableCell>
            <TableCell>Navigation</TableCell>
            <TableCell>
              <Badge variant="outline">In Progress</Badge>
            </TableCell>
            <TableCell className="text-right">1</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  ),
};
