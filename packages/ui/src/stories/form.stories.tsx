import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useForm } from 'react-hook-form';

import {
  Button,
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
} from '@/index';

type ProfileValues = {
  name: string;
  email: string;
};

function ProfileFormPreview() {
  const form = useForm<ProfileValues>({
    defaultValues: {
      name: 'UI Platform',
      email: '',
    },
  });

  return (
    <Form {...form}>
      <form className="w-[420px] space-y-5">
        <FormField
          control={form.control}
          name="name"
          rules={{ required: 'Name is required.' }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="Shared UI" {...field} />
              </FormControl>
              <FormDescription>Used as the visible label in shared docs.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          rules={{
            required: 'Email is required.',
            pattern: {
              value: /\S+@\S+\.\S+/,
              message: 'Enter a valid email address.',
            },
          }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="team@example.com" {...field} />
              </FormControl>
              <FormDescription>Validation state is derived from react-hook-form.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-3">
          <Button type="button" onClick={() => form.trigger()}>
            Validate
          </Button>
          <Button type="button" variant="outline" onClick={() => form.reset()}>
            Reset
          </Button>
        </div>
      </form>
    </Form>
  );
}

const meta = {
  title: 'Forms/Form',
  component: FormItem,
  subcomponents: {
    FormField,
    FormLabel,
    FormControl,
    FormDescription,
    FormMessage,
  },
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'react-hook-form helpers that wire labels, descriptions, IDs, and validation messages into shared field layouts.',
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof FormItem>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => <ProfileFormPreview />,
};
