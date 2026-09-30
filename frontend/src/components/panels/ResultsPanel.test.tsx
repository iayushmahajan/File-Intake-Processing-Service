import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { ResultsPanel } from "./ResultsPanel";
afterEach(() => vi.unstubAllGlobals());
it("shows a useful empty state", () => {
  render(<ResultsPanel jobId={null} />);
  expect(screen.getByText(/Your next dataset/)).toBeInTheDocument();
});
it("shows state-based processing without fabricated percentages", () => {
  render(<ResultsPanel jobId={null} isLoading />);
  expect(screen.getByRole("status")).toHaveTextContent(
    "Uploading and processing",
  );
});
it("loads a historical failed job and disables AI", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue({
        ok: true,
        json: async () => ({
          id: 4,
          status: "failed",
          filename_original: "broken.csv",
          created_at: "2026-04-01T12:00:00",
          error_message: "Missing required columns",
          total_rows: 0,
          valid_rows: 0,
          invalid_rows: 0,
          file_size: 10,
          duration_ms: 4,
          analysis: null,
          error_breakdown: {},
          ai_report: null,
        }),
      }),
  );
  render(<ResultsPanel jobId={4} />);
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Missing required columns",
  );
  expect(
    screen.getByRole("button", { name: "Generate insights" }),
  ).toBeDisabled();
});
it("offers retry on API failure", async () => {
  const fetchMock = vi.fn().mockRejectedValue(new Error("Network unavailable"));
  vi.stubGlobal("fetch", fetchMock);
  render(<ResultsPanel jobId={4} />);
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Network unavailable",
  );
  fireEvent.click(screen.getByRole("button", { name: "Retry" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Network unavailable",
  );
  expect(fetchMock).toHaveBeenCalledTimes(2);
});
