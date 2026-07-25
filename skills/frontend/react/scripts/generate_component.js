#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const options = {};
for (let i = 0; i < args.length; i++) {
  if (args[i].startsWith('--')) {
    const key = args[i].substring(2);
    const value = args[i + 1];
    if (value && !value.startsWith('--')) {
      options[key] = value;
      i++;
    } else {
      options[key] = true;
    }
  }
}

if (!options.name) {
  console.error('Error: Please provide a component name using --name');
  console.log('Usage: node generate_component.js --name ComponentName [--dir ./src/components]');
  process.exit(1);
}

const componentName = options.name;
const outputDir = path.resolve(process.cwd(), options.dir || componentName);

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const componentContent = `import React from 'react';

export interface ${componentName}Props {
  /** Add props here */
  className?: string;
}

export const ${componentName}: React.FC<${componentName}Props> = ({ className }) => {
  return (
    <div className={className}>
      ${componentName} component
    </div>
  );
};
`;

const testContent = `import React from 'react';
import { render, screen } from '@testing-library/react';
import { ${componentName} } from './${componentName}';

describe('${componentName}', () => {
  it('renders successfully', () => {
    render(<${componentName} />);
    expect(screen.getByText('${componentName} component')).toBeInTheDocument();
  });
});
`;

const storyContent = `import type { Meta, StoryObj } from '@storybook/react';
import { ${componentName} } from './${componentName}';

const meta: Meta<typeof ${componentName}> = {
  title: 'Components/${componentName}',
  component: ${componentName},
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof ${componentName}>;

export const Default: Story = {
  args: {},
};
`;

const indexContent = `export * from './${componentName}';
`;

const files = [
  { name: `${componentName}.tsx`, content: componentContent },
  { name: `${componentName}.test.tsx`, content: testContent },
  { name: `${componentName}.stories.tsx`, content: storyContent },
  { name: 'index.ts', content: indexContent },
];

files.forEach(file => {
  const filePath = path.join(outputDir, file.name);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, file.content, 'utf8');
    console.log(`✅ Created ${file.name} at ${filePath}`);
  } else {
    console.warn(`⚠️ Skipped ${file.name} (already exists)`);
  }
});

console.log(`🎉 Component ${componentName} generated successfully!`);
