import { toast } from "react-toastify";
import type { ProcessResponse } from "./types";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export async function processMedia(input: {
  url?: string;
  file?: File;
  title?: string;
}): Promise<ProcessResponse> {
  const form = new FormData();
  if (input.url) form.append("url", input.url);
  if (input.file) form.append("file", input.file);
  if (input.title) form.append("title", input.title);

  const res = await fetch(`${API}/api/v1/process`, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    const msg = await res.text();
    toast.error(`Processing failed: ${msg.slice(0, 180)}`);
    throw new Error(msg);
  }
  return res.json();
}

export async function askQuestion(
  sessionId: string,
  question: string,
): Promise<string> {
  const res = await fetch(`${API}/api/v1/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sessionId, question }),
  });

  if (!res.ok) {
    const msg = await res.text();
    toast.error(`Failed: ${msg.slice(0, 180)}`);
    throw new Error(msg);
  }
  const data = await res.json();
  return data.answer as string;
}