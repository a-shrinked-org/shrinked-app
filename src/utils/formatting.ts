// src/utils/formatting.ts
export const formatDate = (dateString: string): string => {
  try {
	const date = new Date(dateString);
	if (isNaN(date.getTime())) throw new Error("Invalid date");
	
	// Format the date with month (short name) and day (2-digit)
	const formatter = new Intl.DateTimeFormat('en-US', {
	  month: 'short',
	  day: '2-digit'
	});
	
	// Get the formatted result and convert month to uppercase
	const formatted = formatter.format(date);
	
	// Transform "Mar 17" to "MAR 17" (uppercase month)
	const [month, day] = formatted.split(' ');
	return `${month.toUpperCase()} ${day}`;
  } catch (error) {
	console.error("Error formatting date:", error, "Date string:", dateString);
	return 'Invalid Date';
  }
};