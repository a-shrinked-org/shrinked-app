// src/components/layout/sider.tsx
import { Sider as RefineSider } from "@refinedev/mantine";
import { Box, Text } from "@mantine/core";
import { Menu } from "@components/menu";

export const Sider: React.FC = () => {
  return (
    <RefineSider>
      <Box>
        <Box p="md">
          <Text size="xl" fw={700}>My App</Text>
        </Box>
        <Menu />
      </Box>
    </RefineSider>
  );
};

// src/components/layout/index.tsx
import { Layout as RefineLayout } from "@refinedev/mantine";
import { Sider } from "./sider";

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <RefineLayout Header={() => null} Sider={Sider}>
      {children}
    </RefineLayout>
  );
};