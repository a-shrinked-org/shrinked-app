"use client";

import React, { useState, useEffect } from "react";
import { useGetIdentity } from "@refinedev/core";
import { useForm, useFieldArray } from "react-hook-form";
import {
  Modal,
  TextInput,
  Button,
  Stack,
  Group,
  Box,
  Alert,
  Text,
  ActionIcon,
  Tooltip,
  Collapse,
  Select,
  Tabs,
  Progress,
} from "@mantine/core";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
import { showNotification } from "@mantine/notifications";
import {
  AlertCircle,
  Plus,
  Trash,
  Info,
  ChevronDown,
  ChevronUp,
  FileText,
  Edit,
  CheckCircle,
  XCircle,
  Loader,
} from "lucide-react";
import { useAuth } from "@/utils/authUtils";
import { FileUpload } from "@/components/FileUpload";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import ConversationVisualizer from "./ConversationVisualizer";

interface Identity {
  token?: string;
  email?: string;
  name?: string;
}

interface FileItem {
  type: "link" | "upload";
  url: string;
  filename?: string;
  size?: number;
  isLoading?: boolean;
  progress?: number;
}

interface JobCreateForm {
  jobName: string;
  scenario: string;
  lang: string;
  isPublic: boolean;
  createPage: boolean;
  files: FileItem[];
}

interface JobCreateModalProps {
  opened: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

// URL validation function (simplified to avoid CORS)
const validateMediaUrl = async (
  url: string
): Promise<{ isValid: boolean; error?: string }> => {
  try {
    // Basic URL format validation
    const parsedUrl = new URL(url);

    // 1. Check for YouTube URLs
    const youtubeRegex =
      /^(?:https?:\/\/)?(?:m\.|www\.)?(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))/i;
    if (youtubeRegex.test(url)) {
      return { isValid: true };
    }

    // 2. Check for other common streaming platforms
    const streamingPlatforms =
      /(?:vimeo\.com|dailymotion\.com|twitch\.tv|soundcloud\.com)/i;
    if (streamingPlatforms.test(url)) {
      return { isValid: true };
    }

    // 3. Check for direct media file extensions in the pathname
    const audioVideoExtensions =
      /\.(mp3|mp4|wav|webm|ogg|avi|mov|mkv|flv|wmv|m4a|aac|flac|opus|3gp|m4v)$/i;
    // Use pathname to ignore query strings
    if (audioVideoExtensions.test(parsedUrl.pathname)) {
      return { isValid: true };
    }

    // If none of the above, it's not a valid media URL for our purposes
    return {
      isValid: false,
      error:
        "URL must be a direct link to a media file (e.g., .mp3, .mp4).",
    };
  } catch (error) {
    return {
      isValid: false,
      error: "Invalid URL format",
    };
  }
};

