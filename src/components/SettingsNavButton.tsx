// components/SettingsNavButton.tsx - component to be added to sidebar
export function SettingsNavButton({ collapsed = false }) {
  const router = useRouter();
  
  // Get user data from auth utils
  const userData = typeof window !== 'undefined' ? authUtils.getUserData() : null;
  const userInitial = userData?.username?.charAt(0) || userData?.email?.charAt(0) || '?';
  const userEmail = userData?.email || "User";
  const userName = userData?.username || userEmail.split('@')[0];
  
  return (
    <UnstyledButton 
      w="100%" 
      p="xs"
      onClick={() => router.push('/settings')}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        borderRadius: "8px",
        backgroundColor: "#1A1A1A",
        cursor: "pointer",
        marginTop: "auto",
        marginBottom: "8px",
        "&:hover": {
          backgroundColor: "#2A2A2A",
        }
      }}
    >
      <Avatar color="blue" radius="xl">
        {userInitial.toUpperCase()}
      </Avatar>
      
      {!collapsed && (
        <Box style={{ flex: 1, overflow: "hidden" }}>
          <Text size="sm" truncate fw={500}>
            {userName}
          </Text>
          <Text size="xs" c="dimmed" truncate>
            {userEmail}
          </Text>
        </Box>
      )}
      
      {!collapsed && (
        <ActionIcon variant="subtle" radius="xl">
          <Settings size={18} />
        </ActionIcon>
      )}
    </UnstyledButton>
  );
}