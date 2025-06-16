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

console.log(`🚀 Server running at http://localhost:${server.port}`);