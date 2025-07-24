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
  FileText,
  Edit,
  CheckCircle,
  XCircle,
  Loader,
  ChevronsUpDown,
} from "lucide-react";
import { useAuth } from "@/utils/authUtils";
import { FileUpload } from "@/components/FileUpload";

import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import ConversationVisualizer from "./ConversationVisualizer";
import "@/styles/file-upload-styles.css";

interface Identity {
  token?: string;
  email?: string;
  name?: string;
}

interface FileItem {
  type: "link" | "upload";
  url: string;
  originalUrl?: string;
  filename?: string;
  size?: number;
  isLoading?: boolean;
  progress?: number;
  jobId?: string;
}

interface JobCreateForm {
  jobName: string;
  scenario: string;
  lang: string;
  isPublic: boolean;
  createPage: boolean;
  files: FileItem[];
  selectedLogic: string;
}

interface JobCreateModalProps {
  opened: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const logicOptions = [
  { value: "structured-conversation-protocol", label: "DEFAULT" },
  { value: "timeline-analysis-protocol", label: "Timeline Analysis Protocol" },
  { value: "multi-source-merge-protocol", label: "Multi-Source Merge Protocol" },
  { value: "topic-centered-merge-protocol", label: "Topic-Centered Merge Protocol" },
  { value: "decision-extraction-protocol", label: "Decision Extraction Protocol" },
];

const validateMediaUrl = async (
  url: string
): Promise<{ isValid: boolean; error?: string }> => {
  try {
    const parsedUrl = new URL(url);
    const youtubeRegex =
      /^(?:https?:\/\/)?(?:m\.|www\.)?(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))/i;
    if (youtubeRegex.test(url)) {
      return { isValid: true };
    }
    const streamingPlatforms =
      /(?:vimeo\.com|dailymotion\.com|twitch\.tv|soundcloud\.com)/i;
    if (streamingPlatforms.test(url)) {
      return { isValid: true };
    }
    const audioVideoExtensions =
      /\.(mp3|mp4|wav|webm|ogg|avi|mov|mkv|flv|wmv|m4a|aac|flac|opus|3gp|m4v)$/i;
    if (audioVideoExtensions.test(parsedUrl.pathname)) {
      return { isValid: true };
    }
    return {
      isValid: false,
      error: "URL must be a direct link to a media file (e.g., .mp3, .mp4).",
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
  const [isEditingJobName, setIsEditingJobName] = useState(false);
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [isDragging, setIsDragging] = useState(false);
  const [logicDropdownOpened, { toggle: toggleLogicDropdown }] = useDisclosure(false);
  const [isExtracting, setIsExtracting] = useState<{[key: number]: boolean}>({});
  const [extractionErrors, setExtractionErrors] = useState<{[key: number]: string}>({});
  const [extractionSuccess, setExtractionSuccess] = useState<{[key: number]: boolean}>({});

  const generateJobName = (): string => {
    const prefixes = ["struct", "parse", "conv", "xform", "proc"];
    const characters =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let randomString = "";
    for (let i = 0; i < 25; i++) {
      randomString += characters.charAt(
        Math.floor(Math.random() * characters.length)
      );
    }
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    return `${prefix}_${randomString}`;
  };

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    reset,
    formState: { errors },
    control,
  } = useForm<JobCreateForm>({
    defaultValues: {
      jobName: generateJobName(),
      scenario: "structured-conversation-protocol",
      lang: "en",
      isPublic: false,
      createPage: true,
      files: [{ type: "link", url: "", isLoading: false, progress: 0 }],
      selectedLogic: "structured-conversation-protocol",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: control,
    name: "files",
  });

  const [validationTimeouts, setValidationTimeouts] = useState<{[key: number]: NodeJS.Timeout}>({});
  const [isValidating, setIsValidating] = useState<{[key: number]: boolean}>({});
  const [validationSuccess, setValidationSuccess] = useState<{[key: number]: boolean}>({});
  const [validationErrors, setValidationErrors] = useState<{[key: number]: string}>({});

  useEffect(() => {
    if (opened) {
      setValue("jobName", generateJobName());
    }
  }, [opened, setValue]);

  const handleUrlValidation = async (url: string | undefined, index: number) => {
    if (!url?.trim()) {
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
      setExtractionErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[index];
        return newErrors;
      });
      setExtractionSuccess(prev => {
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
    setExtractionErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[index];
      return newErrors;
    });
    setExtractionSuccess(prev => {
      const newSuccess = { ...prev };
      delete newSuccess[index];
      return newSuccess;
    });

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
        showNotification({
          title: 'Warning',
          message: validation.error,
          color: 'yellow',
        });
      }
      // Start media extraction
      await handleMediaExtraction(url, index);
    }
  };

  const handleMediaExtraction = async (url: string, index: number) => {
    setIsExtracting((prev) => ({ ...prev, [index]: true }));
    setExtractionErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[index];
      return newErrors;
    });
    setExtractionSuccess((prev) => {
      const newSuccess = { ...prev };
      delete newSuccess[index];
      return newSuccess;
    });

    try {
      const response = await fetchWithAuth("/api/sieve/download", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to initiate media extraction");
      }

      const { jobId } = await response.json();
      if (!jobId) {
        throw new Error("Invalid response: jobId is missing");
      }

      setValue(`files.${index}.jobId`, jobId);
      setExtractionSuccess((prev) => ({ ...prev, [index]: false })); // Reset success for polling

      // Start polling for job status
      const pollJobStatus = async () => {
        try {
          const statusResponse = await fetchWithAuth(
            `/api/sieve/download?jobId=${jobId}`
          );
          if (!statusResponse.ok) {
            const errorData = await statusResponse.json().catch(() => ({}));
            throw new Error(errorData.error || "Failed to fetch job status");
          }
          const statusData = await statusResponse.json();

          if (statusData.status === "finished" && statusData.fileUrl) {
            setValue(`files.${index}.url`, statusData.fileUrl);
            setValue(`files.${index}.originalUrl`, url);
            setValue(
              `files.${index}.filename`,
              statusData.filename || url.split("/").pop() || "unknown"
            );
            setExtractionSuccess((prev) => ({ ...prev, [index]: true }));
            showNotification({
              title: "Success",
              message: "Media extracted successfully!",
              color: "green",
            });
            setIsExtracting((prev) => {
              const newState = { ...prev };
              delete newState[index];
              return newState;
            });
            return; // Stop polling
          } else if (statusData.status === "error") {
            throw new Error(statusData.error || "Media extraction failed");
          } else {
            // Continue polling
            setTimeout(pollJobStatus, 3000); // Poll every 3 seconds
          }
        } catch (pollError: any) {
          // Fallback to original URL if extraction fails
          setValue(`files.${index}.url`, url);
          setValue(`files.${index}.originalUrl`, url);
          setValue(`files.${index}.filename`, url.split("/").pop() || "unknown");
          setExtractionErrors((prev) => ({
            ...prev,
            [index]: pollError.message || "Failed to extract media, using original URL",
          }));
          showNotification({
            title: "Warning",
            message: "Media extraction failed, proceeding with original URL",
            color: "yellow",
          });
          setIsExtracting((prev) => {
            const newState = { ...prev };
            delete newState[index];
            return newState;
          });
        }
      };
      pollJobStatus();
    } catch (error: any) {
      // Fallback to original URL if extraction fails
      setValue(`files.${index}.url`, url);
      setValue(`files.${index}.originalUrl`, url);
      setValue(`files.${index}.filename`, url.split("/").pop() || "unknown");
      setExtractionErrors((prev) => ({
        ...prev,
        [index]: error.message || "Failed to extract media, using original URL",
      }));
      showNotification({
        title: "Warning",
        message: "Media extraction failed, proceeding with original URL",
        color: "yellow",
      });
      setIsExtracting((prev) => {
        const newState = { ...prev };
        delete newState[index];
        return newState;
      });
    }
  };

  const handleFileUploaded = async (fileUrl: string, index: number, originalUrl?: string) => {
    setValue(`files.${index}.url`, fileUrl);
    if (originalUrl) {
      setValue(`files.${index}.originalUrl`, originalUrl);
    }

    const urlParts = fileUrl.split("/");
    const filenameWithParams = urlParts[urlParts.length - 1];
    const filename = filenameWithParams.split("?")[0];
    setValue(`files.${index}.filename`, filename);
    setValue(`files.${index}.isLoading`, false);
    setValue(`files.${index}.progress`, 100);

    showNotification({
      title: "Success",
      message: "File uploaded successfully",
      color: "green",
    });
  };

  const handleAddFile = () => {
    append({ type: "link", url: "", isLoading: false, progress: 0 });
  };

  const handleRemoveFile = (index: number) => {
    if (fields.length > 1) {
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
      setExtractionErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[index];
        return newErrors;
      });
      setExtractionSuccess(prev => {
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
    setExtractionErrors({});
    setExtractionSuccess({});
    setIsExtracting({});
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

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
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

      const hasValidationErrors = Object.keys(validationErrors).length > 0;
      if (hasValidationErrors) {
        setError('root', { 
          type: 'manual', 
          message: 'Please fix URL validation errors before submitting' 
        });
        return;
      }

      const validFiles = data.files.filter((file) => file.url?.trim() !== "");
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
          originalLink: validFiles[0].originalUrl
        };
      } else {
        apiData = {
          jobName: data.jobName,
          scenario: data.scenario,
          email: identity?.email || "",
          lang: data.lang,
          isPublic: data.isPublic,
          createPage: data.createPage,
          links: validFiles.map((file) => ({ url: file.url, originalUrl: file.originalUrl })),
        };
      }

      const response = await fetchWithAuth(`/api/jobs-proxy`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${identity?.token || ""}`,
        },
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
      setValidationErrors({});
      setIsValidating({});
      setValidationSuccess({});
      setExtractionErrors({});
      setExtractionSuccess({});
      setIsExtracting({});
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
        <Group justify="space-between" align="center" mb="lg">
          <Group align="center" gap="xs">
            {isEditingJobName ? (
              <TextInput
                value={watch("jobName") || ""}
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
                {watch("jobName") || "Loading..."}
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
                disabled={isSubmitting}
              >
                RUN JOB
              </Button>
            </Group>
          </Group>
        </Group>

        <Box
          mb="xl"
          p={isMobile ? "sm" : "md"}
          style={{
            backgroundColor: "#0A0A0A",
            borderRadius: "8px",
          }}
        >
          <Text
            component="span"
            size={isMobile ? "xs" : "sm"}
            style={{
              fontFamily: GeistMono.style.fontFamily,
              fontSize: isMobile ? "12px" : "14px",
              lineHeight: 1.4,
              color: "#757575",
            }}
          >
            <Text component="span" fw={700} c="#A1A1A1">
              {'>'}
            </Text>{" "}
            <Text component="span" fw={700} c="#A1A1A1">
              Structure
            </Text>{" "}
            conversation data from the attached sources following this logic template {" "}
            <Select
              value={watch("selectedLogic") || "structured-conversation-protocol"}
              onChange={(value) => setValue("selectedLogic", value || "structured-conversation-protocol")}
              data={logicOptions.map((option, index) => ({...option, disabled: index !== 0}))}
              variant="unstyled"
              size="sm"
              rightSection={<ChevronsUpDown size={12} />}
              onDropdownOpen={toggleLogicDropdown}
              onDropdownClose={toggleLogicDropdown}
              comboboxProps={{
                withinPortal: true,
              }}
              styles={{
                root: {
                  display: "inline-block",
                  verticalAlign: "middle",
                },
                wrapper: {
                  display: "inline-block",
                  verticalAlign: "middle",
                  width: "105px",
                  margin: "0 4px",
                },
                input: {
                  backgroundColor: "transparent",
                  border: "none",
                  color: "#ffffff",
                  fontFamily: GeistMono.style.fontFamily,
                  fontSize: isMobile ? "12px" : "14px",
                  fontWeight: 500,
                  padding: "2px 8px",
                  borderRadius: "4px",
                  minHeight: "auto",
                  height: "auto",
                  lineHeight: 1,
                },
                section: {
                  color: "#ffffff",
                },
                dropdown: {
                  backgroundColor: "#000000",
                  border: "1px solid #2b2b2b",
                  width: "auto",
                  minWidth: "max-content",
                },
                option: {
                  color: "#ffffff",
                  fontSize: isMobile ? "12px" : "14px",
                  fontFamily: GeistMono.style.fontFamily,
                  "&[data-selected]": {
                    backgroundColor: "#202020",
                  },
                  "&:hover:not([data-disabled])": {
                    backgroundColor: "#1c1c1c",
                  },
                  "&[data-disabled]": {
                    color: "#555555",
                    opacity: 0.5,
                    cursor: "not-allowed",
                  },
                },
              }}
            />{" "}
            in{" "}
            <Text component="span" style={{ backgroundColor: "#202020", padding: "2px 8px", borderRadius: "4px", color: "#ffffff" }}>
              ENGLISH
            </Text>{" "}
            and output as pdf to {" "}
            <Text component="span" style={{ backgroundColor: "#202020", padding: "2px 8px", borderRadius: "4px", color: "#ffffff" }}>
              {identity?.email?.toUpperCase() || "USER@EXAMPLE.COM"}
            </Text>
          </Text>
        </Box>

        <Box mb="xl">
          <ConversationVisualizer files={watch("files") || []} isActive={true} />
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
            <Box>
              {fields.map((field, index) => {
                const hasUrl = (watch(`files.${index}.url`) || "").trim() !== "";
                const isLoading = watch(`files.${index}.isLoading`);
                const progress = watch(`files.${index}.progress`) || 0;
                const fileType = watch(`files.${index}.type`) || "link";

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
                    <Box
                      style={{
                        padding:
                          fileType === "link"
                            ? isMobile
                              ? "10px 10px 30px 15px"
                              : "10px 10px 40px 20px"
                            : isMobile
                            ? "10px"
                            : "15px",
                        flexGrow: 1,
                        position: "relative",
                      }}
                    >
                      {fields.length > 1 && (
                        <Box
                          style={{
                            position: "absolute",
                            top: isMobile ? "8px" : "12px",
                            right: isMobile ? "8px" : "12px",
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

                      {fileType === "link" ? (
                        <Box>
                          <TextInput
                            variant="unstyled"
                            placeholder="URL TO A SOURCE AUDIO OR VIDEO"
                            {...register(`files.${index}.url`)}
                            onChange={(e) => {
                              const url = e.target.value || "";
                              setValue(`files.${index}.url`, url);
                              if (validationTimeouts[index]) {
                                clearTimeout(validationTimeouts[index]);
                              }
                              const timeoutId = setTimeout(() => {
                                handleUrlValidation(url, index);
                              }, 1000);
                              setValidationTimeouts((prev) => ({
                                ...prev,
                                [index]: timeoutId,
                              }));
                              if (url) {
                                try {
                                  const filename = url.split("/").pop() || "";
                                  setValue(`files.${index}.filename`, filename);
                                } catch (error) {
                                  console.warn(
                                    "Failed to extract filename from URL"
                                  );
                                }
                              }
                            }}
                            styles={{
                              input: {
                                backgroundColor: "transparent",
                                border: "none",
                                color: "#ffffff",
                                fontFamily: GeistMono.style.fontFamily,
                                fontSize: isMobile ? "12px" : "14px",
                                padding: "0",
                                "&::placeholder": {
                                  color: "#666",
                                },
                              },
                            }}
                          />
                          {isValidating[index] && (
                            <Group gap="xs" mt="xs">
                              <Loader size={12} style={{ color: "#a1a1a1" }} />
                              <Text
                                size="xs"
                                c="#a1a1a1"
                                style={{ fontFamily: GeistMono.style.fontFamily }}
                              >
                                Validating URL...
                              </Text>
                            </Group>
                          )}
                          {validationSuccess[index] &&
                            !isValidating[index] &&
                            !isExtracting[index] &&
                            !extractionSuccess[index] && (
                              <Group gap="xs" mt="xs">
                                <CheckCircle size={12} style={{ color: "#4ade80" }} />
                                <Text
                                  size="xs"
                                  c="#4ade80"
                                  style={{ fontFamily: GeistMono.style.fontFamily }}
                                >
                                  URL Valid
                                </Text>
                              </Group>
                            )}
                          {validationErrors[index] && !isValidating[index] && (
                            <Group gap="xs" mt="xs">
                              <XCircle size={12} style={{ color: "#ef4444" }} />
                              <Text
                                size="xs"
                                c="#ef4444"
                                style={{ fontFamily: GeistMono.style.fontFamily }}
                              >
                                {validationErrors[index]}
                              </Text>
                            </Group>
                          )}
                          {isExtracting[index] && (
                            <Group gap="xs" mt="xs">
                              <Loader size={12} style={{ color: "#a1a1a1" }} />
                              <Text
                                size="xs"
                                c="#a1a1a1"
                                style={{ fontFamily: GeistMono.style.fontFamily }}
                              >
                                Extracting media...
                              </Text>
                            </Group>
                          )}
                          {extractionSuccess[index] && !isExtracting[index] && (
                            <Group gap="xs" mt="xs">
                              <CheckCircle size={12} style={{ color: "#4ade80" }} />
                              <Text
                                size="xs"
                                c="#4ade80"
                                style={{ fontFamily: GeistMono.style.fontFamily }}
                              >
                                Media extracted successfully!
                              </Text>
                            </Group>
                          )}
                          {extractionErrors[index] && !isExtracting[index] && (
                            <Group gap="xs" mt="xs">
                              <XCircle size={12} style={{ color: "#ef4444" }} />
                              <Text
                                size="xs"
                                c="#ef4444"
                                style={{ fontFamily: GeistMono.style.fontFamily }}
                              >
                                {extractionErrors[index]}
                              </Text>
                            </Group>
                          )}
                        </Box>
                      ) : fileType === "upload" ? (
                        <Box style={{ width: "100%", height: "100%" }}>
                          {!watch(`files.${index}.url`) ? (
                            <div
                              onDragEnter={() => setIsDragging(true)}
                              onDragLeave={() => setIsDragging(false)}
                              onDrop={() => setIsDragging(false)}
                            >
                              <FileUpload
                                onFileUploaded={(fileUrl) =>
                                  handleFileUploaded(fileUrl, index)
                                }
                                isDragging={isDragging}
                                fileType="upload"
                              />
                            </div>
                          ) : (
                            <Group
                              style={{ padding: isMobile ? "4px 0" : "8px 0" }}
                              wrap="nowrap"
                            >
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
                      ) : null}
                    </Box>

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

                    <Box
                      style={{
                        padding: isMobile ? "6px 10px" : "8px 12px",
                        backgroundColor: "#000000",
                      }}
                    >
                      <Group justify="space-between" align="center">
                        <Tabs
                          value={fileType}
                          onChange={(value) =>
                            setValue(`files.${index}.type`, value as "link" | "upload")
                          }
                          variant="pills"
                          color="rgba(32, 32, 32, 1)"
                          styles={{
                            list: {
                              borderRadius: "6px",
                              padding: "2px",
                              gap: "2px",
                              backgroundColor: "#0A0A0A",
                              border: "none",
                            },
                            tab: {
                              padding: isMobile ? "3px 8px" : "4px 12px",
                              color: "#888888",
                              fontSize: isMobile ? "10px" : "11px",
                              fontFamily: GeistMono.style.fontFamily,
                              textTransform: "none",
                              minHeight: "auto",
                              borderRadius: "4px",
                              transition: "all 0.2s ease",
                              border: "none",
                              "&[data-active]": {
                                color: "#ffffff !important",
                                backgroundColor: "#202020 !important",
                              },
                              "&:hover": {
                                backgroundColor: "#1c1c1c !important",
                                color: "#bbbbbb !important",
                              },
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
                            <Tabs.Tab value="download" disabled>
                              Download
                            </Tabs.Tab>
                            <Tabs.Tab value="emails" disabled>
                              Emails
                            </Tabs.Tab>
                          </Tabs.List>
                        </Tabs>

                        <Tooltip label="Supported formats: MP3, MP4, WAV, YouTube links">
                          <Info
                            size={isMobile ? 14 : 16}
                            style={{ color: "#a1a1a1", cursor: "help" }}
                          />
                        </Tooltip>
                      </Group>
                    </Box>
                  </Box>
                );
              })}

              <Button
                rightSection={<Plus size={isMobile ? 16 : 20} />}
                fullWidth
                onClick={handleAddFile}
                styles={{
                  root: {
                    backgroundColor: "#0A0A0A",
                    border: "1px solid #2B2B2B",
                    color: "#a1a1a1",
                    height: isMobile ? "40px" : "48px",
                    fontFamily: GeistMono.style.fontFamily,
                    fontSize: isMobile ? "10px" : "12px",
                    textTransform: "uppercase",
                    padding: isMobile ? "0 12px" : "0 16px",
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
          </Stack>
        </form>
      </Box>
    </Modal>
  );
};

export default JobCreateModal;