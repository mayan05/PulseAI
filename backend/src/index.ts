import { PrismaClient } from "../src/generated/prisma";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";

const prisma = new PrismaClient();

// JWT configuration
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "your-secret-key"
);

// Helper function to generate JWT token
async function generateToken(payload: { userId: string; email: string }) {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(JWT_SECRET);
  return token;
}

// Helper function to verify JWT token
async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload;
  } catch (error) {
    return null;
  }
}

// Type for request body
interface SignupBody {
  email: string;
  password: string;
  name: string;
}

interface LoginBody {
  email: string;
  password: string;
}

// Chat interfaces
interface CreateConversationBody {
  title: string;
}

interface CreateMessageBody {
  content: string;
  type: "TEXT" | "IMAGE" | "FILE";
  model: string;
  conversationId: string;
  attachments?: {
    id: string;
    name: string;
    type: string;
    size: number;
    url: string;
  }[];
}

interface AIResponse {
  text: string;
  model: string;
  timestamp: string;
}

const server = Bun.serve({
  port: 3000,
  async fetch(req) {
    const url = new URL(req.url);

    // CORS headers
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };

    // Handle CORS preflight
    if (req.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    // Add CORS headers to all responses
    const headers = {
      "Content-Type": "application/json",
      ...corsHeaders,
    };

    try {
      // Signup endpoint
      if (url.pathname === "/signup" && req.method === "POST") {
        console.log("Received signup request");
        const body = await req.json() as SignupBody;
        const { email, password, name } = body;
        console.log("Signup attempt for:", { email, name });

        // Check if user exists
        const existingUser = await prisma.user.findUnique({
          where: { email },
        });

        if (existingUser) {
          console.log("User already exists:", email);
          return new Response(
            JSON.stringify({ error: "User already exists" }),
            { status: 400, headers }
          );
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const user = await prisma.user.create({
          data: {
            email,
            password: hashedPassword,
            name,
          },
        });
        console.log("User created successfully:", user.id);

        // Generate token
        const token = await generateToken({
          userId: user.id,
          email: user.email,
        });

        return new Response(
          JSON.stringify({
            message: "User created successfully",
            token,
            user: {
              id: user.id,
              email: user.email,
              name: user.name,
            },
          }),
          { status: 201, headers }
        );
      }

      // Login endpoint
      if (url.pathname === "/login" && req.method === "POST") {
        const body = await req.json() as LoginBody;
        const { email, password } = body;

        // Find user
        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user) {
          return new Response(
            JSON.stringify({ error: "Invalid credentials" }),
            { status: 401, headers }
          );
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password);

        if (!isValidPassword) {
          return new Response(
            JSON.stringify({ error: "Invalid credentials" }),
            { status: 401, headers }
          );
        }

        // Generate token
        const token = await generateToken({
          userId: user.id,
          email: user.email,
        });

        return new Response(
          JSON.stringify({
            message: "Login successful",
            token,
            user: {
              id: user.id,
              email: user.email,
              name: user.name,
            },
          }),
          { headers }
        );
      }

      // --- Authenticated User Endpoints ---
      // Helper: get user from JWT
      async function getUserFromRequest(req: Request) {
        const auth = req.headers.get("authorization");
        if (!auth || !auth.startsWith("Bearer ")) return null;
        const token = auth.replace("Bearer ", "");
        const payload = await verifyToken(token);
        if (!payload || typeof payload.userId !== "string") return null;
        const user = await prisma.user.findUnique({ where: { id: payload.userId } });
        return user;
      }

      // GET /me - get current user info
      if (url.pathname === "/me" && req.method === "GET") {
        const user = await getUserFromRequest(req);
        if (!user) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers });
        }
        return new Response(
          JSON.stringify({
            id: user.id,
            email: user.email,
            name: user.name,
            profilePic: user.profilePic ?? null,
          }),
          { headers }
        );
      }

      // PUT /me - update name or profilePic
      if (url.pathname === "/me" && req.method === "PUT") {
        const user = await getUserFromRequest(req);
        if (!user) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers });
        }
        const body = await req.json() as { name?: string; profilePic?: string };
        const { name, profilePic } = body;
        const updated = await prisma.user.update({
          where: { id: user.id },
          data: {
            ...(name ? { name } : {}),
            ...(profilePic !== undefined ? { profilePic } : {}),
          },
        });
        return new Response(
          JSON.stringify({
            id: updated.id,
            email: updated.email,
            name: updated.name,
            profilePic: updated.profilePic ?? null,
          }),
          { headers }
        );
      }

      // PUT /me/password - change password
      if (url.pathname === "/me/password" && req.method === "PUT") {
        const user = await getUserFromRequest(req);
        if (!user) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers });
        }
        const body = await req.json() as { currentPassword: string; newPassword: string };
        const { currentPassword, newPassword } = body;
        if (!currentPassword || !newPassword) {
          return new Response(JSON.stringify({ error: "Missing fields" }), { status: 400, headers });
        }
        const isValid = await bcrypt.compare(currentPassword, user.password);
        if (!isValid) {
          return new Response(JSON.stringify({ error: "Current password is incorrect" }), { status: 400, headers });
        }
        const hashed = await bcrypt.hash(newPassword, 10);
        await prisma.user.update({ where: { id: user.id }, data: { password: hashed } });
        return new Response(JSON.stringify({ message: "Password updated" }), { headers });
      }

      // POST /generate - handle LLM generation requests
      if (url.pathname === "/generate" && req.method === "POST") {
        const user = await getUserFromRequest(req);
        if (!user) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers });
        }

        const body = await req.json() as { 
          prompt: string;
          model: "gpt" | "claude" | "llama";
          temperature?: number;
        };

        const { prompt, model, temperature = 0.7 } = body;

        if (!prompt || !model) {
          return new Response(
            JSON.stringify({ error: "Missing required fields" }),
            { status: 400, headers }
          );
        }

        try {
          // Call the FastAPI LLM service
          const llmResponse = await fetch(`http://localhost:8000/${model}/generate`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              prompt,
              temperature,
            }),
          });

          if (!llmResponse.ok) {
            throw new Error(`LLM service error: ${llmResponse.statusText}`);
          }

          const response = await llmResponse.json();

          return new Response(JSON.stringify(response), { headers });
        } catch (error) {
          console.error("LLM generation error:", error);
          return new Response(
            JSON.stringify({ error: "Failed to generate response" }),
            { status: 500, headers }
          );
        }
      }

      // Proxy endpoint for Claude microservice
      if (url.pathname === "/claude/generate" && req.method === "POST") {
        const user = await getUserFromRequest(req);
        if (!user) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers });
        }

        const response = await fetch("http://localhost:8000/claude/generate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(await req.json()),
        });

        const data = await response.json();
        return new Response(JSON.stringify(data), { headers });
      }

      // Proxy endpoint for Llama microservice
      if (url.pathname === "/llama/generate" && req.method === "POST") {
        const user = await getUserFromRequest(req);
        if (!user) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers });
        }

        const response = await fetch("http://localhost:8000/llama/generate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(await req.json()),
        });

        const data = await response.json();
        return new Response(JSON.stringify(data), { headers });
      }

      // Chat endpoints
      // POST /conversations - create new conversation
      if (url.pathname === "/conversations" && req.method === "POST") {
        const user = await getUserFromRequest(req);
        if (!user) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers });
        }

        const body = await req.json() as CreateConversationBody;
        const { title } = body;

        const conversation = await prisma.conversation.create({
          data: {
            title: title || 'New Chat',
            userId: user.id,
          },
        });

        return new Response(JSON.stringify(conversation), { headers });
      }

      // GET /conversations - get all conversations
      if (url.pathname === "/conversations" && req.method === "GET") {
        const user = await getUserFromRequest(req);
        if (!user) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers });
        }

        const conversations = await prisma.conversation.findMany({
          where: {
            userId: user.id,
          },
          include: {
            messages: true,
          },
          orderBy: {
            updatedAt: 'desc',
          },
        });

        return new Response(JSON.stringify(conversations), { headers });
      }

      // GET /conversations/:id - get a specific conversation
      if (url.pathname.match(/^\/conversations\/[^/]+$/) && req.method === "GET") {
        const user = await getUserFromRequest(req);
        if (!user) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers });
        }

        const id = url.pathname.split("/")[2];
        const conversation = await prisma.conversation.findUnique({
          where: {
            id,
            userId: user.id,
          },
          include: {
            messages: {
              orderBy: {
                createdAt: "asc",
              },
            },
          },
        });

        if (!conversation) {
          return new Response(JSON.stringify({ error: "Conversation not found" }), { status: 404, headers });
        }

        return new Response(JSON.stringify(conversation), { headers });
      }

      // POST /messages - create new message
      if (url.pathname === "/messages" && req.method === "POST") {
        const user = await getUserFromRequest(req);
        if (!user) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers });
        }

        const body = await req.json() as CreateMessageBody;
        const { content, type, model, conversationId, attachments } = body;

        // Log the incoming body for debugging
        console.log("Incoming message body:", body);

        // Validate required fields
        if (!content || !type || !model || !conversationId) {
          return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400, headers });
        }

        // Verify the conversation belongs to the user
        const conversation = await prisma.conversation.findFirst({
          where: {
            id: conversationId,
            userId: user.id,
          },
        });

        if (!conversation) {
          return new Response(JSON.stringify({ error: "Conversation not found" }), { status: 404, headers });
        }

        // Create user message
        const userMessage = await prisma.message.create({
          data: {
            type,
            model,
            conversationId,
            content,
            role: 'USER',
            attachments: attachments ? JSON.stringify(attachments) : null,
          }
        });

        // Get AI response
        let aiResponse;
        if (model === 'gpt' && attachments && Array.isArray(attachments) && attachments.length > 0 && attachments[0]?.type === 'application/pdf') {
          // If it's a PDF, forward as FormData to /gpt/generate-form
          const formData = new FormData();
          formData.append('prompt', content);
          formData.append('temperature', '0.7');
          aiResponse = await fetch('http://localhost:8000/gpt/generate-form', {
            method: 'POST',
            body: formData,
          }).then(res => res.json());
        } else if (model === 'claude') {
          // For Claude, always use FormData (supports file or just prompt)
          const formData = new FormData();
          formData.append('prompt', content);
          formData.append('temperature', '0.7');
          if (attachments && Array.isArray(attachments) && attachments.length > 0) {
            const fileAtt = attachments[0];
            if (fileAtt && fileAtt.url && typeof fileAtt.url === 'string' && !fileAtt.url.startsWith('blob:')) {
              const fileRes = await fetch(fileAtt.url);
              const fileBlob = typeof Blob !== 'undefined' ? await fileRes.blob() : null;
              if (fileBlob && typeof Blob !== 'undefined' && fileBlob instanceof Blob) {
                formData.append('file', fileBlob, fileAtt.name);
              }
            }
          }
          aiResponse = await fetch('http://localhost:8000/claude/generate', {
            method: 'POST',
            body: formData,
          }).then(res => res.json());
        } else {
          aiResponse = await fetch(`http://localhost:8000/${model}/generate`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              prompt: content,
              temperature: 0.7,
            }),
          }).then(res => res.json());
        }

        console.log('LLM Service Response:', aiResponse);

        if (!aiResponse || typeof aiResponse.text !== 'string') {
          console.error('Invalid AI response:', aiResponse);
          throw new Error('Invalid AI response');
        }

        // Create AI message
        const aiMessage = await prisma.message.create({
          data: {
            content: typeof aiResponse.text === 'string' ? aiResponse.text : '',
            type: 'TEXT',
            model,
            role: 'ASSISTANT',
            conversationId,
          },
        });

        console.log('Created AI message:', aiMessage);

        // Ensure both messages have the required fields
        const response = {
          userMessage: {
            ...userMessage,
            createdAt: userMessage.createdAt,
            timestamp: userMessage.createdAt,
            attachments: userMessage.attachments ? JSON.parse(userMessage.attachments) : undefined,
          },
          aiMessage: {
            ...aiMessage,
            createdAt: aiMessage.createdAt,
            timestamp: aiMessage.createdAt,
            content: typeof aiResponse.text === 'string' ? aiResponse.text : '',
          },
        };

        console.log('Sending response:', response);
        return new Response(JSON.stringify(response), { 
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          }
        });
      }

      // DELETE /conversations/:id - delete conversation
      if (url.pathname.match(/^\/conversations\/[^/]+$/) && req.method === "DELETE") {
        const user = await getUserFromRequest(req);
        if (!user) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers });
        }

        const id = url.pathname.split('/')[2];

        // Verify the conversation belongs to the user
        const conversation = await prisma.conversation.findFirst({
          where: {
            id,
            userId: user.id,
          },
        });

        if (!conversation) {
          return new Response(JSON.stringify({ error: "Conversation not found" }), { status: 404, headers });
        }

        // Delete all messages in the conversation
        await prisma.message.deleteMany({
          where: { conversationId: id },
        });

        // Delete the conversation
        await prisma.conversation.delete({
          where: { id },
        });

        return new Response(JSON.stringify({ success: true }), { headers });
      }

      // Handle unknown routes
      return new Response(
        JSON.stringify({ error: "Not found" }),
        { status: 404, headers }
      );
    } catch (error) {
      console.error("Server error:", error);
      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        { status: 500, headers }
      );
    }
  },
});

console.log(`Server running at http://localhost:${server.port}`);