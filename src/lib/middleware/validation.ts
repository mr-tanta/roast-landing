import { NextRequest, NextResponse } from 'next/server'
import { z, ZodSchema } from 'zod'

export class ValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

export async function validateRequest<T>(
  request: NextRequest,
  schema: ZodSchema<T>
): Promise<T> {
  try {
    const body = await request.json()
    return schema.parse(body)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const message = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')
      throw new ValidationError(message)
    }
    throw error
  }
}

export function createErrorResponse(error: unknown, status = 500) {
  if (error instanceof ValidationError) {
    return NextResponse.json(
      {
        error: 'Validation Error',
        message: error.message,
      },
      { status: 400 }
    )
  }

  if (error instanceof Error) {
    return NextResponse.json(
      {
        error: error.name,
        message: error.message,
      },
      { status }
    )
  }

  return NextResponse.json(
    {
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    },
    { status: 500 }
  )
}

// Common validation schemas
export const urlSchema = z.object({
  url: z.string().url('Must be a valid URL'),
  forceRefresh: z.boolean().optional(),
})

export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(10),
  offset: z.coerce.number().int().min(0).default(0),
})

export const idSchema = z.object({
  id: z.string().uuid('Must be a valid UUID'),
})