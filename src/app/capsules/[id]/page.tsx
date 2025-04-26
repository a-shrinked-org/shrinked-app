"use client";

import React, { useState, useCallback, useEffect } from "react";
import { useNavigation, useShow, useGetIdentity } from "@refinedev/core";
import {
  Text,
  Box,
  Group,
  Button,
  LoadingOverlay,
  ActionIcon,
  Badge,
  Alert,
  Flex,
  Stack,
  Title,
  // Divider // Not used, removed
} from '@mantine/core';
import {
  ArrowLeft,
  RefreshCw,
  Download,
  Plus,
  Trash,
  AlertCircle,
  FileText,
  File
} from 'lucide-react';
import { useParams } from "next/navigation";
import { useAuth } from "@/utils/authUtils";
import DocumentMarkdownWrapper from "@/components/DocumentMarkdownWrapper"; // Ensure path is correct
import { GeistMono } from 'geist/font/mono';
import FileSelector from '@/components/FileSelector'; // Ensure path is correct

interface Identity {
  token?: string;
  email?: string;
  name?: string;
  id?: string; // User ID from identity
}

interface FileData { // Renamed from File to avoid conflict with Lucide icon
  _id: string;
  title: string;
  createdAt: string;
  // Add other relevant fields if needed
}

interface Capsule {
  _id: string;
  name: string;
  slug: string;
  files: FileData[]; // Use FileData type
  fileIds?: string[];
  userId: string; // User ID owning the capsule
  output?: {
    title?: string;
    abstract?: string;
    content?: string;
    references?: Array<{ item: string }>;
  };
  updatedAt: string;
  createdAt: string;
  status: string;
  summaryContext?: string;
  highlights?: Array<{
    xml: string;
  }>;
}

