import { Response } from "express";

// Common error handler
export function handleError(res: Response, error: unknown, message: string = "Internal server error") {
  console.error(`${message}:`, error);
  
  if (error instanceof Error) {
    // Handle validation errors
    if (error.name === 'ZodError') {
      return res.status(400).json({ 
        message: "Validation error", 
        errors: error.message 
      });
    }
    
    // Handle database constraint errors
    if (error.message.includes('constraint')) {
      return res.status(400).json({ 
        message: "Database constraint violation",
        error: error.message 
      });
    }
  }
  
  res.status(500).json({ message });
}

// Common pagination parser
export function parsePagination(query: any) {
  return {
    page: parseInt(query.page as string) || 1,
    limit: Math.min(parseInt(query.limit as string) || 50, 100), // Max 100 items per page
  };
}

// Common ID parser with validation
export function parseId(id: string): number {
  const parsedId = parseInt(id);
  if (isNaN(parsedId) || parsedId <= 0) {
    throw new Error("Invalid ID format");
  }
  return parsedId;
}

// Common success response
export function sendSuccess(res: Response, data: any, status: number = 200) {
  res.status(status).json(data);
}

// Common not found response
export function sendNotFound(res: Response, resource: string = "Resource") {
  res.status(404).json({ message: `${resource} not found` });
}