import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { UploadPanel } from "./UploadPanel";
import { FIELDS } from "../../types/imports";
afterEach(() => vi.unstubAllGlobals());
it("invalidates a successful preview when a mapping changes", async () => {
  const preview = {
    headers: [...FIELDS, "Customer Email"],
    required_fields: FIELDS,
    suggested_mapping: Object.fromEntries(FIELDS.map((f) => [f, f])),
    rows: [],
    sample_limit: 10,
  };
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockImplementation(async (url: string) => ({
        ok: true,
        json: async () => (url.includes("/templates") ? [] : preview),
      })),
  );
  render(<UploadPanel onUploadComplete={vi.fn()} />);
  fireEvent.change(screen.getByLabelText("CSV file"), {
    target: {
      files: [new File(["email\nhello"], "sample.csv", { type: "text/csv" })],
    },
  });
  await screen.findByLabelText("Map email");
  expect(
    screen.getByRole("button", { name: "Upload and Analyze CSV" }),
  ).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Preview validation" }));
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Upload and Analyze CSV" }),
    ).toBeEnabled(),
  );
  fireEvent.change(screen.getByLabelText("Map email"), {
    target: { value: "Customer Email" },
  });
  expect(
    screen.getByRole("button", { name: "Upload and Analyze CSV" }),
  ).toBeDisabled();
  expect(screen.queryByText(/Preview · first/)).not.toBeInTheDocument();
});
