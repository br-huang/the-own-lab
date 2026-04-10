import type { Meta, StoryObj } from '@storybook/react-vite';

import {
  Badge,
  Card,
  CardContent,
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/index';

const meta = {
  title: 'Display/Carousel',
  component: Carousel,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Embla-based carousel primitives for horizontal or vertical content browsing with shared navigation controls.',
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Carousel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="w-[720px] px-12">
      <Carousel opts={{ align: 'start', loop: true }}>
        <CarouselContent>
          {['Core', 'Forms', 'Navigation', 'Charts'].map((group) => (
            <CarouselItem key={group} className="basis-1/2 lg:basis-1/3">
              <Card>
                <CardContent className="flex aspect-square flex-col items-start justify-between p-6">
                  <Badge variant="outline">{group}</Badge>
                  <p className="text-sm text-muted-foreground">
                    Preview reusable patterns in isolation before wiring them into an app.
                  </p>
                </CardContent>
              </Card>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>
    </div>
  ),
};
