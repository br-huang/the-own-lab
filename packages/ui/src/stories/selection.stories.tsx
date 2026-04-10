import type { Meta, StoryObj } from '@storybook/react-vite';

import {
  Checkbox,
  DatePicker,
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
  Label,
  RadioGroup,
  RadioGroupItem,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Slider,
  Switch,
} from '@/index';

const meta = {
  title: 'Forms/Selection',
  component: DatePicker,
  subcomponents: {
    Checkbox,
    RadioGroup,
    Select,
    Slider,
    Switch,
    InputOTP,
  },
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Selection and choice controls for dates, toggles, ranges, radio choices, and one-time passwords.',
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof DatePicker>;

export default meta;

type Story = StoryObj<typeof meta>;

export const ChoiceControls: Story = {
  render: () => (
    <div className="grid w-[480px] gap-6 md:grid-cols-2">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Checkbox id="analytics" defaultChecked />
          <Label htmlFor="analytics">Enable analytics</Label>
        </div>
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div className="space-y-1">
            <Label htmlFor="dark-mode">Dark mode</Label>
            <p className="text-muted-foreground text-sm">
              Match the shared theme preview.
            </p>
          </div>
          <Switch id="dark-mode" defaultChecked />
        </div>
        <RadioGroup defaultValue="team" className="gap-3">
          <div className="flex items-center gap-3">
            <RadioGroupItem value="team" id="team" />
            <Label htmlFor="team">Team workspace</Label>
          </div>
          <div className="flex items-center gap-3">
            <RadioGroupItem value="personal" id="personal" />
            <Label htmlFor="personal">Personal workspace</Label>
          </div>
        </RadioGroup>
      </div>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Default project</Label>
          <Select defaultValue="ui">
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select project" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ui">UI</SelectItem>
              <SelectItem value="browser">Browser</SelectItem>
              <SelectItem value="own-lab">The Own Lab</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Release confidence</Label>
          <Slider defaultValue={[72]} max={100} step={1} />
        </div>
      </div>
    </div>
  ),
};

export const DateAndOtp: Story = {
  render: () => (
    <div className="w-[420px] space-y-6">
      <div className="space-y-2">
        <Label>Release date</Label>
        <DatePicker value={new Date('2026-04-10')} />
      </div>
      <div className="space-y-2">
        <Label>Verification code</Label>
        <InputOTP maxLength={6} defaultValue="24">
          <InputOTPGroup>
            <InputOTPSlot index={0} />
            <InputOTPSlot index={1} />
            <InputOTPSlot index={2} />
          </InputOTPGroup>
          <InputOTPSeparator />
          <InputOTPGroup>
            <InputOTPSlot index={3} />
            <InputOTPSlot index={4} />
            <InputOTPSlot index={5} />
          </InputOTPGroup>
        </InputOTP>
      </div>
    </div>
  ),
};
