import * as React from 'react';
import type { Preview } from '@storybook/react-vite';

import '../src/styles/theme.css';
import { TooltipProvider } from '../src/components/ui/tooltip';

const preview: Preview = {
  globalTypes: {
    theme: {
      description: 'Global theme for components',
      defaultValue: 'light',
      toolbar: {
        title: 'Theme',
        icon: 'circlehollow',
        items: [
          { value: 'light', title: 'Light' },
          { value: 'dark', title: 'Dark' },
        ],
        dynamicTitle: true,
      },
    },
  },
  decorators: [
    (Story, context) => {
      const theme = context.globals.theme === 'dark' ? 'dark' : '';

      return React.createElement(
        TooltipProvider,
        { delayDuration: 0 },
        React.createElement(
          'div',
          { className: theme },
          React.createElement(
            'div',
            { className: 'bg-background text-foreground min-h-screen p-6' },
            React.createElement(Story),
          ),
        ),
      );
    },
  ],
  parameters: {
    layout: 'centered',
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
};

export default preview;
