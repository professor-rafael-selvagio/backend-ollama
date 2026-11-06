import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../src/app";

describe("Endpoint GET /health", () => {
  it("deve retornar status 200 com status 'ok' e service 'ollama-backend'", async () => {
    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: "ok",
      service: "ollama-backend",
    });
  });

  it("não deve vazar variáveis de ambiente ou informações sensíveis", async () => {
    const response = await request(app).get("/health");

    expect(response.body).not.toHaveProperty("env");
    expect(response.body).not.toHaveProperty("config");
    expect(response.body).not.toHaveProperty("apiKey");
    expect(response.body).not.toHaveProperty("tokens");
    expect(response.body).not.toHaveProperty("stack");
  });
});

