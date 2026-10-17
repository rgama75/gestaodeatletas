import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  signUp: vi.fn(),
  error: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: unknown) => ({ options, useSearch: () => ({}) }),
  useNavigate: () => mocks.navigate,
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: {
    getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    signUp: mocks.signUp,
  } },
}));
vi.mock("@/integrations/lovable/index", () => ({ lovable: { auth: { signInWithOAuth: vi.fn() } } }));
vi.mock("sonner", () => ({ toast: { error: mocks.error, success: vi.fn() } }));

import { AuthPage } from "@/routes/auth";

async function submitSignup() {
  render(<AuthPage />);
  fireEvent.click(screen.getByRole("button", { name: "Criar conta" }));
  fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "scout@example.com" } });
  fireEvent.change(screen.getByLabelText("Senha"), { target: { value: "Example-password-2026" } });
  fireEvent.click(screen.getByRole("button", { name: "Criar conta" }));
  await waitFor(() => expect(mocks.signUp).toHaveBeenCalledOnce());
}

describe("Email signup", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(cleanup);

  it("enters /atletas immediately when signup returns an authenticated session, without a verification redirect", async () => {
    mocks.signUp.mockResolvedValue({ data: { session: { user: { id: "new-scout" } } }, error: null });
    await submitSignup();
    await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith({ to: "/atletas", replace: true }));
    expect(mocks.signUp).toHaveBeenCalledWith({
      email: "scout@example.com", password: "Example-password-2026",
      options: { data: { display_name: "" } },
    });
  });

  it("does not treat a signup without a session as authenticated", async () => {
    mocks.signUp.mockResolvedValue({ data: { session: null }, error: null });
    await submitSignup();
    await waitFor(() => expect(mocks.error).toHaveBeenCalledOnce());
    expect(mocks.navigate).not.toHaveBeenCalled();
  });
});