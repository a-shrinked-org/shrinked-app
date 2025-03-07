// src/utils/formatting.ts
export const formatDate = (dateString: string): string => {
  try {
	const date = new Date(dateString);
	if (isNaN(date.getTime())) throw new Error("Invalid date");
	return new Intl.DateTimeFormat('en-US', {
	  year: 'numeric',
	  month: 'short',
	  day: '2-digit'
	}).format(date);
  } catch (error) {
	console.error("Error formatting date:", error, "Date string:", dateString);
	return 'Invalid Date';
  }
};