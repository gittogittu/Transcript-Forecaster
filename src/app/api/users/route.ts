import { NextRequest, NextResponse } from "next/server"
import { adminOnly } from "@/lib/middleware/auth"
import { getAllUsers, createUser } from "@/lib/database/users"
import { z } from "zod"

const CreateUserSchema = z.object({
  email: z.string().email("Invalid email format"),
  name: z.string().min(1, "Name is required").max(255),
  role: z.enum(['admin', 'analyst', 'viewer']).default('viewer'),
  image: z.string().optional()
})

async function handleGET(request: NextRequest) {
  try {
    const users = await getAllUsers()
    return NextResponse.json({ users })
  } catch (error) {
    console.error("Error fetching users:", error)
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    )
  }
}

async function handlePOST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = CreateUserSchema.parse(body)
    
    const user = await createUser(validatedData)
    
    return NextResponse.json({ user }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      )
    }
    
    console.error("Error creating user:", error)
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 }
    )
  }
}

export const GET = adminOnly(handleGET)
export const POST = adminOnly(handlePOST)