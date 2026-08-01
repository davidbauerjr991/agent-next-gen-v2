import type { Meta, StoryObj } from "@storybook/react";
import { ShellPage } from "../../ShellPage";

const meta: Meta<typeof ShellPage> = {
  title: "Templates/Shell",
  component: ShellPage,
  parameters: {
    layout: "fullscreen",
    backgrounds: { default: "lyra-shell" },
  },
};

export default meta;
type Story = StoryObj<typeof ShellPage>;

export const Default: Story = {
  name: "Shell",
  render: () => <ShellPage />,
};
