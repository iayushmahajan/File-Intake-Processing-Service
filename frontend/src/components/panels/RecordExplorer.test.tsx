import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { RecordExplorer } from "./RecordExplorer";
import type { JobDetail } from "../../types/jobs";
const job: Pick<JobDetail, "id" | "error_breakdown"> = {
  id: 1,
  error_breakdown: { Email: 1 },
};
const record = {
  row_number: 3,
  status: "rejected",
  values: { customer_id: "C2", email: "bad" },
  normalized: {},
  issues: [
    { fields: ["email"], category: "Email", message: "email must be valid" },
  ],
};
afterEach(() => vi.unstubAllGlobals());
it("requires validation again after editing and supports undo", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation(async (url: string) => ({
      ok: true,
      json: async () =>
        url.includes("/validate")
          ? {
              valid: true,
              rows: [{ row_number: 3, issues: [] }],
              message: "Field checks only",
            }
          : {
              records: [record],
              total: 1,
              page: 1,
              page_size: 25,
              fields: ["email"],
            },
    })),
  );
  render(<RecordExplorer job={job} />);
  fireEvent.click(
    await screen.findByRole("button", { name: "Correct record 3" }),
  );
  const input = screen.getByLabelText("Record 3 email");
  fireEvent.change(input, { target: { value: "bob@example.com" } });
  expect(
    screen.getByRole("button", { name: "Reprocess corrected dataset" }),
  ).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Validate corrections" }));
  await screen.findByText("Field validation passed.");
  expect(
    screen.getByRole("button", { name: "Reprocess corrected dataset" }),
  ).toBeEnabled();
  fireEvent.change(input, { target: { value: "changed@example.com" } });
  expect(
    screen.getByRole("button", { name: "Reprocess corrected dataset" }),
  ).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Undo this record" }));
  expect(input).toHaveValue("bad");
  expect(
    screen.queryByRole("button", { name: "Reprocess corrected dataset" }),
  ).not.toBeInTheDocument();
});
it("uses identical filters for record search and CSV export", async () => {
  const fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      records: [],
      total: 0,
      page: 1,
      page_size: 25,
      fields: [],
    }),
  });
  vi.stubGlobal("fetch", fetch);
  render(<RecordExplorer job={job} />);
  fireEvent.change(screen.getByLabelText("Search all records"), {
    target: { value: "bob@example.com" },
  });
  fireEvent.change(screen.getByLabelText("Record status"), {
    target: { value: "rejected" },
  });
  fireEvent.change(screen.getByLabelText("Error category"), {
    target: { value: "Email" },
  });
  await waitFor(() => expect(fetch).toHaveBeenCalled());
  const requested = String(fetch.mock.calls.at(-1)?.[0]);
  const link = screen
    .getByRole("link", { name: "Export filtered CSV" })
    .getAttribute("href")!;
  expect(new URL(link).search).toBe(new URL(requested).search);
  expect(new URL(link).searchParams.get("search")).toBe("bob@example.com");
});
