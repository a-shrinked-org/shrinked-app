
import { Menu, Button, TextInput, Group } from '@mantine/core';
import { MoreHorizontal, RefreshCw, Edit, Trash2 } from 'lucide-react';
import { useDisclosure } from '@mantine/hooks';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { ConfirmationModal } from './shared/ConfirmationModal';

interface JobActionsMenuProps {
  jobId: string;
  jobName: string;
  onRegenerate: () => void;
  onRename: (newName: string) => void;
  onDelete: () => void;
  form: any;
}

export const JobActionsMenu: React.FC<JobActionsMenuProps> = ({
  jobId,
  jobName,
  onRegenerate,
  onRename,
  onDelete,
}) => {
  const [renameModalOpened, { open: openRenameModal, close: closeRenameModal }] = useDisclosure(false);
  const [deleteModalOpened, { open: openDeleteModal, close: closeDeleteModal }] = useDisclosure(false);
  const renameForm = useForm({ defaultValues: { newName: jobName } });

  const handleRename = (data: { newName: string }) => {
    onRename(data.newName);
    closeRenameModal();
  };

  return (
    <>
      <Menu shadow="md" width={200}>
        <Menu.Target>
          <Button variant="subtle" size="sm">
            <MoreHorizontal size={16} />
          </Button>
        </Menu.Target>

        <Menu.Dropdown>
          <Menu.Item leftSection={<RefreshCw size={14} />} onClick={onRegenerate}>
            Regenerate
          </Menu.Item>
          <Menu.Item leftSection={<Edit size={14} />} onClick={openRenameModal}>
            Rename
          </Menu.Item>
          <Menu.Divider />
          <Menu.Item color="red" leftSection={<Trash2 size={14} />} onClick={openDeleteModal}>
            Delete
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>

      <ConfirmationModal
        opened={renameModalOpened}
        onClose={closeRenameModal}
        onConfirm={renameForm.handleSubmit(handleRename)}
        title="Rename Job"
        confirmText="Save"
        confirmColor="blue"
        form={renameForm}
      >
        <TextInput
          label="New Job Name"
          {...renameForm.register('newName')}
          required
        />
      </ConfirmationModal>

      <ConfirmationModal
        opened={deleteModalOpened}
        onClose={closeDeleteModal}
        onConfirm={onDelete}
        title="Delete Job"
        message="Are you sure you want to delete this job? This action cannot be undone."
        confirmText="Delete"
      />
    </>
  );
};