const JobCreateModal: React.FC<JobCreateModalProps> = ({
  opened,
  onClose,
  onSuccess,
}) => {
  const { data: identity } = useGetIdentity<Identity>();
  const { fetchWithAuth, handleAuthError } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [logicOpened, { toggle: toggleLogic }] = useDisclosure(false);
  const [isEditingJobName, setIsEditingJobName] = useState(false);
  const isMobile = useMediaQuery("(max-width: 768px)");

  // URL validation states
  const [validationErrors, setValidationErrors] = useState<{[key: number]: string}>({});
  const [isValidating, setIsValidating] = useState<{[key: number]: boolean}>({});
  const [validationSuccess, setValidationSuccess] = useState<{[key: number]: boolean}>({});
  const [validationTimeouts, setValidationTimeouts] = useState<{[key: number]: NodeJS.Timeout}>({});

  // Generate data structuring job name similar to asst_5Xbp1xcveMM2YLa1jthBA8gp
  const generateJobName = (): string => {
    const prefixes = ["struct", "parse", "conv", "xform", "proc"];
    const characters =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    // Generate random string similar to OpenAI assistant IDs
    let randomString = "";
    for (let i = 0; i < 25; i++) {
      randomString += characters.charAt(
        Math.floor(Math.random() * characters.length)
      );
    }

    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    return `${prefix}_${randomString}`;
  };

  const form = useForm<JobCreateForm>({
    defaultValues: {
      jobName: generateJobName(),
      isPublic: false,
      createPage: false,
      lang: "en",
      scenario: "SINGLE_FILE_DEFAULT",
      files: [{ type: "link", url: "", isLoading: false, progress: 0 }],
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    control,
    watch,
    setError,
    reset,
  } = form;

  const { fields, append, remove } = useFieldArray({
    control,
    name: "files",
  });

  // Regenerate job name when modal opens
  useEffect(() => {
    if (opened) {
      setValue("jobName", generateJobName());
    }
  }, [opened, setValue]);

  // Cleanup validation timeouts on unmount
  useEffect(() => {
    return () => {
      Object.values(validationTimeouts).forEach(timeout => clearTimeout(timeout));
    };
  }, [validationTimeouts]);

  // Handle URL validation
  const handleUrlValidation = async (url: string, index: number) => {
    // Clear existing timeout
    if (validationTimeouts[index]) {
      clearTimeout(validationTimeouts[index]);
    }

    if (!url.trim()) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[index];
        return newErrors;
      });
      setValidationSuccess(prev => {
        const newSuccess = { ...prev };
        delete newSuccess[index];
        return newSuccess;
      });
      return;
    }

    setIsValidating(prev => ({ ...prev, [index]: true }));
    setValidationErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[index];
      return newErrors;
    });
    setValidationSuccess(prev => {
      const newSuccess = { ...prev };
      delete newSuccess[index];
      return newSuccess;
    });

    // Add minimum 1.5 second delay for better UX
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const validation = await validateMediaUrl(url);
    
    setIsValidating(prev => {
      const newState = { ...prev };
      delete newState[index];
      return newState;
    });

    if (!validation.isValid) {
      setValidationErrors(prev => ({ ...prev, [index]: validation.error || 'Invalid URL' }));
    } else {
      setValidationSuccess(prev => ({ ...prev, [index]: true }));
      
      if (validation.error) {
        // Show warning for uncertain validation
        showNotification({
          title: 'Warning',
          message: validation.error,
          color: 'yellow',
        });
      }
    }
  };

  // Default logic instructions
  const defaultLogicInstructions = `I want to transform raw conversational data into structured JSON with precise attribution and relationships.

## Processing steps
1. Extract multi-speaker dialogues with speaker identification and exact timestamps
2. Segment conversations into semantic blocks based on topic transitions
3. Generate standardized JSON with \`conversation_id\`, \`speaker\`, \`timestamp\`, and nested \`content\` fields
4. Apply metadata tagging for topic classification, priority, and action items
5. Create cross-references between related statements using \`references\` and \`connections\` arrays
6. Output to standardized docStore format optimized for Claude-3-7-Sonnet analysis

## Input sources
1. Raw conversational content: {{meeting_type}}
2. Audio/video formats: {{file_format}}
3. Speaker identification requirements: {{speaker_identification}}

The resulting data structure should enable context-aware AI analysis with complete traceability to source statements, supporting both comprehensive research generation and targeted information retrieval.`;

  // Format file size for display
  const formatFileSize = (size: number): string => {
    if (size < 1024) return `${size} bytes`;
    else if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    else if (size < 1024 * 1024 * 1024)
      return `${(size / (1024 * 1024)).toFixed(1)} MB`;
    else return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  // Handle file upload success
  const handleFileUploaded = (fileUrl: string, index: number = 0) => {
    // Simulate loading process
    setValue(`files.${index}.isLoading`, true);
    setValue(`files.${index}.progress`, 0);

    // Simulate progress
    const progressInterval = setInterval(() => {
      const currentProgress = watch(`files.${index}.progress`) || 0;
      if (currentProgress < 100) {
        setValue(`files.${index}.progress`, currentProgress + 10);
      } else {
        clearInterval(progressInterval);
        setValue(`files.${index}.isLoading`, false);
        setValue(`files.${index}.url`, fileUrl);

        // Extract filename from URL for display purposes only
        const urlParts = fileUrl.split("/");
        const filenameWithParams = urlParts[urlParts.length - 1];
        const filename = filenameWithParams.split("?")[0];
        setValue(`files.${index}.filename`, filename);

        showNotification({
          title: "Success",
          message: "File URL has been added",
          color: "green",
        });
      }
    }, 200);
  };

  const handleAddFile = () => {
    append({ type: "link", url: "", isLoading: false, progress: 0 });
  };

  const handleRemoveFile = (index: number) => {
    if (fields.length > 1) {
      // Clear validation states for this index
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[index];
        return newErrors;
      });
      setIsValidating(prev => {
        const newState = { ...prev };
        delete newState[index];
        return newState;
      });
      setValidationSuccess(prev => {
        const newSuccess = { ...prev };
        delete newSuccess[index];
        return newSuccess;
      });
      if (validationTimeouts[index]) {
        clearTimeout(validationTimeouts[index]);
      }
      
      remove(index);
    }
  };

  const handleClose = () => {
    reset();
    setIsEditingJobName(false);
    setValidationErrors({});
    setIsValidating({});
    setValidationSuccess({});
    Object.values(validationTimeouts).forEach(timeout => clearTimeout(timeout));
    setValidationTimeouts({});
    onClose();
  };

  const handleJobNameClick = () => {
    setIsEditingJobName(true);
  };

  const handleJobNameBlur = () => {
    setIsEditingJobName(false);
  };

  const handleJobNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      setIsEditingJobName(false);
    }
    if (e.key === "Escape") {
      setValue("jobName", generateJobName());
      setIsEditingJobName(false);
    }
  };

  const onSubmit = handleSubmit(async (data: JobCreateForm) => {
    setIsSubmitting(true);
    try {
      if (!navigator.onLine) {
        showNotification({
          title: "Error",
          message: "You appear to be offline. Please check your internet connection.",
          color: "red",
          icon: <AlertCircle size={16} />,
        });
        return;
      }

      // Check for validation errors
      const hasValidationErrors = Object.keys(validationErrors).length > 0;
      if (hasValidationErrors) {
        setError('root', { 
          type: 'manual', 
          message: 'Please fix URL validation errors before submitting' 
        });
        return;
      }

      // Check if any URLs are still being validated
      const isStillValidating = Object.keys(isValidating).length > 0;
      if (isStillValidating) {
        setError('root', { 
          type: 'manual', 
          message: 'Please wait for URL validation to complete' 
        });
        return;
      }

      const validFiles = data.files.filter((file) => file.url.trim() !== "");
      if (validFiles.length === 0) {
        setError("root", {
          type: "manual",
          message: "Please provide at least one file link or upload a file",
        });
        return;
      }

      let apiData;
      if (validFiles.length === 1) {
        apiData = {
          jobName: data.jobName,
          scenario: data.scenario,
          email: identity?.email || "",
          lang: data.lang,
          isPublic: data.isPublic,
          createPage: data.createPage,
          link: validFiles[0].url,
        };
      } else {
        apiData = {
          jobName: data.jobName,
          scenario: data.scenario,
          email: identity?.email || "",
          lang: data.lang,
          isPublic: data.isPublic,
          createPage: data.createPage,
          links: validFiles.map((file) => file.url),
        };
      }

      const response = await fetchWithAuth(`/api/jobs-proxy`, {
        method: "POST",
        body: JSON.stringify(apiData),
      });

      if (
        response.status === 521 ||
        response.status === 522 ||
        response.status === 523
      ) {
        throw new Error(
          "The server is currently unreachable. Please try again later."
        );
      }

      if (!response.ok) {
        let errorMessage;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || `Error: ${response.status}`;
        } catch {
          errorMessage = `Error: ${response.status}`;
        }
        throw new Error(errorMessage);
      }

      showNotification({
        title: "Success",
        message: "Job created successfully",
        color: "green",
      });

      reset();
      setIsEditingJobName(false);
      onClose();

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("Create job error:", error);
      handleAuthError(error);
      showNotification({
        title: "Error",
        message: error instanceof Error ? error.message : "Failed to create job",
        color: "red",
        icon: <AlertCircle size={16} />,
      });
    } finally {
      setIsSubmitting(false);
    }
  });

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      withCloseButton={false}
      title={null}
      centered
      size={isMobile ? "lg" : "xl"}
      styles={{
        header: {
          display: "none",
        },
        body: {
          backgroundColor: "#000000",
          color: "#ffffff",
          padding: isMobile ? "16px 20px" : "24px 30px",
        },
        inner: {
          padding: 0,
        },
        content: {
          maxWidth: isMobile ? "95vw" : "800px",
          borderRadius: "10px",
          border: "0.5px solid #2B2B2B",
          overflow: "hidden",
        },
      }}
    >
      <Box>
        {/* Header with editable job name */}
        <Group justify="space-between" align="center" mb="lg">
          <Group align="center" gap="xs">
            {isEditingJobName ? (
              <TextInput
                value={watch("jobName")}
                onChange={(e) => setValue("jobName", e.target.value)}
                onBlur={handleJobNameBlur}
                onKeyDown={handleJobNameKeyDown}
                autoFocus
                styles={{
                  input: {
                    backgroundColor: "transparent",
                    border: "none",
                    color: "#ffffff",
                    fontFamily: GeistMono.style.fontFamily,
                    fontSize: isMobile ? "14px" : "16px",
                    fontWeight: 500,
                    padding: "0",
                    "&:focus": {
                      outline: "none",
                    },
                  },
                  wrapper: {
                    width: "auto",
                    minWidth: "200px",
                  },
                }}
              />
            ) : (
              <Text
                fw={500}
                size={isMobile ? "sm" : "md"}
                style={{
                  fontFamily: GeistMono.style.fontFamily,
                  cursor: "pointer",
                }}
                onClick={handleJobNameClick}
              >
                {watch("jobName")}
              </Text>
            )}
            <Tooltip label="Click to edit job name">
              <ActionIcon
                variant="transparent"
                size="sm"
                onClick={handleJobNameClick}
                style={{ opacity: 0.6 }}
              >
                <Edit size={12} />
              </ActionIcon>
            </Tooltip>
          </Group>
          <Group>
            {!isMobile && (
              <Text size="sm" c="#a1a1a1">
                Claude 3.5 Sonnet
              </Text>
            )}
            <Group gap="xs">
              <Button
                variant="outline"
                size="xs"
                onClick={handleClose}
                styles={{
                  root: {
                    borderColor: "#2b2b2b",
                    color: "#ffffff",
                    textTransform: "uppercase",
                    fontFamily: GeistMono.style.fontFamily,
                    fontSize: "12px",
                    "&:hover": {
                      backgroundColor: "#2b2b2b",
                    },
                  },
                }}
              >
                CANCEL
              </Button>
              <Button
                size="xs"
                onClick={onSubmit}
                loading={isSubmitting}
                styles={{
                  root: {
                    backgroundColor: "#F5A623",
                    color: "#000000",
                    textTransform: "uppercase",
                    fontFamily: GeistMono.style.fontFamily,
                    fontSize: "12px",
                    "&:hover": {
                      backgroundColor: "#E09612",
                    },
                  },
                }}
              >
                RUN JOB
              </Button>
            </Group>
          </Group>
        </Group>

        {/* Conversation Data Visualization */}
        <Box mb="xl">
          <ConversationVisualizer files={watch("files")} isActive={true} />
        </Box>

        <form onSubmit={onSubmit}>
          {errors?.root?.message && (
            <Alert
              icon={<AlertCircle size={16} />}
              color="red"
              title="Error"
              mb="md"
              styles={{
                root: {
                  backgroundColor: "rgba(244, 67, 54, 0.1)",
                  border: "1px solid rgba(244, 67, 54, 0.3)",
                },
              }}
            >
              {errors.root.message}
            </Alert>
          )}

          <Stack gap="lg">
            {/* Files Section */}
            <Box>
              {/* File entries */}
              {fields.map((field, index) => {
                const hasUrl = watch(`files.${index}.url`)?.trim() !== "";
                const isLoading = watch(`files.${index}.isLoading`);
                const progress = watch(`files.${index}.progress`) || 0;
                const fileType = watch(`files.${index}.type`);

                return (
                  <Box
                    key={field.id}
                    mb="sm"
                    style={{
                      backgroundColor: "#000000",
                      border: "0.5px solid #2B2B2B",
                      borderRadius: "8px",
                      overflow: "hidden",
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    {/* Main content area */}
                    <Box
                      style={{
                        padding: "10px 10px 40px 20px",
                        flexGrow: 1,
                        position: "relative",
                      }}
                    >
                      {/* Remove file button */}
                      {fields.length > 1 && (
                        <Box
                          style={{
                            position: "absolute",
                            top: "12px",
                            right: "12px",
                            zIndex: 10,
                          }}
                        >
                          <Tooltip label="Remove">
                            <ActionIcon
                              variant="subtle"
                              color="red"
                              onClick={() => handleRemoveFile(index)}
                              size="sm"
                            >
                              <Trash size={14} />
                            </ActionIcon>
                          </Tooltip>
                        </Box>
                      )}

                      {/* Content based on type */}
                      {fileType === "link" ? (
                        <Box>
                          <TextInput
                            variant="unstyled"
                            placeholder="URL TO A SOURCE AUDIO OR VIDEO"
                            {...register(`files.${index}.url`)}
                            onChange={(e) => {
                              setValue(`files.${index}.url`, e.target.value);
                              
                              // Clear existing timeout
                              if (validationTimeouts[index]) {
                                clearTimeout(validationTimeouts[index]);
                              }
                              
                              // Set new timeout for validation
                              const timeoutId = setTimeout(() => {
                                handleUrlValidation(e.target.value, index);
                              }, 1000);
                              
                              setValidationTimeouts(prev => ({ ...prev, [index]: timeoutId }));
                              
                              if (e.target.value) {
                                try {
                                  const filename = e.target.value.split("/").pop() || "";
                                  setValue(`files.${index}.filename`, filename);
                                } catch (error) {
                                  console.warn("Failed to extract filename from URL");
                                }
                              }
                            }}
                            styles={{
                              input: {
                                backgroundColor: "transparent",
                                border: "none",
                                color: "#ffffff",
                                fontFamily: GeistMono.style.fontFamily,
                                fontSize: "14px",
                                padding: "0",
                                "&::placeholder": {
                                  color: "#666",
                                },
                              },
                            }}
                          />
                          
                          {/* Validation feedback */}
                          {isValidating[index] && (
                            <Group gap="xs" mt="xs">
                              <Loader size={12} style={{ color: "#a1a1a1" }} />
                              <Text size="xs" c="#a1a1a1" style={{ fontFamily: GeistMono.style.fontFamily }}>
                                Validating URL...
                              </Text>
                            </Group>
                          )}
                          
                          {validationSuccess[index] && !isValidating[index] && (
                            <Group gap="xs" mt="xs">
                              <CheckCircle size={12} style={{ color: "#4ade80" }} />
                              <Text size="xs" c="#4ade80" style={{ fontFamily: GeistMono.style.fontFamily }}>
                                Valid media URL
                              </Text>
                            </Group>
                          )}
                          
                          {validationErrors[index] && !isValidating[index] && (
                            <Group gap="xs" mt="xs">
                              <XCircle size={12} style={{ color: "#ef4444" }} />
                              <Text size="xs" c="#ef4444" style={{ fontFamily: GeistMono.style.fontFamily }}>
                                {validationErrors[index]}
                              </Text>
                            </Group>
                          )}
                        </Box>
                      ) : (
                        <Box style={{ width: "100%", height: "100%" }}>
                          {!watch(`files.${index}.url`) ? (
                            <FileUpload
                              onFileUploaded={(fileUrl) =>
                                handleFileUploaded(fileUrl, index)
                              }
                            />
                          ) : (
                            <Group style={{ padding: "8px 0" }} wrap="nowrap">
                              <FileText size={16} />
                              <Box style={{ flex: 1, overflow: "hidden" }}>
                                <Text size="sm" truncate>
                                  {watch(`files.${index}.filename`) ||
                                    "Uploaded file"}
                                </Text>
                                {watch(`files.${index}.size`) && (
                                  <Text size="xs" c="dimmed">
                                    {formatFileSize(
                                      watch(`files.${index}.size`) as number
                                    )}
                                  </Text>
                                )}
                              </Box>
                              <Button
                                size="xs"
                                variant="light"
                                color="gray"
                                onClick={() => {
                                  setValue(`files.${index}.url`, "");
                                  setValue(`files.${index}.filename`, "");
                                  setValue(`files.${index}.size`, undefined);
                                }}
                              >
                                Change
                              </Button>
                            </Group>
                          )}
                        </Box>
                      )}
                    </Box>

                    {/* Progress bar */}
                    {(isLoading || hasUrl) && (
                      <Progress
                        value={isLoading ? progress : 100}
                        size="xs"
                        color="#F5A623"
                        styles={{
                          root: { backgroundColor: "transparent" },
                          section: { transition: "width 0.2s ease" },
                        }}
                      />
                    )}

                    {/* Bottom bar with Tabs and Info */}
                    {/* Bottom bar with Tabs and Info */}
                    <Box
                      style={{
                        padding: "8px 12px",
                        backgroundColor: "#000000",
                      }}
                    >
                      <Group justify="space-between" align="center">
                        <Tabs
                          value={fileType}
                          onChange={(value) => setValue(`files.${index}.type`, value as "link" | "upload")}
                          variant="pills"
                          styles={{
                            list: {
                              borderRadius: "6px",
                              padding: "2px",
                              gap: "2px",
                              backgroundColor: "#0A0A0A",
                              border: "none",
                            },
                            tab: {
                              padding: "4px 12px",
                              color: "#888888",
                              fontSize: "11px",
                              fontFamily: GeistMono.style.fontFamily,
                              textTransform: "none",
                              minHeight: "auto",
                              borderRadius: "4px",
                              transition: "all 0.2s ease",
                              border: "none",
                              
                              // Hover state
                              "&:hover": {
                                backgroundColor: "#1c1c1c !important",
                                color: "#bbbbbb !important",
                              },

                              // Active state for Mantine Tabs
                              "&[data-active]": {
                                color: "#ffffff !important",
                                backgroundColor: "#202020 !important",
                              },
                              
                              // Disabled state
                              "&:disabled": {
                                color: "#555555",
                                opacity: 0.5,
                              },
                            },
                            tabLabel: {
                              textTransform: "none",
                            },
                          }}
                        >
                          <Tabs.List>
                            <Tabs.Tab value="link">Url</Tabs.Tab>
                            <Tabs.Tab value="upload">Upload a file</Tabs.Tab>
                            <Tabs.Tab value="emails" disabled>
                              Emails
                            </Tabs.Tab>
                          </Tabs.List>
                        </Tabs>
                    
                        <Tooltip label="Supported formats: MP3, MP4, WAV, YouTube links">
                          <Info
                            size={16}
                            style={{ color: "#a1a1a1", cursor: "help" }}
                          />
                        </Tooltip>
                      </Group>
                    </Box>
                  </Box>
                );
              })}

              {/* Add more button */}
              <Button
                rightSection={<Plus size={20} />}
                fullWidth
                onClick={handleAddFile}
                styles={{
                  root: {
                    backgroundColor: "#0A0A0A",
                    border: "1px solid #2B2B2B",
                    color: "#a1a1a1",
                    height: "48px",
                    fontFamily: GeistMono.style.fontFamily,
                    fontSize: "12px",
                    textTransform: "uppercase",
                    padding: "0 16px",
                    "&:hover": {
                      backgroundColor: "#1c1c1c",
                      borderColor: "#333333",
                    },
                  },
                  inner: {
                    justifyContent: "space-between",
                  },
                }}
              >
                ADD MORE DATA
              </Button>
            </Box>

            {/* FOLLOW THIS LOGIC */}
            <Box>
              <Group
                align="center"
                mb="xs"
                onClick={toggleLogic}
                style={{ cursor: "pointer" }}
              >
                <Text
                  size="sm"
                  c="#a1a1a1"
                  style={{ fontFamily: GeistMono.style.fontFamily }}
                >
                  FOLLOW THIS LOGIC
                </Text>
                <Text
                  size="xs"
                  c="#666"
                  style={{ fontFamily: GeistMono.style.fontFamily }}
                >
                  DEFAULT FILE SOMETHING
                </Text>
                <ActionIcon variant="transparent" size="sm">
                  {logicOpened ? (
                    <ChevronUp size={14} />
                  ) : (
                    <ChevronDown size={14} />
                  )}
                </ActionIcon>
              </Group>

              <Collapse in={logicOpened}>
                <Box
                  p="md"
                  style={{
                    backgroundColor: "#0a0a0a",
                    border: "0.5px solid #2B2B2B",
                    borderRadius: "6px",
                    maxHeight: "200px",
                    overflowY: "auto",
                  }}
                >
                  <Text
                    size="xs"
                    style={{
                      whiteSpace: "pre-wrap",
                      fontFamily: GeistSans.style.fontFamily,
                      lineHeight: 1.4,
                    }}
                  >
                    {defaultLogicInstructions}
                  </Text>
                </Box>
              </Collapse>
            </Box>

            {/* Language Selection */}
            <Box>
              <Text
                size="sm"
                c="#a1a1a1"
                mb="xs"
                style={{ fontFamily: GeistMono.style.fontFamily }}
              >
                LANGUAGE
              </Text>
              <Select
                value="English"
                data={["English"]}
                disabled
                styles={{
                  input: {
                    backgroundColor: "#0d0d0d",
                    borderColor: "#2b2b2b",
                    color: "#ffffff",
                    fontFamily: GeistMono.style.fontFamily,
                  },
                  dropdown: {
                    backgroundColor: "#0d0d0d",
                    borderColor: "#2b2b2b",
                  },
                }}
              />
            </Box>

            {/* Footer info */}
            <Text
              size="xs"
              c="#666"
              ta="right"
              style={{ fontFamily: GeistMono.style.fontFamily }}
            >
              formats supported, any limitations
            </Text>
          </Stack>
        </form>
      </Box>
    </Modal>
  );
};

export default JobCreateModal;