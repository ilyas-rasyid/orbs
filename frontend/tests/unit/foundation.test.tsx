import { render, screen } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { FoundationPage } from "../../src/shared/components/FoundationPage";
import { createQueryClient } from "../../src/app/query/query-client";

describe("M0 foundation page", () => {
  it("communicates its real milestone status without fake booking features", () => {
    render(
      <QueryClientProvider client={createQueryClient()}>
        <FoundationPage />
      </QueryClientProvider>,
    );
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("clear foundation");
    expect(screen.getByRole("heading", { name: "Backend readiness" })).toBeInTheDocument();
    expect(screen.queryByText(/total bookings/i)).not.toBeInTheDocument();
  });
});
