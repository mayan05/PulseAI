import express from "express";
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

app.get("/", (req, res) => {
    res.send("T3 chat backend is running!");
});

//@ts-ignore
app.post("/api/chat", (req, res) => {
    const { messages, model } = req.body;

  return res.json({
    response: {
      role: "assistant",
      content: `This is a mock response for model "${model || "none"}".`,
    },
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});