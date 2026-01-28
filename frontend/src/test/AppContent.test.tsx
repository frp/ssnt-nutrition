// Copyright 2026 Roman F
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import {
  describe,
  it,
  expect,
  mock,
  beforeEach,
  afterEach,
  setSystemTime,
} from "bun:test";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AppContent from "../components/AppContent";
import { formatDate, renderWithClient } from "./utils";

describe("AppContent", () => {
  const mockData = {
    protein: 3,
    carbs: 2,
    vegetables: 4,
    fats: 1,
  };

  beforeEach(() => {
    mock.clearAllMocks();
    setSystemTime(new Date("2024-01-15T12:00:00Z"));

    const mockFetch = mock(() =>
      Promise.resolve({
        json: () => Promise.resolve(mockData),
      } as Response),
    );
    globalThis.fetch = mockFetch as unknown as typeof fetch;
  });

  afterEach(() => {
    mock.restore();
  });

  it("toggles between Portions and Goals view", async () => {
    const user = userEvent.setup();
    renderWithClient(<AppContent />);

    expect(
      screen.getByRole("button", { name: "Edit Goals ⚙" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Edit Goals ⚙" }));
    expect(
      screen.getByRole("button", { name: "← Back to Recording" }),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "← Back to Recording" }),
    );
    expect(
      screen.getByRole("button", { name: "Edit Goals ⚙" }),
    ).toBeInTheDocument();
  });

  it("resets date to current date when switching between Portions and Goals views", async () => {
    const user = userEvent.setup();
    renderWithClient(<AppContent />);

    await waitFor(() => {
      expect(screen.getByText(formatDate("2024-01-15"))).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: ">" }));

    await waitFor(() => {
      expect(screen.getByText(formatDate("2024-01-16"))).toBeInTheDocument();
    });

    // Switch to Goals view
    await user.click(screen.getByRole("button", { name: "Edit Goals ⚙" }));

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "← Back to Recording" }),
      ).toBeInTheDocument();
    });

    // Date picker should not be visible in Goals view
    expect(
      screen.queryByText(formatDate("2024-01-15")),
    ).not.toBeInTheDocument();

    // Switch back to Portions view
    await user.click(
      screen.getByRole("button", { name: "← Back to Recording" }),
    );

    // Date should reset to current date (2024-01-15)
    await waitFor(() => {
      expect(screen.getByText(formatDate("2024-01-15"))).toBeInTheDocument();
    });

    const proteinSection = screen
      .getByText(/protein/i)
      .closest(".nutrient-row");
    const filledDots = proteinSection?.querySelectorAll(
      ".dot.filled:not(.excess)",
    );
    expect(filledDots).toHaveLength(3);
  });
});
