import type { Meta, StoryObj } from "@storybook/react";
import { AgentNextGenPage } from "../../AgentNextGenPage";

const meta: Meta<typeof AgentNextGenPage> = {
  title: "Templates/Agent Next Gen",
  component: AgentNextGenPage,
  parameters: {
    layout: "fullscreen",
    backgrounds: { default: "lyra-shell" },
  },
};

export default meta;
type Story = StoryObj<typeof AgentNextGenPage>;

export const Default: Story = {
  name: "Agent Next Gen",
  render: () => <AgentNextGenPage />,
};