export default function CapsuleView() {
  const params = useParams();
  const { list } = useNavigation();
  // Ensure capsuleId is extracted correctly, even if params.id is an array
  const capsuleId = params?.id ? (Array.isArray(params.id) ? params.id[0] : params.id) : "";

  const { data: identity } = useGetIdentity<Identity>(); // No refetch needed here typically

  const { handleAuthError, fetchWithAuth, ensureValidToken } = useAuth();

  const { queryResult } = useShow<Capsule>({
    // Let data provider handle URL construction
    resource: "capsules", // Tell Refine the resource type
    id: capsuleId,       // Provide the ID
    // meta: { ... } // No meta override needed here anymore
    queryOptions: {
      enabled: !!capsuleId && !!identity?.token, // Only run if ID and token exist
      staleTime: 30000, // Cache for 30s
      retry: 1, // Retry once on error
      refetchInterval: (query) => {
          // Check query.state.data instead of the deprecated argument
          const currentStatus = query?.state?.data?.data?.status;
          return currentStatus === 'PROCESSING' ? 5000 : false; // Poll every 5s if processing
      },
      onSuccess: (data) => {
        // console.log("[CapsuleView] Capsule data loaded:", data?.data);
        if (data?.data?.status === 'COMPLETED' && isRegenerating) {
          setIsRegenerating(false); // Stop regeneration loading state
        }
        // Trigger file detail fetching if needed
        if (data?.data?.fileIds && (!data.data.files || data.data.files.length === 0)) {
            // Check if details aren't already being loaded or haven't loaded yet
            if (!isLoadingFiles && loadedFiles.length === 0) {
                fetchFileDetails(data.data.fileIds);
            }
        }
      },
      onError: (error) => {
        console.error("[CapsuleView] Error loading capsule:", error);
        handleAuthError(error); // Use central error handler
        const message = error.statusCode === 404
          ? "Capsule not found. It may have been deleted or the ID is incorrect."
          : "Failed to load capsule details: " + (error.message || "Please try again.");
        setErrorMessage(message);
      }
    },
  });

  const { data: capsuleData, isLoading, isError, refetch } = queryResult;
  const record = capsuleData?.data; // Access the actual capsule data

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isFileSelectorOpen, setIsFileSelectorOpen] = useState(false);
  const [isAddingFiles, setIsAddingFiles] = useState(false);
  const [addedFileIds, setAddedFileIds] = useState<string[]>([]); // Track recently added files for highlight
  const [loadedFiles, setLoadedFiles] = useState<FileData[]>([]); // State for fetched file details
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null); // Track which file delete is confirming

  // Fetch file details if only fileIds are present
  const fetchFileDetails = useCallback(async (fileIds: string[]) => {
    // Ensure user ID is available from identity before fetching
    const userId = identity?.id;
    if (!fileIds || fileIds.length === 0 || !userId) {
        console.warn("[CapsuleView] Cannot fetch file details: Missing file IDs or user ID.", {fileIdsCount: fileIds?.length, userId});
        return;
    }

    setIsLoadingFiles(true);
    console.log(`[CapsuleView] Fetching details for ${fileIds.length} files for user ${userId}`);

    try {
      // Assuming you have a proxy at /api/documents-proxy
      const fields = '_id,title,status,createdAt,output.title'; // Define needed fields
      const idsParam = fileIds.join(',');
      // Use fetchWithAuth which handles the token
      const response = await fetchWithAuth(`/api/documents-proxy?userId=${userId}&ids=${idsParam}&fields=${fields}`);

      if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to fetch file details: ${response.status} - ${errorText}`);
      }

      const filesData = await response.json();

      if (filesData && Array.isArray(filesData)) {
        const processedFiles = filesData.map((file: any) => ({
          _id: file._id,
          title: file.output?.title || file.title || `File ${file._id.slice(-6)}`, // Provide fallback title
          createdAt: file.createdAt || new Date().toISOString(), // Provide fallback date
        }));
        setLoadedFiles(processedFiles);
        // console.log("[CapsuleView] Successfully loaded file details:", processedFiles);
      } else {
         console.warn("[CapsuleView] File details response was not an array:", filesData);
         throw new Error("Invalid data format received for file details");
      }

    } catch (error: any) {
      console.error("[CapsuleView] Failed to fetch file details:", error);
      // Create placeholders as a fallback on any error during fetch
       console.log("[CapsuleView] Creating placeholder files due to fetch error.");
       const placeholders = fileIds.map(id => ({
          _id: id,
          title: `File ${id.slice(-6)}`,
          createdAt: new Date().toISOString()
       }));
       setLoadedFiles(placeholders);
       // setErrorMessage("Could not load full file details."); // Optionally inform user
    } finally {
      setIsLoadingFiles(false);
    }
  }, [identity?.id, fetchWithAuth]); // Depend only on identity.id and fetchWithAuth

  // Trigger initial fetch if needed (corrected dependency array)
  useEffect(() => {
      // Only fetch if we have fileIds, don't have embedded files, and haven't loaded files yet
      if (record?.fileIds && (!record.files || record.files.length === 0) && loadedFiles.length === 0 && !isLoadingFiles) {
          fetchFileDetails(record.fileIds);
      }
  // Rerun when record.fileIds changes, or if loading finishes and files are still needed
  }, [record?.fileIds, record?.files, loadedFiles.length, isLoadingFiles, fetchFileDetails]);


  // Simplified function to extract summary
  const extractContextSummary = (summaryContext?: string): string | null => {
    if (!summaryContext) return null;
    const summaryMatch = summaryContext.match(/<summary>([\s\S]*?)<\/summary>/);
    return summaryMatch?.[1]?.trim() ?? summaryContext.trim(); // Return content or trimmed original
  };


  const handleRegenerateCapsule = useCallback(async () => {
    if (!capsuleId) return;

    setIsRegenerating(true);
    setErrorMessage(null);

    try {
      console.log(`[CapsuleView] Regenerating capsule: ${capsuleId}`);
      // Use fetchWithAuth to handle token and call the correct proxy
      const response = await fetchWithAuth(`/api/capsules-proxy/${capsuleId}/regenerate`, { // Use proxy
        method: 'POST', // Often regeneration is a POST, adjust if backend expects GET
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Unknown error" }));
        throw new Error(errorData.message || `Failed to trigger regeneration: ${response.status}`);
      }

      console.log("[CapsuleView] Regenerate request sent successfully.");
      // Refresh data after a short delay to allow processing status to update
      setTimeout(() => refetch(), 1500);

    } catch (error: any) {
      console.error("[CapsuleView] Failed to regenerate capsule:", error);
      setErrorMessage(error.message || "Failed to start regeneration.");
      setIsRegenerating(false); // Ensure loading state stops on error
    }
     // Note: isRegenerating state will be turned off by onSuccess when status changes from PROCESSING to COMPLETED
  }, [capsuleId, fetchWithAuth, refetch]);


  const handleAddFile = useCallback(() => {
    setIsFileSelectorOpen(true);
  }, []);


  const handleFileSelect = useCallback(async (fileIds: string[]) => {
    if (!capsuleId || fileIds.length === 0) return;

    setIsAddingFiles(true);
    setErrorMessage(null);
    setAddedFileIds([]); // Clear previous highlights

    try {
      console.log(`[CapsuleView] Adding ${fileIds.length} files to capsule ${capsuleId}`);

      // Use fetchWithAuth to add files via the proxy
      const response = await fetchWithAuth(`/api/capsules-proxy/${capsuleId}/files`, { // Use proxy
        method: 'POST',
        body: JSON.stringify({ fileIds }), // fetchWithAuth adds headers
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Unknown error" }));
        throw new Error(errorData.message || `Failed to add files: ${response.status}`);
      }

      // Success
      setAddedFileIds(fileIds); // Highlight newly added files
      console.log("[CapsuleView] Files added successfully via proxy.");
      refetch(); // Update capsule data (which should include new fileIds)

      // Automatically trigger regeneration after adding files
      await handleRegenerateCapsule();

    } catch (error: any) {
      console.error("[CapsuleView] Failed to add files:", error);
      setErrorMessage(error.message || "An error occurred while adding files.");
      handleAuthError(error); // Pass to central handler too
    } finally {
      setIsAddingFiles(false);
      setIsFileSelectorOpen(false);
    }
  }, [capsuleId, fetchWithAuth, refetch, handleRegenerateCapsule, handleAuthError]); // Added handleAuthError


  const handleRemoveFile = useCallback(async (fileIdToRemove: string) => {
    if (!capsuleId || !fileIdToRemove) return;

    // Determine current files for optimistic update check later
    const currentFiles = record?.files || loadedFiles;
    const remainingFileCount = currentFiles.filter(f => f._id !== fileIdToRemove).length;

    setShowDeleteConfirm(null); // Hide confirmation immediately
    setErrorMessage(null);

    try {
      console.log(`[CapsuleView] Removing file ${fileIdToRemove} from capsule ${capsuleId}`);
      // Use fetchWithAuth for the DELETE request via proxy
      const response = await fetchWithAuth(`/api/capsules-proxy/${capsuleId}/files/${fileIdToRemove}`, { // Use proxy
        method: 'DELETE',
      });

      // Check for success (200 OK or 204 No Content)
      if (!response.ok && response.status !== 204) {
        const errorData = await response.json().catch(() => ({ message: "Unknown error" }));
        throw new Error(errorData.message || `Failed to remove file: ${response.status}`);
      }

      console.log("[CapsuleView] File removed successfully via proxy.");
      // Clear locally loaded files state if the deleted file was in there
      setLoadedFiles(prev => prev.filter(f => f._id !== fileIdToRemove));
      refetch(); // Refresh data to update capsule's fileIds list

      // Regenerate only if files remain
      if (remainingFileCount > 0) {
        console.log("[CapsuleView] Files remain, triggering regeneration.");
        await handleRegenerateCapsule();
      } else {
         console.log("[CapsuleView] No files remain, skipping regeneration.");
         // Potentially clear the summary context if last file removed?
         // Depends on desired behavior.
      }

    } catch (error: any) {
      console.error("[CapsuleView] Failed to remove file:", error);
      setErrorMessage(error.message || "An error occurred while removing the file.");
      handleAuthError(error); // Pass to central handler
    }
  }, [capsuleId, fetchWithAuth, refetch, handleRegenerateCapsule, record?.files, loadedFiles, handleAuthError]); // Added handleAuthError


  const handleDownloadMarkdown = useCallback(() => {
    const summary = extractContextSummary(record?.summaryContext);
    if (!summary || !record) return;

    try {
      console.log("[CapsuleView] Preparing markdown download");
      const blob = new Blob([summary], { type: 'text/markdown;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${record.slug || record.name || 'capsule'}.md`; // Use slug or name for filename
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("[CapsuleView] Failed to download markdown:", error);
      setErrorMessage("Could not prepare download.");
    }
  }, [record]);

  const handleBackToList = useCallback(() => {
    list("capsules"); // Navigate back to the capsules list view
  }, [list]);

  // Helper to format date strings
  const formatDate = (dateString?: string): string => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric'
      });
    } catch (e) {
      return dateString; // Return original if parsing fails
    }
  };

  // --- Render Logic ---

  if (isLoading) {
    return (
      <Box p="md" style={{ position: 'relative', minHeight: '300px' }}>
        <LoadingOverlay visible={true} overlayProps={{ blur: 2 }} />
      </Box>
    );
  }

  if (isError || !record) {
    return (
      <Box p="md">
        <Alert
          color="red"
          title="Error Loading Capsule"
          icon={<AlertCircle size={16} />}
          mb="md"
        >
          {errorMessage || "Could not load capsule details. Please check the ID or try again."}
        </Alert>
        <Button onClick={handleBackToList} leftSection={<ArrowLeft size={16} />}>
          Back to Capsules List
        </Button>
      </Box>
    );
  }

  // Determine which files to display (prefer record.files if available)
  const displayFiles = record.files && record.files.length > 0 ? record.files : loadedFiles;
  const hasFiles = displayFiles.length > 0;
  const isProcessing = record.status === 'PROCESSING' || isRegenerating; // Combine processing/regenerating states

  const contextSummary = extractContextSummary(record.summaryContext);
  const hasContextSummary = !!contextSummary;

  return (
    // Main container styling
    <Box style={{ backgroundColor: '#0a0a0a', minHeight: '100vh', padding: '24px' }}>
      {/* Header Section */}
      <Group mb="xl" justify="space-between" align="center">
        {/* Left Header: Back button, Title, Status */}
        <Group align="center">
          <ActionIcon size="lg" variant="subtle" onClick={handleBackToList} style={{ color: '#a0a0a0' }}>
            <ArrowLeft size={20} />
          </ActionIcon>
          <Title order={3} style={{ fontFamily: GeistMono.style.fontFamily, letterSpacing: '0.5px', color: '#ffffff' }}>
            {record.name || "Unnamed Capsule"}
          </Title>
          <Badge
             variant="filled"
             color={
               record.status === 'COMPLETED' ? 'green' :
               record.status === 'PROCESSING' ? 'yellow' :
               record.status === 'PENDING' ? 'blue' :
               record.status === 'FAILED' ? 'red' :
               'gray'
             }
             style={{ textTransform: 'uppercase', marginLeft: '8px' }}
           >
            {record.status || 'Unknown'}
          </Badge>
        </Group>

        {/* Right Header: Action Buttons */}
        <Group>
          <Button
            variant="default"
            leftSection={<Plus size={16} />}
            onClick={handleAddFile}
            loading={isAddingFiles}
            disabled={isProcessing} // Disable if processing/regenerating
            styles={{ root: { borderColor: '#2b2b2b', color: '#ffffff', '&:hover': { backgroundColor: '#2b2b2b' }}}}
          >
            Add Files
          </Button>
          <Button
            variant="default"
            leftSection={<RefreshCw size={16} />}
            onClick={handleRegenerateCapsule}
            loading={isProcessing} // Show loading if processing/regenerating
            disabled={!hasFiles || isAddingFiles} // Disable if no files or adding files
             styles={{ root: { borderColor: '#2b2b2b', color: '#ffffff', '&:hover': { backgroundColor: '#2b2b2b' }}}}
          >
            {isProcessing ? 'Processing...' : 'Regenerate'}
          </Button>
          <Button
            variant="default"
            leftSection={<Download size={16} />}
            onClick={handleDownloadMarkdown}
            disabled={!hasContextSummary || isProcessing} // Disable if no summary or processing
             styles={{ root: { borderColor: '#2b2b2b', color: '#ffffff', '&:hover': { backgroundColor: '#2b2b2b' }}}}
          >
            Download MD
          </Button>
        </Group>
      </Group>

      {/* General Error Alert */}
      {errorMessage && (
        <Alert color="red" title="Action Required" mb="md" icon={<AlertCircle size={16} />} withCloseButton onClose={() => setErrorMessage(null)}>
          {errorMessage}
        </Alert>
      )}

      {/* Main Content Layout */}
      <Flex gap="xl">
        {/* Left Panel: Source Files */}
        <Box
          w={330} // Fixed width for file list
          style={{ backgroundColor: '#131313', padding: '16px', borderRadius: '8px', border: '1px solid #2b2b2b' }}
        >
          <Title order={4} mb="md" ta="center" style={{ fontFamily: GeistMono.style.fontFamily, letterSpacing: '0.5px', color: '#a0a0a0' }}>
            SOURCE FILES
          </Title>

          {/* File List or Placeholder */}
          {hasFiles ? (
            <Stack gap="sm" style={{ maxHeight: 'calc(100vh - 280px)', overflowY: 'auto' }}>
              {displayFiles.map((file) => (
                <Box
                  key={file._id}
                  style={{
                    backgroundColor: '#1a1a1a',
                    borderRadius: '6px',
                    border: addedFileIds.includes(file._id) ? '1px solid #F5A623' : '1px solid #2b2b2b', // Highlight recently added
                    overflow: 'hidden',
                    transition: 'border-color 0.3s ease'
                  }}
                >
                  {/* File Header: Title and Delete Button */}
                  <Group justify="space-between" p="sm" style={{ borderBottom: showDeleteConfirm === file._id ? '1px solid #333' : 'none' }}>
                     <Group gap="xs" align="center">
                        <File size={16} style={{ opacity: 0.6, color: '#a0a0a0', flexShrink: 0 }} />
                        <Text size="sm" lineClamp={1} title={file.title} style={{ maxWidth: '180px', color: '#e0e0e0' }}>
                            {file.title}
                        </Text>
                    </Group>
                    {showDeleteConfirm !== file._id && (
                      <ActionIcon
                        color="red"
                        variant="subtle"
                        onClick={() => setShowDeleteConfirm(file._id)}
                        disabled={isProcessing}
                        title={'Remove file'}
                      >
                        <Trash size={16} />
                      </ActionIcon>
                    )}
                  </Group>

                  {/* Delete Confirmation */}
                  {showDeleteConfirm === file._id && (
                    <Box p="xs" style={{ backgroundColor: '#2a2a2a' }}>
                       <Group justify="space-between" gap="xs">
                          <Text size="xs" c="dimmed">Delete file?</Text>
                          <Group gap="xs">
                            <Button size="xs" variant="outline" color="gray" onClick={() => setShowDeleteConfirm(null)}>Cancel</Button>
                            <Button size="xs" color="red" onClick={() => handleRemoveFile(file._id)} loading={isProcessing}>Delete</Button> { /* Add loading state */}
                          </Group>
                       </Group>
                    </Box>
                  )}

                   {/* File Footer: Date (only show if not confirming delete) */}
                   {showDeleteConfirm !== file._id && (
                     <Box p="xs" style={{ backgroundColor: '#151515', borderTop: '1px solid #2b2b2b' }}>
                         <Text size="xs" c="dimmed" ta="right">
                             {formatDate(file.createdAt)}
                         </Text>
                     </Box>
                   )}
                </Box>
              ))}
            </Stack>
          ) : isLoadingFiles ? (
             // Show loading specifically for files if they are being fetched
             <Box style={{ padding: '20px', textAlign: 'center' }}>
                 <LoadingOverlay visible={true} overlayProps={{ blur: 1 }} loaderProps={{size: 'sm'}} />
                 <Text size="sm" c="dimmed">Loading file details...</Text>
             </Box>
          ) : (
            // Placeholder when no files are added
            <Alert color="dark" variant="outline" title="No Files Added" icon={<FileText size={16}/>} style={{borderColor: '#2b2b2b'}}>
              Add source documents to your capsule using the button below.
            </Alert>
          )}

          {/* Add Files Button (at bottom of panel) */}
          <Button
            fullWidth
            mt="md"
            leftSection={<Plus size={16} />}
            onClick={handleAddFile}
            disabled={isProcessing}
            loading={isAddingFiles}
            styles={{ root: { backgroundColor: '#F5A623', color: '#000000', '&:hover': { backgroundColor: '#E09612' }}}}
          >
            Add Files
          </Button>
        </Box>

        {/* Right Panel: Context Summary */}
        <Box style={{ flex: 1 }}>
          {/* Context Header */}
           <Box style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '10px', borderBottom: '1px solid #2b2b2b', paddingBottom: '10px', color: '#F5A623' }}>
              Capsule Context
           </Box>

          {/* Context Content Area */}
          <Box style={{ backgroundColor: '#131313', minHeight: 'calc(100vh - 250px)', maxHeight: 'calc(100vh - 250px)', overflowY: 'auto', border: '1px solid #2b2b2b', borderRadius: '8px', padding: '20px', position: 'relative' /* Needed for LoadingOverlay */ }}>
            {isProcessing ? (
                 // Loading state while processing/regenerating
                 <Stack align="center" justify="center" style={{ height: '100%', color: '#a0a0a0', minHeight: '200px' /* Ensure stack has height */ }}>
                    <LoadingOverlay visible={true} overlayProps={{ blur: 1, color: '#131313', opacity: 0.6 }} loaderProps={{ color: 'orange', type: 'dots' }} />
                    <Text mb="md" fw={600} size="lg" style={{ color: '#e0e0e0', zIndex: 1 /* Ensure text is above overlay */ }}>Generating context...</Text>
                    <Text ta="center" c="dimmed" mb="md" style={{zIndex: 1}}>
                       Analyzing files and creating the capsule summary. This might take a moment.
                    </Text>
                 </Stack>
            ) : hasContextSummary ? (
                // Display generated context
                <DocumentMarkdownWrapper markdown={contextSummary} />
            ) : hasFiles ? (
                 // State when files are present but no summary yet (needs regeneration)
                <Stack align="center" justify="center" style={{ height: '100%', color: '#a0a0a0', padding: '20px', minHeight: '200px' }}>
                    <FileText size={48} style={{ opacity: 0.3, marginBottom: '20px' }} />
                    <Text mb="md" fw={600} size="lg" style={{ color: '#e0e0e0' }}>Ready to Generate</Text>
                    <Text ta="center" c="dimmed" mb="xl">
                        Click the "Regenerate" button to analyze the added files and create the context summary.
                    </Text>
                    <Button
                      leftSection={<RefreshCw size={16} />}
                      onClick={handleRegenerateCapsule}
                      styles={{ root: { backgroundColor: '#F5A623', color: '#000000', '&:hover': { backgroundColor: '#E09612' }}}}
                      loading={isProcessing} // Show loading state here too
                    >
                      Generate Summary
                    </Button>
                </Stack>
            ) : (
                 // State when no files and no summary (needs files added)
                 <Stack align="center" justify="center" style={{ height: '100%', color: '#a0a0a0', padding: '20px', minHeight: '200px' }}>
                    <FileText size={48} style={{ opacity: 0.3, marginBottom: '20px' }} />
                    <Text mb="md" fw={600} size="lg" style={{ color: '#e0e0e0' }}>No Content Yet</Text>
                    <Text ta="center" c="dimmed" mb="xl">
                        Add files to your capsule first, then generate a summary to see the context here.
                    </Text>
                    <Button
                      leftSection={<Plus size={16} />}
                      onClick={handleAddFile}
                      styles={{ root: { backgroundColor: '#F5A623', color: '#000000', '&:hover': { backgroundColor: '#E09612' }}}}
                      disabled={isProcessing}
                    >
                      Add Files
                    </Button>
                </Stack>
            )}
          </Box>
        </Box>
      </Flex>

      {/* File Selector Modal */}
      <FileSelector
        opened={isFileSelectorOpen}
        onClose={() => setIsFileSelectorOpen(false)}
        onSelect={handleFileSelect}
        capsuleId={capsuleId}
        // Pass only the IDs of files already associated with the capsule
        existingFileIds={record?.fileIds || []}
      />
    </Box>
  );
}